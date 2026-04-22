import * as vscode from 'vscode';

type PendingApproval = { resolve: (approved: boolean) => void };

export class ApprovalRegistry {
  private pending = new Map<string, PendingApproval>();

  request(callId: string): Promise<boolean> {
    return new Promise(resolve => {
      this.pending.set(callId, { resolve });
    });
  }

  resolve(callId: string, approved: boolean) {
    const p = this.pending.get(callId);
    if (p) {
      this.pending.delete(callId);
      p.resolve(approved);
    }
  }

  clear() {
    for (const p of this.pending.values()) p.resolve(false);
    this.pending.clear();
  }
}

export async function confirmDestructive(tool: string, args: Record<string, any>): Promise<boolean> {
  const summary = summarize(tool, args);
  const pick = await vscode.window.showWarningMessage(
    `Grok wants to run: ${summary}`,
    { modal: true },
    'Approve',
    'Deny',
  );
  return pick === 'Approve';
}

function summarize(tool: string, args: Record<string, any>): string {
  switch (tool) {
    case 'write_file': return `write_file ${args.filePath} (${(args.content ?? '').length} chars)`;
    case 'create_directory': return `create_directory ${args.dirPath}`;
    case 'apply_patch': return `apply_patch ${args.filePath}`;
    case 'run_terminal': return `run_terminal: ${args.command}`;
    default: return `${tool} ${JSON.stringify(args).slice(0, 120)}`;
  }
}
