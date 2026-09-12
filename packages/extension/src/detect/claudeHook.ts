import * as vscode from 'vscode';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import type { Signal, AgentEvent } from './index';

/**
 * Get the IPC socket path for the Claude Code hook.
 * POSIX: ${XDG_RUNTIME_DIR:-/tmp}/dwell-${uid}.sock
 * Windows: \\.\pipe\dwell-<username>
 */
export function getHookSocketPath(): string {
  if (process.platform === 'win32') {
    return '\\\\.\\pipe\\dwell-' + os.userInfo().username;
  }
  const runtimeDir = process.env.XDG_RUNTIME_DIR || '/tmp';
  return path.join(runtimeDir, `dwell-${process.getuid?.() ?? 1000}.sock`);
}

/**
 * Signal priority 100: IPC server receiving events directly from hook.cjs
 */
export class ClaudeHookSignal implements Signal {
  readonly id = 'claude-hook';
  readonly priority = 100;

  start(emit: (e: AgentEvent) => void): vscode.Disposable {
    const socketPath = getHookSocketPath();
    let server: net.Server | undefined;

    const cleanupSocket = () => {
      if (process.platform !== 'win32' && fs.existsSync(socketPath)) {
        try {
          fs.unlinkSync(socketPath);
        } catch (_e) {
          // Ignore
        }
      }
    };

    try {
      cleanupSocket();

      server = net.createServer((socket) => {
        let buffer = '';

        socket.on('data', (chunk) => {
          buffer += chunk.toString('utf8');
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const frame = JSON.parse(trimmed);
              if (frame && frame.v === 1) {
                if (frame.event === 'task-start') {
                  emit({ kind: 'start', source: this.id, at: frame.ts || Date.now() });
                } else if (frame.event === 'task-end') {
                  emit({ kind: 'end', source: this.id, at: frame.ts || Date.now() });
                }
              }
            } catch (_e) {
              // Ignore malformed frames
            }
          }
        });

        socket.on('error', () => {
          // Ignore client connection errors
        });
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          // Another window owns the socket; fall back silently to other signals
          server?.close();
          server = undefined;
        }
      });

      server.listen(socketPath);
    } catch (_e) {
      // Failed to bind; fallback to transcript watcher
    }

    return {
      dispose: () => {
        if (server) {
          try {
            server.close();
          } catch (_e) {
            // Ignore
          }
          server = undefined;
        }
        cleanupSocket();
      },
    };
  }
}
