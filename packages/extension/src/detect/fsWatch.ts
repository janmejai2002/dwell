import * as vscode from 'vscode';
import type { Signal, AgentEvent } from './index';

interface FsChangeRecord {
  uri: string;
  ts: number;
}

const EXCLUDE_PATTERNS = [
  /[\\/]node_modules[\\/]/,
  /[\\/]\.git[\\/]/,
  /[\\/]dist[\\/]/,
  /[\\/]build[\\/]/,
  /[\\/]\.next[\\/]/,
];

function isExcluded(fsPath: string): boolean {
  return EXCLUDE_PATTERNS.some((pat) => pat.test(fsPath));
}

/**
 * Signal priority 20: Fallback file system watcher
 */
export class FsWatchSignal implements Signal {
  readonly id = 'fs-watch';
  readonly priority = 20;

  start(emit: (e: AgentEvent) => void): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];
    const eventHistory: FsChangeRecord[] = [];
    let isActive = false;
    let quietTimer: ReturnType<typeof setTimeout> | undefined;

    const onFsEvent = (uri: vscode.Uri) => {
      if (isExcluded(uri.fsPath)) return;

      const activeUri = vscode.window.activeTextEditor?.document.uri.toString();
      if (activeUri === uri.toString()) {
        // Human editing in foreground
        return;
      }

      const now = Date.now();
      eventHistory.push({ uri: uri.toString(), ts: now });

      const cutoff = now - 3000;
      while (eventHistory.length > 0 && eventHistory[0]!.ts < cutoff) {
        eventHistory.shift();
      }

      // >= 3 changes in 3s across distinct background files
      const distinct = new Set(eventHistory.map((e) => e.uri));
      if (distinct.size >= 3) {
        if (!isActive) {
          isActive = true;
          emit({ kind: 'start', source: this.id, at: now });
        }

        if (quietTimer) {
          clearTimeout(quietTimer);
        }

        quietTimer = setTimeout(() => {
          if (isActive) {
            isActive = false;
            emit({ kind: 'end', source: this.id, at: Date.now() });
          }
        }, 4000);
      }
    };

    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    disposables.push(watcher);
    disposables.push(watcher.onDidChange(onFsEvent));
    disposables.push(watcher.onDidCreate(onFsEvent));

    return {
      dispose: () => {
        if (quietTimer) {
          clearTimeout(quietTimer);
          quietTimer = undefined;
        }
        for (const d of disposables) {
          d.dispose();
        }
        eventHistory.length = 0;
      },
    };
  }
}
