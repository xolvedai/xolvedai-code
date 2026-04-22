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
let client = null;
function getClient() {
    if (!client) {
        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey)
            throw new Error('XAI_API_KEY not set');
        client = new openai_1.default({ apiKey, baseURL: 'https://api.x.ai/v1' });
    }
    return client;
}
function activate(context) {
    console.log('✅ Coding Intelligence x XolvedAI v1.9.5 Active');
    const startChat = vscode.commands.registerCommand('coding-intelligence-x-xolvedai.startChat', () => {
        const panel = vscode.window.createWebviewPanel('codingIntelligenceChatView', 'Coding Intelligence x XolvedAI', vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
        panel.webview.html = getWebviewContent();
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'sendMessage') {
                try {
                    const openai = getClient();
                    const stream = await openai.chat.completions.create({
                        model: 'grok-4.20-reasoning',
                        messages: [{ role: 'user', content: message.text }],
                        stream: true,
                        temperature: 0.7,
                        max_tokens: 4096
                    });
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content)
                            panel.webview.postMessage({ command: 'append', text: content });
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coding Intelligence x XolvedAI</title>
  <style>
    body { font-family: system-ui; margin: 0; padding: 0; background: #0a0a0a; color: #fff; height: 100vh; display: flex; flex-direction: column; }
    #header { background: linear-gradient(90deg, #00d4ff, #a020f0); padding: 12px 20px; font-weight: 700; }
    #chat { flex: 1; overflow-y: auto; padding: 20px; }
    .message { max-width: 80%; padding: 12px 18px; border-radius: 18px; margin-bottom: 10px; }
    .user { background: #00d4ff; color: #000; align-self: flex-end; }
    .assistant { background: #1f1f1f; border: 1px solid #a020f0; }
    #input-area { display: flex; padding: 14px; background: #111; }
    #input { flex: 1; padding: 14px 18px; border: none; border-radius: 9999px; background: #222; color: white; }
    button { padding: 0 24px; background: linear-gradient(90deg, #00d4ff, #a020f0); color: #000; border: none; border-radius: 9999px; font-weight: 700; }
  </style>
</head>
<body>
  <div id="header">Coding Intelligence x XolvedAI • Grok 4.20</div>
  <div id="chat"></div>
  <div id="input-area">
    <input id="input" type="text" placeholder="Ask anything..." />
    <button onclick="sendMessage()">Send</button>
  </div>
  <script>
    const chat = document.getElementById('chat');
    const input = document.getElementById('input');

    function addMessage(text, type) {
      const div = document.createElement('div');
      div.className = 'message ' + type;
      div.textContent = text;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.command === 'append') addMessage(msg.text, 'assistant');
      if (msg.command === 'error') addMessage('Error: ' + msg.text, 'assistant');
    });

    function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      addMessage(text, 'user');
      window.vscode.postMessage({ command: 'sendMessage', text: text });
      input.value = '';
    }

    input.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
  </script>
</body>
</html>`;
}
function deactivate() { }
//# sourceMappingURL=extension.js.map