import { CUSTOM_TOOL_SCHEMAS, DESTRUCTIVE_TOOLS, executeTool, ToolResult } from './tools';

const ENDPOINT = 'https://api.x.ai/v1/responses';

export type AttachmentInput =
  | { kind: 'image'; name: string; dataUrl: string; mime: string }
  | { kind: 'text'; name: string; content: string };

export type TurnOpts = {
  effort: 'low' | 'medium' | 'high';
  webSearch: boolean;
  codeInterp: boolean;
  xSearch: boolean;
};

export type AgentEvent =
  | { kind: 'text_delta'; delta: string }
  | { kind: 'tool_call'; callId: string; name: string; toolKind: 'custom' | 'web_search' | 'code_interpreter' | 'x_search'; argsPreview: string; needsApproval: boolean }
  | { kind: 'tool_result'; callId: string; status: string; output?: string }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

export type AgentHandle = {
  apiKey: string;
  model: string;
  instructions: string;
  workspaceRoot: string;
  lastResponseId?: string;
  /** Pending input items to send on the next request (tool outputs from prior iteration). */
  pendingInput: any[];
  /** Called to gate a destructive tool call. Returns true to approve. */
  requestApproval: (callId: string, name: string, args: any) => Promise<boolean>;
  /** Called for each agent event (text, tool calls, etc.) */
  emit: (e: AgentEvent) => void;
};

function buildToolsArray(opts: TurnOpts) {
  const tools: any[] = [...CUSTOM_TOOL_SCHEMAS];
  if (opts.webSearch) tools.unshift({ type: 'web_search' });
  if (opts.codeInterp) tools.unshift({ type: 'code_interpreter' });
  if (opts.xSearch) tools.unshift({ type: 'x_search' });
  return tools;
}

function buildUserContent(text: string, attachments: AttachmentInput[]) {
  const parts: any[] = [];
  const textParts: string[] = [];
  for (const a of attachments) {
    if (a.kind === 'image') {
      parts.push({ type: 'input_image', image_url: a.dataUrl, detail: 'high' });
    } else {
      const clipped = a.content.slice(0, 200_000);
      textParts.push(`<<ATTACHMENT: ${a.name}>>\n${clipped}\n<</ATTACHMENT>>`);
    }
  }
  if (text || textParts.length) {
    parts.push({ type: 'input_text', text: [text, ...textParts].filter(Boolean).join('\n\n') });
  }
  return parts.length === 1 && parts[0].type === 'input_text' ? parts[0].text : parts;
}

/** Run one user turn to completion, looping through client-side tool calls as needed. */
export async function runTurn(
  h: AgentHandle,
  userText: string,
  attachments: AttachmentInput[],
  opts: TurnOpts,
): Promise<void> {
  const firstUserContent = buildUserContent(userText, attachments);
  h.pendingInput = [{ role: 'user', content: firstUserContent }];

  let safety = 0;
  while (safety++ < 12) {
    const body: any = {
      model: h.model,
      instructions: h.instructions,
      input: h.pendingInput,
      tools: buildToolsArray(opts),
      reasoning: { effort: opts.effort },
      stream: true,
    };
    if (h.lastResponseId) body.previous_response_id = h.lastResponseId;

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${h.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => '');
      h.emit({ kind: 'error', message: `xAI API ${res.status}: ${errText.slice(0, 500)}` });
      return;
    }

    const { toolCalls, responseId } = await consumeStream(res.body, h);
    if (responseId) h.lastResponseId = responseId;

    if (toolCalls.length === 0) {
      h.emit({ kind: 'done' });
      return;
    }

    // Execute client-side tool calls and build next input
    const nextInput: any[] = [];
    for (const tc of toolCalls) {
      let args: any = {};
      try { args = JSON.parse(tc.arguments || '{}'); } catch {}
      const argsPreview = Object.entries(args).map(([k, v]) =>
        `${k}=${typeof v === 'string' ? (v.length > 40 ? v.slice(0, 40) + '…' : v) : JSON.stringify(v)}`,
      ).join(' ');

      const needsApproval = DESTRUCTIVE_TOOLS.has(tc.name);
      h.emit({
        kind: 'tool_call',
        callId: tc.call_id,
        name: tc.name,
        toolKind: 'custom',
        argsPreview,
        needsApproval,
      });

      let result: ToolResult;
      if (needsApproval) {
        const approved = await h.requestApproval(tc.call_id, tc.name, args);
        if (!approved) {
          result = { ok: false, error: 'user denied approval' };
          h.emit({ kind: 'tool_result', callId: tc.call_id, status: 'denied', output: 'user denied' });
        } else {
          result = await executeTool(tc.name, args, h.workspaceRoot);
          h.emit({
            kind: 'tool_result',
            callId: tc.call_id,
            status: result.ok ? 'ok' : 'error',
            output: result.ok ? result.output : result.error,
          });
        }
      } else {
        result = await executeTool(tc.name, args, h.workspaceRoot);
        h.emit({
          kind: 'tool_result',
          callId: tc.call_id,
          status: result.ok ? 'ok' : 'error',
          output: result.ok ? result.output : result.error,
        });
      }

      nextInput.push({
        type: 'function_call_output',
        call_id: tc.call_id,
        output: result.ok ? result.output : `ERROR: ${result.error}`,
      });
    }

    h.pendingInput = nextInput;
  }

  h.emit({ kind: 'error', message: 'agent loop exceeded 12 iterations' });
}

type ParsedToolCall = { call_id: string; name: string; arguments: string };

async function consumeStream(
  body: ReadableStream<Uint8Array>,
  h: AgentHandle,
): Promise<{ toolCalls: ParsedToolCall[]; responseId?: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const toolCallsByItemId = new Map<string, ParsedToolCall>();
  const toolCallsOrder: string[] = [];
  let responseId: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

    // SSE events are separated by \n\n (we normalized CRLF above)
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLines = raw.split('\n').filter(l => l.startsWith('data:'));
      if (dataLines.length === 0) continue;
      const payload = dataLines.map(l => l.slice(5).trimStart()).join('\n');
      if (payload === '[DONE]') continue;

      let ev: any;
      try { ev = JSON.parse(payload); } catch { continue; }
      const type: string = ev.type ?? '';

      // Text deltas
      if (type === 'response.output_text.delta' && typeof ev.delta === 'string') {
        h.emit({ kind: 'text_delta', delta: ev.delta });
        continue;
      }

      // Function call (custom tool) appearing
      if (type === 'response.output_item.added' && ev.item?.type === 'function_call') {
        const itemId: string = ev.item.id;
        toolCallsByItemId.set(itemId, {
          call_id: ev.item.call_id,
          name: ev.item.name,
          arguments: ev.item.arguments ?? '',
        });
        toolCallsOrder.push(itemId);
        continue;
      }

      // Function call arguments streaming
      if (type === 'response.function_call_arguments.delta' && ev.item_id) {
        const tc = toolCallsByItemId.get(ev.item_id);
        if (tc && typeof ev.delta === 'string') tc.arguments += ev.delta;
        continue;
      }

      if (type === 'response.function_call_arguments.done' && ev.item_id) {
        const tc = toolCallsByItemId.get(ev.item_id);
        if (tc && typeof ev.arguments === 'string') tc.arguments = ev.arguments;
        continue;
      }

      // Server-side tools (web_search, code_interpreter, x_search): xAI already ran them,
      // so we just surface a badge. The final output_text will incorporate the result.
      if (type === 'response.output_item.added' && ev.item?.type && ev.item.type !== 'function_call' && ev.item.type !== 'message' && ev.item.type !== 'reasoning') {
        const kind = ev.item.type;
        const mapped: 'web_search' | 'code_interpreter' | 'x_search' | 'custom' =
          kind === 'web_search_call' || kind === 'web_search' ? 'web_search' :
          kind === 'code_interpreter_call' || kind === 'code_interpreter' ? 'code_interpreter' :
          kind === 'x_search_call' || kind === 'x_search' ? 'x_search' : 'custom';
        h.emit({
          kind: 'tool_call',
          callId: ev.item.id ?? `srv-${Date.now()}`,
          name: kind,
          toolKind: mapped,
          argsPreview: '',
          needsApproval: false,
        });
        continue;
      }

      if (type === 'response.completed' || type === 'response.done') {
        responseId = ev.response?.id ?? responseId;
        continue;
      }

      if (type === 'response.created') {
        responseId = ev.response?.id ?? responseId;
        continue;
      }

      if (type === 'error' || type === 'response.failed') {
        const msg = ev.error?.message ?? ev.message ?? 'stream error';
        h.emit({ kind: 'error', message: msg });
      }
    }
  }

  const toolCalls = toolCallsOrder
    .map(id => toolCallsByItemId.get(id))
    .filter((t): t is ParsedToolCall => !!t);
  return { toolCalls, responseId };
}
