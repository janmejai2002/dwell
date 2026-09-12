import * as vscode from 'vscode';
import type { Signal, AgentEvent } from './index';

interface BurstEventRecord {
  fileUri: string;
  ts: number;
}

/**
 * Signal priority 30: Document-burst heuristic
 * Detects AI multi-file edits across files.
 */
export class DocBurstSignal implements Signal {
  readonly id = 'doc-burst';
  readonly priority = 30;

  start(emit: (e: AgentEvent) => void): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];
    const eventHistory: BurstEventRecord[] = [];
    let isBurstActive = false;
    let burstQuietTimer: ReturnType<typeof setTimeout> | undefined;
    let suppressUntil = 0;

    // Suppress during onWillSaveTextDocument
    if (typeof vscode.workspace.onWillSaveTextDocument === 'function') {
      disposables.push(
        vscode.workspace.onWillSaveTextDocument(() => {
          suppressUntil = Math.max(suppressUntil, Date.now() + 1000);
        }),
      );
    }

    const docSub = vscode.workspace.onDidChangeTextDocument((e) => {
      const now = Date.now();
      if (now < suppressUntil) return;

      // Ignore Undo / Redo
      const TextDocChangeReason = (vscode as unknown as { TextDocumentChangeReason?: { Undo: number; Redo: number } }).TextDocumentChangeReason;
      if (TextDocChangeReason && e.reason !== undefined) {
        if (e.reason === TextDocChangeReason.Undo || e.reason === TextDocChangeReason.Redo) {
          return;
        }
      }

      // Must have at least one content change with text.length > 24 or spanning >1 line
      const hasLargeOrMultilineChange = e.contentChanges.some(
        (c) => c.text.length > 24 || c.text.includes('\n'),
      );
      if (!hasLargeOrMultilineChange) return;

      const fileUri = e.document.uri.toString();
      const activeUri = vscode.window.activeTextEditor?.document.uri.toString();

      eventHistory.push({ fileUri, ts: now });

      // Clean events older than 3 seconds
      const cutoff = now - 3000;
      while (eventHistory.length > 0 && eventHistory[0]!.ts < cutoff) {
        eventHistory.shift();
      }

      // Check criteria:
      // 1. >= 6 events within 3s
      // 2. spanning >= 2 distinct files
      // 3. at least one changed document is not the active editor's document
      if (eventHistory.length >= 6) {
        const distinctFiles = new Set(eventHistory.map((h) => h.fileUri));
        const hasBackgroundFile = eventHistory.some((h) => h.fileUri !== activeUri);

        if (distinctFiles.size >= 2 && hasBackgroundFile) {
          if (!isBurstActive) {
            isBurstActive = true;
            emit({ kind: 'start', source: this.id, at: now });
          }

          if (burstQuietTimer) {
            clearTimeout(burstQuietTimer);
          }

          // 4 seconds of quiet ends the burst
          burstQuietTimer = setTimeout(() => {
            if (isBurstActive) {
              isBurstActive = false;
              emit({ kind: 'end', source: this.id, at: Date.now() });
            }
          }, 4000);
        }
      }
    });
    disposables.push(docSub);

    return {
      dispose: () => {
        if (burstQuietTimer) {
          clearTimeout(burstQuietTimer);
          burstQuietTimer = undefined;
        }
        for (const d of disposables) {
          d.dispose();
        }
        eventHistory.length = 0;
      },
    };
  }
}
