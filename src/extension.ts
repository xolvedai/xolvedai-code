import * as vscode from 'vscode';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

let client: OpenAI | null = null;

function getClient(workspaceRoot?: string): OpenAI {
  if (!client) {
    let apiKey = process.env.XAI_API_KEY;

    // Fallback to .env.local in workspace
    if (!apiKey && workspaceRoot) {
      const envPath = path.join(workspaceRoot, '.env.local');
      if (fs.existsSync(envPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        apiKey = envConfig.XAI_API_KEY;
      }
    }

    if (!apiKey) {
      throw new Error(
        'XAI_API_KEY not found. Please set it as an environment variable or add it to .env.local in your workspace root.'
      );
    }

    client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.x.ai/v1',
    });
  }
  return client;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('✅ Coding Intelligence x XolvedAI v1.9.7 Active — Powered by Grok');

  const startChat = vscode.commands.registerCommand('coding-intelligence-x-xolvedai.startChat', () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath;

    const panel = vscode.window.createWebviewPanel(
      'codingIntelligenceChatView',
      'Coding Intelligence x XolvedAI',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'sendMessage') {
        try {
          const openai = getClient(workspaceRoot);
          const stream = await openai.chat.completions.create({
            model: 'grok-4.20-reasoning',
            messages: [{ role: 'user', content: message.text }],
            stream: true,
            temperature: 0.7,
            max_tokens: 4096,
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) panel.webview.postMessage({ command: 'append', text: content });
          }
        } catch (err: any) {
          panel.webview.postMessage({ command: 'error', text: err.message });
        }
      }
    });
  });

  context.subscriptions.push(startChat);
}

function getWebviewContent(): string {
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
    .message { max-width: 80%; padding: 14px 20px; border-radius: 18px; margin-bottom: 12px; white-space: pre-wrap; }
    .user { background: #00d4ff; color: #000; align-self: flex-end; margin-left: auto; }
    .assistant { background: #1f1f1f; border: 1px solid #a020f0; }
    #input-area { display: flex; padding: 16px; background: #111; border-top: 1px solid #333; }
    #input { flex: 1; padding: 12px 18px; border: none; border-radius: 9999px; background: #1f1f1f; color: #fff; font-size: 15px; outline: none; }
    button { margin-left: 12px; padding: 12px 24px; background: linear-gradient(90deg, #00d4ff, #a020f0); color: white; border: none; border-radius: 9999px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div id="header">∞ Coding Intelligence x XolvedAI — Powered by Grok</div>
  <div id="chat"></div>
  <div id="input-area">
    <input id="input" type="text" placeholder="Ask Grok anything..." />
    <button onclick="sendMessage()">Send</button>
  </div>
  <script>
    const chat = document.getElementById('chat');
    const input = document.getElementById('input');
    const vscode = acquireVsCodeApi();

    function addMessage(text, type) {
      const div = document.createElement('div');
      div.className = 'message ' + type;
      div.textContent = text;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.command === 'append') {
        const last = chat.lastChild;
        if (last && last.classList.contains('assistant')) {
          last.textContent += msg.text;
        } else {
          addMessage(msg.text, 'assistant');
        }
      } else if (msg.command === 'error') {
        addMessage('Error: ' + msg.text, 'assistant');
      }
    });

    function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      addMessage(text, 'user');
      vscode.postMessage({ command: 'sendMessage', text: text });
      input.value = '';
    }

    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') sendMessage();
    });
  </script>
</body>
</html>`;
}

export function deactivate() {}