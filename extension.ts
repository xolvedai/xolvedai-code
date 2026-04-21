import * as vscode from 'vscode';
import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error('XAI_API_KEY environment variable is not set. Please set it in your terminal or Codespace secrets.');
    }
    client = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://api.x.ai/v1',
    });
  }
  return client;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('✅ XolvedAI Code activated — Powered by Grok 4.20-reasoning');

  const startChat = vscode.commands.registerCommand('xolvedai-code.startChat', () => {
    const panel = vscode.window.createWebviewPanel(
      'xolvedaiChat',
      'XolvedAI Agent Chat',
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
            max_tokens: 4096,
          });

          let fullResponse = '';
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            fullResponse += content;
            panel.webview.postMessage({ command: 'append', text: content });
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
  <title>XolvedAI Code</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #0a0a0a; color: #fff; height: 100vh; display: flex; flex-direction: column; }
    #chat { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .message { max-width: 80%; padding: 12px 18px; border-radius: 18px; line-height: 1.5; }
    .user { align-self: flex-end; background: #00d4ff; color: #000; }
    .assistant { align-self: flex-start; background: #1f1f1f; }
    #input-area { display: flex; padding: 12px; background: #111; border-top: 1px solid #333; }
    #input { flex: 1; padding: 12px 16px; border: none; border-radius: 9999px; background: #222; color: white; }
    button { margin-left: 8px; padding: 0 24px; background: #00d4ff; color: black; border: none; border-radius: 9999px; font-weight: bold; }
  </style>
</head>
<body>
  <div id="chat"></div>
  <div id="input-area">
    <input id="input" type="text" placeholder="Ask Grok anything..." />
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
      window.vscode.postMessage({ command: 'sendMessage', text: text });
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
