import * as vscode from 'vscode';
import type { Signal } from './index';

/**
 * Feature-detect host-specific agent APIs at activation.
 * Checks for known agent extensions or globals without hard-coding assumptions.
 */
export function probeHostAgentApi(): Signal | null {
  try {
    // Check for Antigravity or other host extensions with agent state APIs
    const antigravityExt = vscode.extensions.getExtension('google.antigravity') ||
      vscode.extensions.getExtension('antigravity');

    if (antigravityExt && antigravityExt.exports && typeof antigravityExt.exports.onDidAgentStateChange === 'function') {
      return {
        id: 'host-api-antigravity',
        priority: 95,
        start(emit) {
          return antigravityExt.exports.onDidAgentStateChange((e: { state: string }) => {
            if (e.state === 'running') {
              emit({ kind: 'start', source: 'host-api-antigravity', at: Date.now() });
            } else if (e.state === 'idle') {
              emit({ kind: 'end', source: 'host-api-antigravity', at: Date.now() });
            }
          });
        },
      };
    }
  } catch (_e) {
    // Probing should never throw
  }

  return null;
}
