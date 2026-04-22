export function getWebviewContent(cspSource: string, nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data: https:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<title>Coding Intelligence x XolvedAI</title>
<style>
  :root {
    --bg: #0a0a0a;
    --panel: #121212;
    --panel-2: #1a1a1a;
    --border: #262626;
    --accent-1: #4C1D95;
    --accent-2: #00CFC1;
    --text: #f5f5f5;
    --muted: #8a8a8a;
    --user: #00CFC1;
    --danger: #ef4444;
    --approve: #10b981;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif;
    background: var(--bg);
    color: var(--text);
    display: flex;
    flex-direction: column;
    font-size: 14px;
  }
  #header {
    background: linear-gradient(90deg, var(--accent-1), var(--accent-2));
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  #header .logo { font-weight: 800; letter-spacing: -0.3px; font-size: 15px; }
  #header .sub { font-size: 11px; opacity: 0.75; margin-right: auto; }
  .toggles { display: flex; gap: 6px; align-items: center; }
  .effort { display: flex; background: rgba(0,0,0,0.25); border-radius: 6px; padding: 2px; }
  .effort button {
    background: transparent; color: #fff; border: 0; padding: 4px 8px;
    font-size: 11px; cursor: pointer; border-radius: 4px; font-weight: 600;
  }
  .effort button.active { background: rgba(255,255,255,0.2); }
  .tbtn {
    background: rgba(0,0,0,0.25); border: 0; color: #fff; font-size: 13px;
    width: 28px; height: 26px; border-radius: 6px; cursor: pointer; opacity: 0.5;
  }
  .tbtn.active { opacity: 1; background: rgba(255,255,255,0.22); }
  #chat {
    flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 10px;
  }
  .msg { max-width: 85%; padding: 12px 16px; border-radius: 14px; line-height: 1.55; word-wrap: break-word; }
  .msg.user {
    align-self: flex-end;
    background: var(--user);
    color: #000;
    font-weight: 500;
  }
  .msg.assistant {
    align-self: flex-start;
    background: var(--panel);
    border: 1px solid var(--border);
  }
  .msg.assistant .caret::after {
    content: "▍"; color: var(--accent-2); animation: blink 1s steps(1) infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }
  .msg.error {
    align-self: stretch;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid var(--danger);
    color: #fca5a5;
  }
  .tool-card {
    align-self: stretch;
    background: var(--panel-2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 13px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .tool-head { display: flex; align-items: center; gap: 8px; }
  .tool-head .icon { font-size: 16px; }
  .tool-head .name { font-weight: 600; }
  .tool-head .args { color: var(--muted); font-family: ui-monospace, monospace; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .tool-head .status { font-size: 11px; color: var(--muted); }
  .tool-actions { display: flex; gap: 6px; }
  .tool-actions button {
    padding: 5px 12px; border: 0; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;
  }
  .tool-actions .approve { background: var(--approve); color: #fff; }
  .tool-actions .deny { background: transparent; color: var(--muted); border: 1px solid var(--border); }
  .tool-output {
    background: #0b0b0b; border-radius: 6px; padding: 8px 10px; font-family: ui-monospace, monospace;
    font-size: 12px; color: #d4d4d4; max-height: 200px; overflow: auto; white-space: pre-wrap;
  }
  /* Markdown inside messages */
  .md pre {
    background: #0b0b0b; border: 1px solid var(--border); border-radius: 6px;
    padding: 10px 12px; overflow-x: auto; font-size: 12.5px; margin: 8px 0;
  }
  .md code { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12.5px; }
  .md p code { background: #0b0b0b; padding: 1px 5px; border-radius: 4px; border: 1px solid var(--border); }
  .md h1, .md h2, .md h3 { margin: 12px 0 6px; }
  .md ul, .md ol { margin: 6px 0; padding-left: 22px; }
  .md a { color: var(--accent-2); }
  #input-area {
    padding: 10px 14px 14px;
    background: #0c0c0c;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  #attachments { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .chip {
    background: var(--panel-2); border: 1px solid var(--border); color: var(--text);
    padding: 4px 8px 4px 6px; border-radius: 999px; font-size: 12px; display: flex; align-items: center; gap: 6px;
  }
  .chip img { height: 20px; width: 20px; object-fit: cover; border-radius: 4px; }
  .chip .x { cursor: pointer; color: var(--muted); }
  #row { display: flex; gap: 8px; align-items: flex-end; }
  #input {
    flex: 1; resize: none; max-height: 180px; min-height: 42px;
    background: var(--panel); border: 1px solid var(--border); color: var(--text);
    border-radius: 12px; padding: 11px 14px; font: inherit; outline: none;
  }
  #input:focus { border-color: var(--accent-2); }
  #attach-btn, #send-btn {
    border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 600; cursor: pointer;
    font-size: 14px; height: 42px;
  }
  #attach-btn { background: var(--panel-2); color: var(--text); border: 1px solid var(--border); }
  #send-btn { background: linear-gradient(90deg, var(--accent-1), var(--accent-2)); color: #fff; }
  #send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
</style>
</head>
<body>
<div id="header">
  <span class="logo">XolvedAI</span>
  <span class="sub">Grok 4.20 · Agent</span>
  <div class="toggles">
    <div class="effort" id="effort">
      <button data-effort="low">Fast</button>
      <button data-effort="medium" class="active">Balanced</button>
      <button data-effort="high">Deep</button>
    </div>
    <button class="tbtn" id="tog-web" title="Web search">🌐</button>
    <button class="tbtn" id="tog-code" title="Code interpreter">🐍</button>
    <button class="tbtn" id="tog-x" title="X search">𝕏</button>
  </div>
</div>
<div id="chat"></div>
<div id="input-area">
  <div id="attachments"></div>
  <div id="row">
    <textarea id="input" placeholder="Ask Grok to build, edit, debug, or search..." rows="1"></textarea>
    <button id="attach-btn" title="Attach file or image">📎</button>
    <button id="send-btn">Send</button>
  </div>
</div>

<script nonce="${nonce}">
(function() {
  const vscode = acquireVsCodeApi();
  const chat = document.getElementById('chat');
  const input = document.getElementById('input');
  const sendBtn = document.getElementById('send-btn');
  const attachBtn = document.getElementById('attach-btn');
  const attachmentsEl = document.getElementById('attachments');
  const effortEl = document.getElementById('effort');
  const togWeb = document.getElementById('tog-web');
  const togCode = document.getElementById('tog-code');
  const togX = document.getElementById('tog-x');

  const saved = vscode.getState() || {};
  let effort = saved.effort || 'medium';
  let webSearch = !!saved.webSearch;
  let codeInterp = !!saved.codeInterp;
  let xSearch = !!saved.xSearch;
  let pendingAttachments = [];
  let currentAssistantBubble = null;
  let currentAssistantText = '';
  let toolCards = new Map();

  function persist() {
    vscode.setState({ effort, webSearch, codeInterp, xSearch });
  }
  function renderToggles() {
    effortEl.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.effort === effort);
    });
    togWeb.classList.toggle('active', webSearch);
    togCode.classList.toggle('active', codeInterp);
    togX.classList.toggle('active', xSearch);
  }
  renderToggles();

  effortEl.addEventListener('click', e => {
    const t = e.target;
    if (t.tagName === 'BUTTON' && t.dataset.effort) {
      effort = t.dataset.effort; renderToggles(); persist();
    }
  });
  togWeb.onclick = () => { webSearch = !webSearch; renderToggles(); persist(); };
  togCode.onclick = () => { codeInterp = !codeInterp; renderToggles(); persist(); };
  togX.onclick = () => { xSearch = !xSearch; renderToggles(); persist(); };

  // ---------- Minimal markdown ----------
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safeUrl(u) {
    const t = String(u).trim();
    if (/^(https?:|mailto:|#|\\/)/i.test(t)) return escapeHtml(t);
    return '#';
  }
  function mdRender(rawSrc) {
    // Auto-close an unterminated fence so mid-stream code doesn't render as garbled text
    const fenceCount = (rawSrc.match(/\`\`\`/g) || []).length;
    const src = fenceCount % 2 === 1 ? rawSrc + '\\n\`\`\`' : rawSrc;

    const parts = [];
    const fence = /\`\`\`([a-zA-Z0-9_+-]*)\\n([\\s\\S]*?)\`\`\`/g;
    let last = 0, m;
    while ((m = fence.exec(src)) !== null) {
      parts.push({ t: 'p', v: src.slice(last, m.index) });
      parts.push({ t: 'c', lang: m[1], v: m[2] });
      last = m.index + m[0].length;
    }
    parts.push({ t: 'p', v: src.slice(last) });

    return parts.map(p => {
      if (p.t === 'c') {
        return '<pre><code class="lang-' + escapeHtml(p.lang) + '">' + escapeHtml(p.v) + '</code></pre>';
      }
      let s = escapeHtml(p.v);
      s = s.replace(/\`([^\`\\n]+)\`/g, '<code>$1</code>');
      s = s.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|\\s)\\*([^*\\n]+)\\*/g, '$1<em>$2</em>');
      s = s.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, (_, label, url) => '<a href="' + safeUrl(url) + '">' + label + '</a>');
      s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
      s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
      s = s.replace(/^# (.+)$/gm, '<h1>$1</h1>');
      s = s.replace(/^(?:- |\\* )(.+)$/gm, '<li>$1</li>');
      s = s.replace(/(<li>.*<\\/li>\\n?)+/g, m => '<ul>' + m + '</ul>');
      s = s.split(/\\n{2,}/).map(para => {
        if (/^<(h\\d|ul|ol|pre|blockquote)/.test(para.trim())) return para;
        return '<p>' + para.replace(/\\n/g, '<br>') + '</p>';
      }).join('');
      return s;
    }).join('');
  }

  // ---------- Rendering ----------
  function scrollDown() { chat.scrollTop = chat.scrollHeight; }

  function addUser(text) {
    const div = document.createElement('div');
    div.className = 'msg user';
    div.textContent = text;
    chat.appendChild(div);
    scrollDown();
  }

  function startAssistant() {
    currentAssistantText = '';
    currentAssistantBubble = document.createElement('div');
    currentAssistantBubble.className = 'msg assistant md caret';
    chat.appendChild(currentAssistantBubble);
    scrollDown();
  }
  let renderScheduled = false;
  function flushAssistantRender() {
    renderScheduled = false;
    if (!currentAssistantBubble) return;
    currentAssistantBubble.innerHTML = mdRender(currentAssistantText);
    scrollDown();
  }
  function appendAssistant(delta) {
    if (!currentAssistantBubble) startAssistant();
    currentAssistantText += delta;
    if (!renderScheduled) {
      renderScheduled = true;
      requestAnimationFrame(flushAssistantRender);
    }
  }
  function finishAssistant() {
    if (currentAssistantBubble) {
      flushAssistantRender();
      currentAssistantBubble.classList.remove('caret');
      currentAssistantBubble = null;
    }
  }

  function addError(text) {
    finishAssistant();
    const div = document.createElement('div');
    div.className = 'msg error';
    div.textContent = text;
    chat.appendChild(div);
    scrollDown();
  }

  function addToolCard(callId, kind, name, args, needsApproval) {
    finishAssistant();
    const div = document.createElement('div');
    div.className = 'tool-card';
    const icon = kind === 'web_search' ? '🌐' : kind === 'code_interpreter' ? '🐍' : kind === 'x_search' ? '𝕏' : '🔧';
    const head = document.createElement('div');
    head.className = 'tool-head';
    head.innerHTML = '<span class="icon">' + icon + '</span><span class="name"></span><span class="args"></span><span class="status">' + (needsApproval ? 'awaiting approval' : 'running…') + '</span>';
    head.querySelector('.name').textContent = name;
    head.querySelector('.args').textContent = args;
    div.appendChild(head);

    if (needsApproval) {
      const actions = document.createElement('div');
      actions.className = 'tool-actions';
      actions.innerHTML = '<button class="approve">Approve</button><button class="deny">Deny</button>';
      actions.querySelector('.approve').onclick = () => {
        vscode.postMessage({ command: 'approval', callId, approved: true });
        actions.remove();
        head.querySelector('.status').textContent = 'running…';
      };
      actions.querySelector('.deny').onclick = () => {
        vscode.postMessage({ command: 'approval', callId, approved: false });
        actions.remove();
        head.querySelector('.status').textContent = 'denied';
      };
      div.appendChild(actions);
    }
    chat.appendChild(div);
    toolCards.set(callId, div);
    scrollDown();
  }

  function updateToolCard(callId, status, output) {
    const card = toolCards.get(callId);
    if (!card) return;
    const st = card.querySelector('.status');
    if (st) st.textContent = status;
    if (output !== undefined) {
      const existing = card.querySelector('.tool-output');
      if (existing) existing.remove();
      const out = document.createElement('div');
      out.className = 'tool-output';
      out.textContent = output;
      card.appendChild(out);
    }
    scrollDown();
  }

  // ---------- Attachments ----------
  function renderAttachments() {
    attachmentsEl.innerHTML = '';
    pendingAttachments.forEach((a, i) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      if (a.kind === 'image') {
        const im = document.createElement('img');
        im.src = a.dataUrl;
        chip.appendChild(im);
      }
      const label = document.createElement('span');
      label.textContent = a.name;
      chip.appendChild(label);
      const x = document.createElement('span');
      x.className = 'x'; x.textContent = '✕';
      x.onclick = () => { pendingAttachments.splice(i, 1); renderAttachments(); };
      chip.appendChild(x);
      attachmentsEl.appendChild(chip);
    });
  }

  attachBtn.onclick = () => {
    const fi = document.createElement('input');
    fi.type = 'file';
    fi.accept = '*/*';
    fi.onchange = () => { if (fi.files[0]) ingestFile(fi.files[0]); };
    fi.click();
  };

  function ingestFile(file) {
    const isImage = /^image\\/(png|jpe?g|webp|gif)$/.test(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      if (isImage) {
        pendingAttachments.push({ kind: 'image', name: file.name, dataUrl: reader.result, mime: file.type });
      } else {
        pendingAttachments.push({ kind: 'text', name: file.name, content: reader.result });
      }
      renderAttachments();
    };
    if (isImage) reader.readAsDataURL(file);
    else reader.readAsText(file);
  }

  input.addEventListener('paste', e => {
    if (!e.clipboardData) return;
    for (const item of e.clipboardData.items) {
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f) { ingestFile(f); e.preventDefault(); }
      }
    }
  });

  // ---------- Send ----------
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 180) + 'px';
  });
  sendBtn.onclick = send;

  function send() {
    const text = input.value.trim();
    if (!text && pendingAttachments.length === 0) return;
    addUser(text || '[attachment]');
    vscode.postMessage({
      command: 'sendMessage',
      text,
      attachments: pendingAttachments,
      opts: { effort, webSearch, codeInterp, xSearch },
    });
    input.value = ''; input.style.height = 'auto';
    pendingAttachments = []; renderAttachments();
    sendBtn.disabled = true;
    startAssistant();
  }

  // ---------- Inbound from extension ----------
  window.addEventListener('message', e => {
    const m = e.data;
    switch (m.command) {
      case 'textDelta': appendAssistant(m.delta); break;
      case 'assistantDone': finishAssistant(); sendBtn.disabled = false; break;
      case 'error': finishAssistant(); addError(m.text); sendBtn.disabled = false; break;
      case 'toolCall':
        if (!toolCards.has(m.callId)) addToolCard(m.callId, m.kind, m.name, m.args, m.needsApproval);
        break;
      case 'toolUpdate': updateToolCard(m.callId, m.status, m.output); break;
    }
  });
})();
</script>
</body>
</html>`;
}

export function makeNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
