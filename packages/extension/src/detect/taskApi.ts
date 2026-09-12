import * as vscode from 'vscode';
import type { Signal, AgentEvent } from './index';

/**
 * Signal priority 50: VS Code Tasks API (builds, tests)
 */
export class TaskApiSignal implements Signal {
  readonly id = 'task-api';
  readonly priority = 50;

  start(emit: (e: AgentEvent) => void): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];

    const startSub = vscode.tasks.onDidStartTask(() => {
      emit({ kind: 'start', source: this.id, at: Date.now() });
    });
    disposables.push(startSub);

    const endSub = vscode.tasks.onDidEndTask(() => {
      emit({ kind: 'end', source: this.id, at: Date.now() });
    });
    disposables.push(endSub);

    return {
      dispose: () => {
        for (const d of disposables) {
          d.dispose();
        }
      },
    };
  }
}
