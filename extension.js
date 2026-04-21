"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
var vscode = require("vscode");
var openai_1 = require("openai");
var client = null;
function getClient() {
    if (!client) {
        var apiKey = process.env.XAI_API_KEY;
        if (!apiKey) {
            throw new Error('XAI_API_KEY environment variable is not set. Please set it in your terminal or Codespace secrets.');
        }
        client = new openai_1.default({
            apiKey: apiKey,
            baseURL: 'https://api.x.ai/v1',
        });
    }
    return client;
}
function activate(context) {
    var _this = this;
    console.log('✅ XolvedAI Code activated — Powered by Grok 4.20-reasoning');
    var startChat = vscode.commands.registerCommand('xolvedai-code.startChat', function () {
        var panel = vscode.window.createWebviewPanel('xolvedaiChat', 'XolvedAI Agent Chat', vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
        panel.webview.html = getWebviewContent();
        panel.webview.onDidReceiveMessage(function (message) { return __awaiter(_this, void 0, void 0, function () {
            var openai, stream, fullResponse, _a, stream_1, stream_1_1, chunk, content, e_1_1, err_1;
            var _b, e_1, _c, _d;
            var _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (!(message.command === 'sendMessage')) return [3 /*break*/, 16];
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 15, , 16]);
                        openai = getClient();
                        return [4 /*yield*/, openai.chat.completions.create({
                                model: 'grok-4.20-reasoning',
                                messages: [{ role: 'user', content: message.text }],
                                stream: true,
                                temperature: 0.7,
                                max_tokens: 4096,
                            })];
                    case 2:
                        stream = _g.sent();
                        fullResponse = '';
                        _g.label = 3;
                    case 3:
                        _g.trys.push([3, 8, 9, 14]);
                        _a = true, stream_1 = __asyncValues(stream);
                        _g.label = 4;
                    case 4: return [4 /*yield*/, stream_1.next()];
                    case 5:
                        if (!(stream_1_1 = _g.sent(), _b = stream_1_1.done, !_b)) return [3 /*break*/, 7];
                        _d = stream_1_1.value;
                        _a = false;
                        chunk = _d;
                        content = ((_f = (_e = chunk.choices[0]) === null || _e === void 0 ? void 0 : _e.delta) === null || _f === void 0 ? void 0 : _f.content) || '';
                        fullResponse += content;
                        panel.webview.postMessage({ command: 'append', text: content });
                        _g.label = 6;
                    case 6:
                        _a = true;
                        return [3 /*break*/, 4];
                    case 7: return [3 /*break*/, 14];
                    case 8:
                        e_1_1 = _g.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 14];
                    case 9:
                        _g.trys.push([9, , 12, 13]);
                        if (!(!_a && !_b && (_c = stream_1.return))) return [3 /*break*/, 11];
                        return [4 /*yield*/, _c.call(stream_1)];
                    case 10:
                        _g.sent();
                        _g.label = 11;
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 13: return [7 /*endfinally*/];
                    case 14: return [3 /*break*/, 16];
                    case 15:
                        err_1 = _g.sent();
                        panel.webview.postMessage({ command: 'error', text: err_1.message });
                        return [3 /*break*/, 16];
                    case 16: return [2 /*return*/];
                }
            });
        }); });
    });
    context.subscriptions.push(startChat);
}
function getWebviewContent() {
    return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>XolvedAI Code</title>\n  <style>\n    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #0a0a0a; color: #fff; height: 100vh; display: flex; flex-direction: column; }\n    #chat { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }\n    .message { max-width: 80%; padding: 12px 18px; border-radius: 18px; line-height: 1.5; }\n    .user { align-self: flex-end; background: #00d4ff; color: #000; }\n    .assistant { align-self: flex-start; background: #1f1f1f; }\n    #input-area { display: flex; padding: 12px; background: #111; border-top: 1px solid #333; }\n    #input { flex: 1; padding: 12px 16px; border: none; border-radius: 9999px; background: #222; color: white; }\n    button { margin-left: 8px; padding: 0 24px; background: #00d4ff; color: black; border: none; border-radius: 9999px; font-weight: bold; }\n  </style>\n</head>\n<body>\n  <div id=\"chat\"></div>\n  <div id=\"input-area\">\n    <input id=\"input\" type=\"text\" placeholder=\"Ask Grok anything...\" />\n    <button onclick=\"sendMessage()\">Send</button>\n  </div>\n\n  <script>\n    const chat = document.getElementById('chat');\n    const input = document.getElementById('input');\n\n    function addMessage(text, type) {\n      const div = document.createElement('div');\n      div.className = 'message ' + type;\n      div.textContent = text;\n      chat.appendChild(div);\n      chat.scrollTop = chat.scrollHeight;\n    }\n\n    window.addEventListener('message', event => {\n      const msg = event.data;\n      if (msg.command === 'append') {\n        const last = chat.lastChild;\n        if (last && last.classList.contains('assistant')) {\n          last.textContent += msg.text;\n        } else {\n          addMessage(msg.text, 'assistant');\n        }\n      } else if (msg.command === 'error') {\n        addMessage('Error: ' + msg.text, 'assistant');\n      }\n    });\n\n    function sendMessage() {\n      const text = input.value.trim();\n      if (!text) return;\n      addMessage(text, 'user');\n      window.vscode.postMessage({ command: 'sendMessage', text: text });\n      input.value = '';\n    }\n\n    input.addEventListener('keypress', e => {\n      if (e.key === 'Enter') sendMessage();\n    });\n  </script>\n</body>\n</html>";
}
function deactivate() { }
