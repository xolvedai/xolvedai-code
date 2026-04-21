"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const openai_1 = __importDefault(require("openai"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let client = null;
let chatHistory = [];
let isPlanMode = false;
let pendingEdit = null;
function getClient() {
    if (!client) {
        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey)
            throw new Error('XAI_API_KEY not set. Add it in terminal or Codespace secrets.');
        client = new openai_1.default({ apiKey, baseURL: 'https://api.x.ai/v1' });
    }
    return client;
}
const tools = [
    { type: "function", function: { name: "read_file", description: "Read file contents", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
    { type: "function", function: { name: "list_files", description: "List directory contents", parameters: { type: "object", properties: { path: { type: "string" } } } } },
    { type: "function", function: { name: "search_codebase", description: "Search code across workspace", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
    { type: "function", function: { name: "edit_file", description: "Edit or create a file (requires approval)", parameters: { type: "object", properties: { path: { type: "string" }, newContent: { type: "string" } }, required: ["path", "newContent"] } } },
    { type: "function", function: { name: "run_terminal", description: "Run a terminal command (requires approval)", parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } } },
    { type: "function", function: { name: "get_context", description: "Get current file and selection", parameters: { type: "object", properties: {} } } }
];
async function executeTool(name, args, panel) {
    const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    try {
        switch (name) {
            case 'read_file': {
                const full = path.join(workspace, args.path);
                return fs.readFileSync(full, 'utf8');
            }
            case 'list_files': {
                const dir = args.path ? path.join(workspace, args.path) : workspace;
                return fs.readdirSync(dir).map(f => {
                    const stat = fs.statSync(path.join(dir, f));
                    return `${stat.isDirectory() ? '📁' : '📄'} ${f}`;
                }).join('\n');
            }
            case 'search_codebase': {
                const { execSync } = require('child_process');
                const cmd = `cd "${workspace}" && grep -r --include="*.{ts,js,tsx,jsx,py,go,rs}" "${args.query}" . 2>/dev/null | head -15`;
                return execSync(cmd, { encoding: 'utf8' }) || 'No matches found';
            }
            case 'edit_file': {
                pendingEdit = { path: args.path, newContent: args.newContent };
                panel.webview.postMessage({ command: 'showApproval', path: args.path, content: args.newContent });
                return `PROPOSED EDIT: ${args.path} (waiting for your approval)`;
            }
            case 'run_terminal': {
                panel.webview.postMessage({ command: 'showApproval', terminalCommand: args.command });
                return `Would run: ${args.command}`;
            }
            case 'get_context': {
                const editor = vscode.window.activeTextEditor;
                if (!editor)
                    return 'No active editor open';
                const doc = editor.document;
                const sel = editor.selection;
                return `File: ${doc.fileName}\nLanguage: ${doc.languageId}\nSelection: ${doc.getText(sel) || '(none)'}\nTotal lines: ${doc.lineCount}`;
            }
            default: return `Unknown tool: ${name}`;
        }
    }
    catch (e) {
        return `Error: ${e.message}`;
    }
}
function activate(context) {
    console.log('✅ XolvedAI Code v1.8.0 — Full Premium Agent Active');
    const startChat = vscode.commands.registerCommand('xolvedai-code.startChat', () => {
        const panel = vscode.window.createWebviewPanel('xolvedaiChat', 'XolvedAI Agent Chat', vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
        panel.webview.html = getWebviewContent();
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'sendMessage') {
                chatHistory.push({ role: 'user', content: message.text });
                const openai = getClient();
                const stream = await openai.chat.completions.create({
                    model: 'grok-4.20-reasoning',
                    messages: chatHistory,
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 8192,
                    tools: tools,
                    tool_choice: 'auto'
                });
                let assistantText = '';
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        assistantText += content;
                        panel.webview.postMessage({ command: 'append', text: content });
                    }
                }
                chatHistory.push({ role: 'assistant', content: assistantText });
            }
            if (message.command === 'approve') {
                if (pendingEdit) {
                    const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
                    const fullPath = path.join(workspace, pendingEdit.path);
                    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                    fs.writeFileSync(fullPath, pendingEdit.newContent);
                    panel.webview.postMessage({ command: 'append', text: `✅ Applied: ${pendingEdit.path}` });
                    pendingEdit = null;
                }
            }
            if (message.command === 'reject') {
                panel.webview.postMessage({ command: 'append', text: '❌ Action rejected' });
                pendingEdit = null;
            }
            if (message.command === 'togglePlan') {
                isPlanMode = message.enabled;
                panel.webview.postMessage({ command: 'planMode', enabled: isPlanMode });
            }
            if (message.command === 'captureContext') {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    const doc = editor.document;
                    const sel = editor.selection;
                    const context = `Current file: ${doc.fileName}\nLanguage: ${doc.languageId}\n\n${doc.getText(sel) || doc.getText()}`;
                    panel.webview.postMessage({ command: 'append', text: '📸 Context captured — analyzing with Grok...' });
                    chatHistory.push({ role: 'user', content: `Analyze this code:\n\n${context}` });
                }
            }
        });
    });
    context.subscriptions.push(startChat);
}
function getWebviewContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XolvedAI Code</title>
  <style>
    :root { --cyan: #00d4ff; --purple: #a020f0; --green: #00ff9d; }
    body { font-family: system-ui; margin: 0; padding: 0; background: #0a0a0a; color: #fff; height: 100vh; display: flex; flex-direction: column; background: linear-gradient(135deg, #0a0a0a, #1a0033); }
    #header { background: linear-gradient(90deg, var(--cyan), var(--purple)); padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; font-weight: 700; }
    #chat { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    .message { max-width: 82%; padding: 14px 20px; border-radius: 20px; line-height: 1.5; font-size: 14px; }
    .user { align-self: flex-end; background: var(--cyan); color: #000; }
    .assistant { align-self: flex-start; background: #1f1f1f; border: 1px solid var(--purple); }
    .tool { background: #112211; border-left: 4px solid var(--green); font-family: monospace; font-size: 12px; }
    #input-area { display: flex; padding: 14px; background: #111; border-top: 1px solid #333; gap: 8px; }
    #input { flex: 1; padding: 14px 18px; border: none; border-radius: 9999px; background: #222; color: white; font-size: 14px; }
    button { padding: 0 22px; background: linear-gradient(90deg, var(--cyan), var(--purple)); color: #000; border: none; border-radius: 9999px; font-weight: 700; cursor: pointer; }
    .tool-btn { background: #222; color: var(--cyan); border: 1px solid var(--cyan); padding: 6px 14px; font-size: 12px; margin: 2px; border-radius: 9999px; }
    #plan-toggle { font-size: 12px; padding: 4px 12px; border-radius: 9999px; border: 1px solid var(--purple); background: transparent; color: var(--purple); }
    .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: none; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: #1f1f1f; padding: 24px; border-radius: 16px; max-width: 720px; width: 92%; border: 1px solid var(--purple); }
    .diff { background: #111; padding: 14px; border-radius: 8px; font-family: monospace; white-space: pre-wrap; max-height: 320px; overflow-y: auto; font-size: 12px; }
  </style>
</head>
<body>
  <div id="header">
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:22px">∞</span>
      <span style="font-weight:800">XolvedAI Code</span>
      <span style="background:#112211;color:var(--green);padding:2px 8px;border-radius:9999px;font-size:10px">Grok 4.20</span>
    </div>
    <div>
      <button id="plan-toggle" onclick="togglePlan()">Plan Mode: OFF</button>
      <button class="tool-btn" onclick="captureContext()">📸 Capture</button>
    </div>
  </div>
  <div id="chat"></div>
  <div id="input-area">
    <input id="input" type="text" placeholder="Ask Grok anything... (tools, multi-file, vision enabled)" />
    <button onclick="sendMessage()">Send</button>
  </div>

  <div id="approval-modal" class="modal">
    <div class="modal-content">
      <h3 id="modal-title" style="margin-top:0;color:var(--cyan)"></h3>
      <div id="modal-body" class="diff"></div>
      <div style="margin-top:16px;display:flex;gap:12px;justify-content:flex-end">
        <button onclick="reject()" style="background:#ff4444;color:white;padding:8px 24px;border-radius:9999px">Reject</button>
        <button onclick="approve()" style="background:linear-gradient(90deg,var(--cyan),var(--green));color:#000;padding:8px 24px;border-radius:9999px">Approve</button>
      </div>
    </div>
  </div>

  <script>
    const chat = document.getElementById('chat');
    const input = document.getElementById('input');
    let planMode = false;

    function addMessage(text, type, name = '') {
      const div = document.createElement('div');
      div.className = 'message ' + type;
      if (name) div.innerHTML = '<strong>' + name + ':</strong> ' + text;
      else div.textContent = text;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.command === 'append') {
        const last = chat.lastChild;
        if (last && last.classList.contains('assistant')) last.textContent += msg.text;
        else addMessage(msg.text, 'assistant');
      } else if (msg.command === 'toolResult') {
        addMessage(msg.result, 'tool', '🔧 ' + msg.name);
      } else if (msg.command === 'error') {
        addMessage('Error: ' + msg.text, 'assistant');
      } else if (msg.command === 'showApproval') {
        document.getElementById('modal-title').textContent = msg.path ? 'Approve File Edit: ' + msg.path : 'Approve Terminal Command';
        document.getElementById('modal-body').textContent = msg.content || msg.command || '';
        document.getElementById('approval-modal').style.display = 'flex';
      } else if (msg.command === 'planMode') {
        planMode = msg.enabled;
        document.getElementById('plan-toggle').textContent = 'Plan Mode: ' + (planMode ? 'ON' : 'OFF');
      }
    });

    function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      addMessage(text, 'user');
      window.vscode.postMessage({ command: 'sendMessage', text: text });
      input.value = '';
    }

    function togglePlan() {
      planMode = !planMode;
      window.vscode.postMessage({ command: 'togglePlan', enabled: planMode });
      document.getElementById('plan-toggle').textContent = 'Plan Mode: ' + (planMode ? 'ON' : 'OFF');
    }

    function approve() {
      document.getElementById('approval-modal').style.display = 'none';
      window.vscode.postMessage({ command: 'approve' });
    }

    function reject() {
      document.getElementById('approval-modal').style.display = 'none';
      window.vscode.postMessage({ command: 'reject' });
    }

    function captureContext() {
      addMessage('📸 Capturing current file + selection...', 'assistant');
      window.vscode.postMessage({ command: 'captureContext' });
    }

    input.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
    setTimeout(() => input.focus(), 400);
  </script>
</body>
</html>`;
}
function deactivate() { }
//# sourceMappingURL=extension.js.map