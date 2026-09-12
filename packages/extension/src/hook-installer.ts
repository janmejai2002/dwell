import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface InstallResult {
  success: boolean;
  backupPath?: string;
  error?: string;
}

export interface ClaudeHookConfig {
  type: 'command';
  command: string;
}

export interface ClaudeHookMatcherEntry {
  matcher?: string;
  hooks: ClaudeHookConfig[];
}

export interface ClaudeSettings {
  hooks?: Record<string, ClaudeHookMatcherEntry[]>;
  [key: string]: unknown;
}

/**
 * Get the default Claude settings path: ~/.claude/settings.json
 */
export function getDefaultSettingsPath(): string {
  const home = os.homedir();
  return path.join(home, '.claude', 'settings.json');
}

/**
 * Merge Dwell's hook entries into Claude settings content.
 * Returns the updated settings object.
 */
export function mergeHookConfig(
  existingSettings: ClaudeSettings,
  hookCjsPath: string,
): ClaudeSettings {
  const settings: ClaudeSettings = { ...existingSettings };
  if (!settings.hooks || typeof settings.hooks !== 'object') {
    settings.hooks = {};
  } else {
    // Shallow copy hooks map
    settings.hooks = { ...settings.hooks };
  }

  // Quote path if it contains spaces or backslashes
  const nodeCommand = (arg: string) => `node "${hookCjsPath}" ${arg}`;

  const targetEvents: Record<string, string> = {
    UserPromptSubmit: 'task-start',
    Stop: 'task-end',
    SubagentStop: 'task-end',
  };

  for (const [event, arg] of Object.entries(targetEvents)) {
    const cmd = nodeCommand(arg);
    const existingList = Array.isArray(settings.hooks[event])
      ? [...settings.hooks[event]]
      : [];

    // Check if this hook command is already registered
    const alreadyPresent = existingList.some((entry) =>
      entry.hooks && entry.hooks.some((h) => h.command && h.command.includes(hookCjsPath)),
    );

    if (!alreadyPresent) {
      existingList.push({
        hooks: [
          {
            type: 'command',
            command: cmd,
          },
        ],
      });
      settings.hooks[event] = existingList;
    }
  }

  return settings;
}

/**
 * Install the Dwell hook into Claude Code settings.
 *
 * Rules:
 * - Backs up settings.json to settings.json.bak.<timestamp> first.
 * - Merges without destroying existing hooks.
 * - Aborts cleanly if existing settings.json is malformed JSON.
 * - Creates ~/.claude directory if it does not exist.
 */
export function installClaudeHook(
  hookCjsPath: string,
  settingsPath: string = getDefaultSettingsPath(),
): InstallResult {
  try {
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let existingSettings: ClaudeSettings = {};

    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf8');
      if (raw.trim().length > 0) {
        try {
          existingSettings = JSON.parse(raw);
        } catch (_parseErr) {
          return {
            success: false,
            error: 'malformed_json: settings.json contains invalid JSON. Aborted without modifying.',
          };
        }
      }

      // Create backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${settingsPath}.bak.${timestamp}`;
      fs.copyFileSync(settingsPath, backupPath);

      const merged = mergeHookConfig(existingSettings, hookCjsPath);
      fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');

      return {
        success: true,
        backupPath,
      };
    } else {
      // File does not exist yet
      const merged = mergeHookConfig({}, hookCjsPath);
      fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
      return {
        success: true,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `io_error: ${msg}`,
    };
  }
}
