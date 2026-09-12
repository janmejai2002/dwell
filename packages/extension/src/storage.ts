import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { DwellState } from './panel';

const RUNS_FILENAME = 'runs.json';
const RUNS_TMP = 'runs.json.tmp';
const MAX_RUNS = 500;
const FLUSH_DEBOUNCE_MS = 2000;

let flushTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Load persisted state from globalState and runs.json.
 */
export function loadState(context: vscode.ExtensionContext): DwellState {
  const tiers = context.globalState.get<Record<string, boolean>>('dwell.tiers') ?? {};
  const prefs = context.globalState.get<{ sound: boolean; dnd: boolean }>('dwell.prefs') ?? {
    sound: true,
    dnd: false,
  };

  let recentRuns: number[] = [];
  try {
    const runsPath = path.join(context.globalStorageUri.fsPath, RUNS_FILENAME);
    const raw = fs.readFileSync(runsPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      recentRuns = parsed.filter((v): v is number => typeof v === 'number');
    }
  } catch {
    // First run or corrupt file — start fresh
  }

  return { tiers, prefs, recentRuns };
}

/**
 * Persist state to globalState and runs.json.
 * Runs are written atomically (write tmp, then rename).
 * Debounced by 2 seconds; forced flush on explicit call.
 */
export function saveState(
  context: vscode.ExtensionContext,
  state: DwellState,
  force = false,
): void {
  // globalState is cheap and synchronous-ish
  void context.globalState.update('dwell.tiers', state.tiers);
  void context.globalState.update('dwell.prefs', state.prefs);

  // Debounce runs.json writes
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = undefined;
  }

  const writeRuns = (): void => {
    flushRuns(context, state.recentRuns);
  };

  if (force) {
    writeRuns();
  } else {
    flushTimer = setTimeout(writeRuns, FLUSH_DEBOUNCE_MS);
  }
}

/**
 * Atomic write of runs.json: write to tmp, then rename.
 */
function flushRuns(
  context: vscode.ExtensionContext,
  runs: number[],
): void {
  try {
    const dir = context.globalStorageUri.fsPath;

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const trimmed = runs.slice(-MAX_RUNS);
    const tmpPath = path.join(dir, RUNS_TMP);
    const finalPath = path.join(dir, RUNS_FILENAME);

    fs.writeFileSync(tmpPath, JSON.stringify(trimmed), 'utf-8');
    fs.renameSync(tmpPath, finalPath);
  } catch {
    // Storage write failed — not critical, continue
  }
}
