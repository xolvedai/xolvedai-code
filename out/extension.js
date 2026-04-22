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
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
function getApiKey(workspaceRoot) {
    let apiKey = process.env.XAI_API_KEY;
    if (!apiKey && workspaceRoot) {
        const envPath = path.join(workspaceRoot, '.env.local');
        if (fs.existsSync(envPath)) {
            const envConfig = dotenv.parse(fs.readFileSync(envPath));
            apiKey = envConfig.XAI_API_KEY;
        }
    }
    if (!apiKey)
        throw new Error('XAI_API_KEY not found');
    return apiKey;
}
function loadXolvedAIMemory(workspaceRoot) {
    if (!workspaceRoot)
        return 'You are Grok running full XolvedAI Adaptive Intelligence (AiOS v2.3).';
    const memoryPath = path.join(workspaceRoot, 'XolvedAI-Coding.md');
    return fs.existsSync(memoryPath) ? fs.readFileSync(memoryPath, 'utf-8') : 'You are Grok running full XolvedAI Adaptive Intelligence (AiOS v2.3).';
}
function activate(context) {
    console.log('✅ Coding Intelligence x XolvedAI v1.12.2 PURE XAI AGENTIC');
    const startChat = vscode.commands.registerCommand('coding-intelligence-x-xolvedai.startChat', () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath || '';
        const panel = vscode.window.createWebviewPanel('codingIntelligenceChatView', 'Coding Intelligence x XolvedAI (Pure xAI Agentic)', vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
        panel.webview.html = getWebviewContent();
        let messages = [];
        panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.command === 'sendMessage') {
                messages.push({ role: 'user', content: msg.text });
                try {
                    const apiKey = getApiKey(workspaceRoot);
                    const memory = loadXolvedAIMemory(workspaceRoot);
                    const body = {
                        model: 'grok-4.20-reasoning',
                        input: [{ role: 'system', content: memory }, ...messages],
                        tools: [
                            { type: "function", name: "list_files", description: "List files and directories", parameters: { type: "object", properties: { path: { type: "string" } } } },
                            { type: "function", name: "read_file", description: "Read file content", parameters: { type: "object", properties: { filePath: { type: "string" } } } },
                            { type: "function", name: "write_file", description: "Write/overwrite file", parameters: { type: "object", properties: { filePath: { type: "string" }, content: { type: "string" } } } },
                            { type: "function", name: "create_directory", description: "Create directory", parameters: { type: "object", properties: { dirPath: { type: "string" } } } },
                            { type: "function", name: "run_terminal", description: "Run terminal command", parameters: { type: "object", properties: { command: { type: "string" } } } },
                            { type: "function", name: "upload_document", description: "Upload file via Python bridge", parameters: { type: "object", properties: { filePath: { type: "string" }, kind: { type: "string", enum: ["media", "upload"] } } } }
                        ],
                        stream: true,
                    };
                    const res = await fetch('https://api.x.ai/v1/responses', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                        body: JSON.stringify(body),
                    });
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done)
                            break;
                        buffer += decoder.decode(value, { stream: true });
                        panel.webview.postMessage({ command: 'append', text: buffer });
                    }
                }
                catch (err) {
                    panel.webview.postMessage({ command: 'error', text: err.message });
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
  <title>Coding Intelligence x XolvedAI</title>
  <style>
    body { font-family: system-ui; margin:0; padding:0; background:#0a0a0a; color:#fff; height:100vh; display:flex; flex-direction:column; }
    #header { background:linear-gradient(90deg,#00d4ff,#a020f0); padding:12px 20px; font-weight:700; }
    #chat { flex:1; overflow-y:auto; padding:20px; }
    .message { max-width:80%; padding:14px 20px; border-radius:18px; margin-bottom:12px; }
    .user { background:#00d4ff; color:#000; align-self:flex-end; margin-left:auto; }
    .assistant { background:#1f1f1f; border:1px solid #a020f0; }
    #input-area { display:flex; padding:16px; background:#111; border-top:1px solid #333; }
    #input { flex:1; padding:12px 18px; border:none; border-radius:9999px; background:#1f1f1f; color:#fff; }
    button { margin-left:12px; padding:12px 24px; background:linear-gradient(90deg,#00d4ff,#a020f0); color:white; border:none; border-radius:9999px; font-weight:600; cursor:pointer; }
  </style>
</head>
<body>
  <div id="header">∞ Coding Intelligence x XolvedAI — Pure xAI Agentic v1.12.2</div>
  <div id="chat"></div>
  <div id="input-area">
    <input id="input" type="text" placeholder="Ask Grok to create the full xolvedai-intelligence folder..." />
    <button onclick="sendMessage()">Send</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const chat = document.getElementById('chat');
    const input = document.getElementById('input');
    function addMessage(text, type) {
      const div = document.createElement('div');
      div.className = 'message ' + type;
      div.textContent = text;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }
    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.command === 'append') addMessage(msg.text, 'assistant');
      else if (msg.command === 'error') addMessage('Error: ' + msg.text, 'assistant');
    });
    function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      addMessage(text, 'user');
      vscode.postMessage({ command: 'sendMessage', text: text });
      input.value = '';
    }
    input.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
  </script>
</body>
</html>`;
}
function deactivate() { }
//# sourceMappingURL=extension.js.map