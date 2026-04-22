import * as vscode from 'vscode';
import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) throw new Error('XAI_API_KEY not set');
    client = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });
  }
  return client;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('✅ Coding Intelligence x XolvedAI v1.9.4 Active');

  const startChat = vscode.commands.registerCommand('coding-intelligence-x-xolvedai.startChat', () => {
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

export function deactivate() {}