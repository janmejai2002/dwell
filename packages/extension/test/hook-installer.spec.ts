import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { installClaudeHook, mergeHookConfig } from '../src/hook-installer';

describe('hook-installer', () => {
  let tmpDir: string;
  let settingsFile: string;
  const dummyHookPath = 'C:\\fake\\path\\to\\hook.cjs';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dwell-hook-test-'));
    settingsFile = path.join(tmpDir, 'settings.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('merges into empty settings object', () => {
    const res = mergeHookConfig({}, dummyHookPath);
    expect(res.hooks).toBeDefined();
    expect(res.hooks?.['UserPromptSubmit']).toHaveLength(1);
    expect(res.hooks?.['Stop']).toHaveLength(1);
    expect(res.hooks?.['SubagentStop']).toHaveLength(1);
    expect(res.hooks?.['UserPromptSubmit']?.[0]?.hooks[0]?.command).toContain('task-start');
    expect(res.hooks?.['Stop']?.[0]?.hooks[0]?.command).toContain('task-end');
  });

  it('merges into existing hooks without destroying them', () => {
    const existing = {
      theme: 'dark',
      hooks: {
        SessionStart: [
          {
            hooks: [{ type: 'command' as const, command: 'python log_start.py' }],
          },
        ],
        UserPromptSubmit: [
          {
            hooks: [{ type: 'command' as const, command: 'echo "prompt submitted"' }],
          },
        ],
      },
    };

    const res = mergeHookConfig(existing, dummyHookPath);
    expect(res.theme).toBe('dark');
    expect(res.hooks?.['SessionStart']).toHaveLength(1);
    expect(res.hooks?.['SessionStart']?.[0]?.hooks[0]?.command).toBe('python log_start.py');
    // UserPromptSubmit should now have 2 hooks (the existing one and Dwell's)
    expect(res.hooks?.['UserPromptSubmit']).toHaveLength(2);
    expect(res.hooks?.['UserPromptSubmit']?.[0]?.hooks[0]?.command).toBe('echo "prompt submitted"');
    expect(res.hooks?.['UserPromptSubmit']?.[1]?.hooks[0]?.command).toContain('task-start');
  });

  it('is idempotent and does not duplicate Dwell hook', () => {
    const once = mergeHookConfig({}, dummyHookPath);
    const twice = mergeHookConfig(once, dummyHookPath);
    expect(twice.hooks?.['UserPromptSubmit']).toHaveLength(1);
    expect(twice.hooks?.['Stop']).toHaveLength(1);
  });

  it('creates new settings file when none exists', () => {
    const result = installClaudeHook(dummyHookPath, settingsFile);
    expect(result.success).toBe(true);
    expect(fs.existsSync(settingsFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    expect(content.hooks['UserPromptSubmit']).toBeDefined();
  });

  it('backs up existing settings file before modifying', () => {
    const initial = { existingKey: 'preserved', hooks: {} };
    fs.writeFileSync(settingsFile, JSON.stringify(initial), 'utf8');

    const result = installClaudeHook(dummyHookPath, settingsFile);
    expect(result.success).toBe(true);
    expect(result.backupPath).toBeDefined();
    expect(fs.existsSync(result.backupPath!)).toBe(true);

    const backupContent = JSON.parse(fs.readFileSync(result.backupPath!, 'utf8'));
    expect(backupContent.existingKey).toBe('preserved');

    const modifiedContent = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    expect(modifiedContent.existingKey).toBe('preserved');
    expect(modifiedContent.hooks['UserPromptSubmit']).toBeDefined();
  });

  it('aborts cleanly and creates no backup on malformed JSON', () => {
    const malformed = '{ invalid json "key": not allowed }';
    fs.writeFileSync(settingsFile, malformed, 'utf8');

    const result = installClaudeHook(dummyHookPath, settingsFile);
    expect(result.success).toBe(false);
    expect(result.error).toContain('malformed_json');

    // Verify file was NOT modified
    const current = fs.readFileSync(settingsFile, 'utf8');
    expect(current).toBe(malformed);

    // Verify no backup files were created in directory
    const files = fs.readdirSync(tmpDir);
    expect(files).toEqual(['settings.json']);
  });
});
