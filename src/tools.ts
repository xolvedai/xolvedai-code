import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execP = promisify(exec);

export type ToolResult = { ok: true; output: string } | { ok: false; error: string };

export const CUSTOM_TOOL_SCHEMAS = [
  {
    type: 'function',
    name: 'list_files',
    description: 'List files and directories at a path relative to the workspace root. Returns entries with type (file/dir) and size.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path relative to workspace root. Use "." for root.' },
      },
      required: ['path'],
    },
  },
  {
    type: 'function',
    name: 'read_file',
    description: 'Read the contents of a text file relative to the workspace root.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
      },
      required: ['filePath'],
    },
  },
  {
    type: 'function',
    name: 'write_file',
    description: 'Create or overwrite a file. Requires user approval. Creates parent directories if needed.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['filePath', 'content'],
    },
  },
  {
    type: 'function',
    name: 'create_directory',
    description: 'Create a directory (recursive). Requires user approval.',
    parameters: {
      type: 'object',
      properties: {
        dirPath: { type: 'string' },
      },
      required: ['dirPath'],
    },
  },
  {
    type: 'function',
    name: 'apply_patch',
    description: 'Apply a unified-diff-style patch to an existing file. Safer than write_file for edits. Requires user approval.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        search: { type: 'string', description: 'Exact text to find (must be unique in the file).' },
        replace: { type: 'string', description: 'Text to replace it with.' },
      },
      required: ['filePath', 'search', 'replace'],
    },
  },
  {
    type: 'function',
    name: 'search_files',
    description: 'Search file contents for a regex pattern across the workspace. Returns matching file paths with line numbers.',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string' },
        glob: { type: 'string', description: 'Optional glob to limit scope, e.g. "src/**/*.ts"' },
      },
      required: ['pattern'],
    },
  },
  {
    type: 'function',
    name: 'run_terminal',
    description: 'Run a shell command in the workspace. Requires user approval. 30s timeout, output capped at 16KB.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string' },
      },
      required: ['command'],
    },
  },
];

export const DESTRUCTIVE_TOOLS = new Set(['write_file', 'create_directory', 'apply_patch', 'run_terminal']);

function safePath(root: string, rel: string): string {
  const resolved = path.resolve(root, rel);
  const rr = path.resolve(root);
  if (resolved !== rr && !resolved.startsWith(rr + path.sep)) {
    throw new Error(`path "${rel}" escapes workspace root`);
  }
  return resolved;
}

export async function executeTool(
  name: string,
  args: Record<string, any>,
  workspaceRoot: string,
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'list_files': {
        const p = safePath(workspaceRoot, args.path ?? '.');
        const entries = fs.readdirSync(p, { withFileTypes: true })
          .filter(e => !e.name.startsWith('.') || ['.env.example', '.gitignore', '.github'].includes(e.name))
          .map(e => {
            const full = path.join(p, e.name);
            let size: number | undefined;
            try { if (e.isFile()) size = fs.statSync(full).size; } catch {}
            return { name: e.name, type: e.isDirectory() ? 'dir' : 'file', size };
          });
        return { ok: true, output: JSON.stringify(entries, null, 2) };
      }

      case 'read_file': {
        const p = safePath(workspaceRoot, args.filePath);
        const stat = fs.statSync(p);
        if (stat.size > 1_000_000) return { ok: false, error: 'file too large (>1MB)' };
        return { ok: true, output: fs.readFileSync(p, 'utf8') };
      }

      case 'write_file': {
        const p = safePath(workspaceRoot, args.filePath);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        const content = args.content ?? '';
        fs.writeFileSync(p, content, 'utf8');
        return { ok: true, output: `wrote ${Buffer.byteLength(content, 'utf8')} bytes to ${args.filePath}` };
      }

      case 'create_directory': {
        const p = safePath(workspaceRoot, args.dirPath);
        fs.mkdirSync(p, { recursive: true });
        return { ok: true, output: `created directory ${args.dirPath}` };
      }

      case 'apply_patch': {
        const p = safePath(workspaceRoot, args.filePath);
        const src = fs.readFileSync(p, 'utf8');
        const search: string = args.search ?? '';
        const replace: string = args.replace ?? '';
        const count = (src.split(search).length - 1);
        if (count === 0) return { ok: false, error: 'search text not found in file' };
        if (count > 1) return { ok: false, error: `search text appears ${count} times; must be unique` };
        fs.writeFileSync(p, src.replace(search, replace), 'utf8');
        return { ok: true, output: `patched ${args.filePath} (${search.length}→${replace.length} chars)` };
      }

      case 'search_files': {
        const pattern: string = args.pattern;
        const glob: string = args.glob ?? '';
        const cmd = glob
          ? `rg --line-number --no-heading --max-count 50 --glob ${JSON.stringify(glob)} ${JSON.stringify(pattern)} 2>/dev/null || true`
          : `rg --line-number --no-heading --max-count 50 ${JSON.stringify(pattern)} 2>/dev/null || true`;
        const { stdout } = await execP(cmd, { cwd: workspaceRoot, maxBuffer: 256 * 1024, timeout: 10000 });
        const out = stdout.trim();
        return { ok: true, output: out || '(no matches)' };
      }

      case 'run_terminal': {
        const command: string = args.command;
        try {
          const { stdout, stderr } = await execP(command, {
            cwd: workspaceRoot,
            timeout: 30000,
            maxBuffer: 16 * 1024,
          });
          const combined = (stdout + (stderr ? `\n[stderr]\n${stderr}` : '')).slice(0, 16 * 1024);
          return { ok: true, output: combined || '(no output)' };
        } catch (e: any) {
          const out = (e.stdout || '') + (e.stderr ? `\n[stderr]\n${e.stderr}` : '') + `\n[exit ${e.code ?? 'unknown'}]`;
          return { ok: false, error: out.slice(0, 16 * 1024) };
        }
      }

      default:
        return { ok: false, error: `unknown tool: ${name}` };
    }
  } catch (e: any) {
    return { ok: false, error: e.message ?? String(e) };
  }
}
