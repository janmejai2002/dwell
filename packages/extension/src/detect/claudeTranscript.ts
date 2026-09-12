import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import type { Signal, AgentEvent } from './index';

/**
 * Signal priority 80: Watches ~/.claude/projects jsonl appends.
 * End is inferred after 4s of quiet.
 */
export class ClaudeTranscriptSignal implements Signal {
  readonly id = 'claude-transcript';
  readonly priority = 80;

  start(emit: (e: AgentEvent) => void): vscode.Disposable {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');
    let watcher: fs.FSWatcher | undefined;
    let quietTimer: ReturnType<typeof setTimeout> | undefined;
    let isTaskActive = false;

    const onFileActivity = () => {
      const now = Date.now();
      if (!isTaskActive) {
        isTaskActive = true;
        emit({ kind: 'start', source: this.id, at: now });
      }

      if (quietTimer) {
        clearTimeout(quietTimer);
      }

      // 4s of quiet infers task end
      quietTimer = setTimeout(() => {
        if (isTaskActive) {
          isTaskActive = false;
          emit({ kind: 'end', source: this.id, at: Date.now() });
        }
      }, 4000);
    };

    try {
      if (fs.existsSync(claudeDir)) {
        watcher = fs.watch(claudeDir, { recursive: true }, (_eventType, filename) => {
          if (filename && filename.endsWith('.jsonl')) {
            onFileActivity();
          }
        });
        watcher.on('error', () => {
          // Ignore watch errors
        });
      }
    } catch (_e) {
      // Ignore if directory missing or watching fails
    }

    return {
      dispose: () => {
        if (quietTimer) {
          clearTimeout(quietTimer);
          quietTimer = undefined;
        }
        if (watcher) {
          try {
            watcher.close();
          } catch (_e) {
            // Ignore
          }
          watcher = undefined;
        }
        if (isTaskActive) {
          isTaskActive = false;
        }
      },
    };
  }
}
