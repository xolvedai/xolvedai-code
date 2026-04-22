# Coding Intelligence x XolvedAI

A VS Code coding agent powered by **xAI Grok 4.20**. Streams responses in place, calls tools on your workspace with per-action approval, and exposes xAI's server-side tools (web search, code interpreter, X search) alongside vision input.

## Features

- **Streaming chat** — one assistant bubble that fills in place, markdown formatted.
- **Client-side tools (with approval):**
  - `list_files`, `read_file`, `search_files` — read-only, auto-approved
  - `write_file`, `create_directory`, `apply_patch`, `run_terminal` — destructive, prompt before running
- **xAI server-side tools** (toggles in the header):
  - 🌐 `web_search` — live web results
  - 🐍 `code_interpreter` — Python sandbox
  - 𝕏 `x_search` — X posts and threads
- **Vision** — paste or attach images (PNG, JPG, WebP, GIF); Grok sees them. Provider-side size limit is 20 MB per image.
- **Reasoning effort** — Fast / Balanced / Deep toggle.
- **Efficient multi-turn** — uses `previous_response_id` so follow-ups don't resend history.
- **Workspace-scoped path safety** — file tools reject paths that escape the workspace root.

## Installation

1. Install the `.vsix`:
   ```bash
   code --install-extension coding-intelligence-x-xolvedai-1.15.1.vsix
   ```
2. Set your xAI API key (see below).
3. Press `Ctrl+Shift+G` (macOS: `Cmd+Shift+G`) to open the agent panel.

## API key

The extension reads `XAI_API_KEY` from either the environment or a `.env.local` file at the workspace root. See [.env.example](./.env.example).

```bash
# Option A — env var
export XAI_API_KEY=xai-...

# Option B — workspace file (gitignored)
cp .env.example .env.local
# edit .env.local, paste your key
```

Get a key at [console.x.ai](https://console.x.ai/).

## Project memory

If a `XolvedAI-Coding.md` file exists at the workspace root, its contents are appended to the system instructions every turn. Use it for project-specific context (architecture notes, coding conventions, domain language).

## Approval behavior

- Read-only tools run without prompting.
- `write_file`, `create_directory`, `apply_patch`, `run_terminal` show an inline approval card in the chat. Click **Approve** or **Deny**; denied calls return `user denied` to the model so it can adapt.
- `run_terminal` has a 30s timeout and output capped at 16 KB.

## Keyboard shortcut

| Action | Shortcut |
|---|---|
| Open agent panel | `Ctrl+Shift+G` / `Cmd+Shift+G` |
| Send message | `Enter` |
| New line in input | `Shift+Enter` |
| Paste image | `Ctrl+V` / `Cmd+V` (when input is focused) |

## Architecture

```
src/
  extension.ts    VS Code activation, webview lifecycle, message routing
  xaiClient.ts    POST /v1/responses, SSE parser, agent turn loop
  tools.ts        Tool schemas + guarded local executors
  approval.ts     Approval registry (bridges webview UI ↔ agent loop)
  webview.ts      Chat UI (HTML/CSS/JS, CSP-locked, no remote scripts)
```

The client talks to `https://api.x.ai/v1/responses` with `stream: true` and parses SSE events (`response.output_text.delta`, `response.output_item.added` for function calls, `response.function_call_arguments.delta`, `response.completed`). Client-side tool calls are looped back as `function_call_output` items until the model emits no more calls.

## Development

```bash
npm ci
npm run compile        # tsc
npm run watch          # tsc --watch
npx vsce package       # produce .vsix
```

## License

MIT. See [LICENSE.txt](./LICENSE.txt).
