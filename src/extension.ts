import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { getWebviewContent, makeNonce } from './webview';
import { runTurn, AgentHandle, AttachmentInput, TurnOpts } from './xaiClient';
import { ApprovalRegistry } from './approval';

const DEFAULT_INSTRUCTIONS =
  'You are Grok, the coding agent inside Coding Intelligence x XolvedAI (VS Code extension). ' +
  'You have client-side tools for file I/O, patching, searching, and running terminal commands in the user\'s workspace. ' +
  'Destructive tools (write_file, create_directory, apply_patch, run_terminal) prompt the user for approval. ' +
  'Prefer apply_patch over write_file when editing existing files. Use search_files before reading whole files. ' +
  'You also have server-side tools (web_search, code_interpreter, x_search) when enabled by the user. ' +
  'Keep replies focused; show code changes as concise diffs or tool calls rather than long prose.';

function getApiKey(workspaceRoot: string): string {
  let key = process.env.XAI_API_KEY;
  if (!key && workspaceRoot) {
    const envPath = path.join(workspaceRoot, '.env.local');
    if (fs.existsSync(envPath)) {
      key = dotenv.parse(fs.readFileSync(envPath)).XAI_API_KEY;
    }
  }
  if (!key) {
    throw new Error('XAI_API_KEY not found. Set as env var or in a workspace .env.local file (see .env.example).');
  }
  return key;
}

function loadInstructions(workspaceRoot: string): string {
  const memoryPath = path.join(workspaceRoot, 'XolvedAI-Coding.md');
  if (workspaceRoot && fs.existsSync(memoryPath)) {
    return DEFAULT_INSTRUCTIONS + '\n\n# Project memory\n' + fs.readFileSync(memoryPath, 'utf8');
  }
  return DEFAULT_INSTRUCTIONS;
}

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('XolvedAI');
  context.subscriptions.push(output);
  output.appendLine('Coding Intelligence x XolvedAI v1.15.0 activated');

  const startChat = vscode.commands.registerCommand('coding-intelligence-x-xolvedai.startChat', () => {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

    const panel = vscode.window.createWebviewPanel(
      'codingIntelligenceChatView',
      'XolvedAI',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    const nonce = makeNonce();
    panel.webview.html = getWebviewContent(panel.webview.cspSource, nonce);

    const approvals = new ApprovalRegistry();

    let handle: AgentHandle | null = null;
    let busy = false;

    panel.onDidDispose(() => approvals.clear());

    panel.webview.onDidReceiveMessage(async (msg: any) => {
      if (msg.command === 'approval') {
        approvals.resolve(msg.callId, !!msg.approved);
        return;
      }

      if (msg.command !== 'sendMessage') return;
      if (busy) return;
      busy = true;

      try {
        const apiKey = getApiKey(workspaceRoot);
        const instructions = loadInstructions(workspaceRoot);

        if (!handle) {
          handle = {
            apiKey,
            model: 'grok-4.20-reasoning',
            instructions,
            workspaceRoot,
            pendingInput: [],
            requestApproval: (callId) => approvals.request(callId),
            emit: (e) => {
              switch (e.kind) {
                case 'text_delta':
                  panel.webview.postMessage({ command: 'textDelta', delta: e.delta });
                  break;
                case 'tool_call':
                  panel.webview.postMessage({
                    command: 'toolCall',
                    callId: e.callId,
                    kind: e.toolKind,
                    name: e.name,
                    args: e.argsPreview,
                    needsApproval: e.needsApproval,
                  });
                  break;
                case 'tool_result':
                  panel.webview.postMessage({
                    command: 'toolUpdate',
                    callId: e.callId,
                    status: e.status,
                    output: e.output,
                  });
                  break;
                case 'done':
                  panel.webview.postMessage({ command: 'assistantDone' });
                  break;
                case 'error':
                  output.appendLine(`error: ${e.message}`);
                  panel.webview.postMessage({ command: 'error', text: e.message });
                  break;
              }
            },
          };
        }

        const opts: TurnOpts = {
          effort: msg.opts?.effort ?? 'medium',
          webSearch: !!msg.opts?.webSearch,
          codeInterp: !!msg.opts?.codeInterp,
          xSearch: !!msg.opts?.xSearch,
        };
        const attachments: AttachmentInput[] = Array.isArray(msg.attachments) ? msg.attachments : [];

        await runTurn(handle, msg.text ?? '', attachments, opts);
      } catch (err: any) {
        output.appendLine(`fatal: ${err.stack ?? err.message}`);
        panel.webview.postMessage({ command: 'error', text: err.message ?? String(err) });
      } finally {
        busy = false;
      }
    });
  });

  context.subscriptions.push(startChat);
}

export function deactivate() {}
