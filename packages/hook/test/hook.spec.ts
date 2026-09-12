import { describe, it, expect } from 'vitest';
import { execFile } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK_PATH = resolve(__dirname, '..', 'hook.cjs');
const NODE = process.execPath;

/**
 * Run hook.cjs with given stdin and args.
 * Returns { code, stdout, stderr }.
 */
function runHook(
  stdin: string,
  args: string[] = [],
  env: Record<string, string> = {},
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = execFile(
      NODE,
      [HOOK_PATH, ...args],
      {
        timeout: 5000,
        env: { ...process.env, ...env },
      },
      (error, stdout, stderr) => {
        resolve({
          code: error ? error.code ?? null : 0,
          stdout: stdout ?? '',
          stderr: stderr ?? '',
        });
      },
    );

    if (stdin) {
      child.stdin?.write(stdin);
    }
    child.stdin?.end();
  });
}

describe('hook.cjs', () => {
  it('exits 0 with no listener', async () => {
    const result = await runHook(
      JSON.stringify({ session_id: 'test-123', hook_event_name: 'Stop' }),
      ['task-end'],
    );
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('exits 0 with malformed payload', async () => {
    const result = await runHook('not valid json at all', ['task-start']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('exits 0 with closed stdin', async () => {
    const result = await runHook('', ['task-start']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('exits 0 with empty input', async () => {
    const result = await runHook('   ', ['task-start']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('exits 0 with unwritable socket path', async () => {
    const badPath = process.platform === 'win32'
      ? '\\\\.\\pipe\\nonexistent\\subpath\\dwell.sock'
      : '/proc/invalid/dwell.sock';
    const result = await runHook(
      JSON.stringify({ session_id: 'test-unwritable', hook_event_name: 'UserPromptSubmit' }),
      ['task-start'],
      { DWELL_SOCKET_PATH: badPath },
    );
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });
});
