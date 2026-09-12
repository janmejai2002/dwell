import * as vscode from 'vscode';
import type { Signal, AgentEvent } from './index';

const TRIVIAL_COMMANDS = new Set([
  'cd', 'ls', 'dir', 'pwd', 'clear', 'cls', 'exit', 'true', 'false', 'echo',
]);

function isLongRunningCommand(cmdLine: string): boolean {
  const trimmed = cmdLine.trim();
  if (!trimmed) return false;
  const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase() ?? '';
  if (TRIVIAL_COMMANDS.has(firstWord)) return false;
  return true;
}

/**
 * Signal priority 60: Terminal shell execution tracking
 */
export class TerminalShellSignal implements Signal {
  readonly id = 'terminal-shell';
  readonly priority = 60;

  start(emit: (e: AgentEvent) => void): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];

    // Check if terminal shell execution API is supported
    const win = vscode.window as unknown as {
      onDidStartTerminalShellExecution?: (
        listener: (e: { execution: { commandLine?: { value?: string } | string } }) => void,
      ) => vscode.Disposable;
      onDidEndTerminalShellExecution?: (
        listener: (e: unknown) => void,
      ) => vscode.Disposable;
    };

    if (typeof win.onDidStartTerminalShellExecution === 'function') {
      const startSub = win.onDidStartTerminalShellExecution((e) => {
        let cmd = '';
        if (typeof e.execution.commandLine === 'string') {
          cmd = e.execution.commandLine;
        } else if (e.execution.commandLine && typeof e.execution.commandLine.value === 'string') {
          cmd = e.execution.commandLine.value;
        }

        if (isLongRunningCommand(cmd)) {
          emit({ kind: 'start', source: this.id, at: Date.now() });
        }
      });
      disposables.push(startSub);

      if (typeof win.onDidEndTerminalShellExecution === 'function') {
        const endSub = win.onDidEndTerminalShellExecution(() => {
          emit({ kind: 'end', source: this.id, at: Date.now() });
        });
        disposables.push(endSub);
      }
    }

    return {
      dispose: () => {
        for (const d of disposables) {
          d.dispose();
        }
      },
    };
  }
}
