import type { RunResult } from './types.js';
import type { DrillState, KeystrokeEvent } from './engine.js';

// ── Clean stretch extraction ────────────────────────────────────────

interface CleanStretch {
  chars: number;
  startTs: number;
  endTs: number;
}

/**
 * Extract clean stretches from a keystroke sequence.
 *
 * A clean stretch is a consecutive run of keystrokes where:
 * - correct === true
 * - isCorrection === false
 *
 * A backspace (isCorrection) or incorrect keystroke ends the current stretch.
 * The next correct, non-correction keystroke starts a new stretch.
 */
function extractCleanStretches(keystrokes: KeystrokeEvent[]): CleanStretch[] {
  const stretches: CleanStretch[] = [];
  let currentChars = 0;
  let currentStartTs = 0;
  let currentEndTs = 0;

  for (const ks of keystrokes) {
    if (ks.correct && !ks.isCorrection) {
      // Part of a clean stretch
      if (currentChars === 0) {
        currentStartTs = ks.ts;
      }
      currentChars++;
      currentEndTs = ks.ts;
    } else {
      // Ends any current clean stretch
      if (currentChars > 0) {
        stretches.push({
          chars: currentChars,
          startTs: currentStartTs,
          endTs: currentEndTs,
        });
        currentChars = 0;
      }
    }
  }

  // Final stretch
  if (currentChars > 0) {
    stretches.push({
      chars: currentChars,
      startTs: currentStartTs,
      endTs: currentEndTs,
    });
  }

  return stretches;
}

// ── uWPM ────────────────────────────────────────────────────────────

/**
 * Compute unbroken words per minute.
 *
 * Gross WPM (chars/5 ÷ minutes) computed only over clean stretches.
 * A backspace (isCorrection) ends the current stretch; the next correct
 * keystroke starts a new one. Time inside corrections is excluded from
 * both numerator and denominator.
 *
 * Returns null if no clean stretch has ≥ 5 characters.
 */
export function computeUWPM(keystrokes: KeystrokeEvent[]): number | null {
  const stretches = extractCleanStretches(keystrokes);

  // Filter to stretches with ≥ 5 chars
  const qualifying = stretches.filter((s) => s.chars >= 5);
  if (qualifying.length === 0) return null;

  let totalChars = 0;
  let totalMs = 0;

  for (const s of qualifying) {
    totalChars += s.chars;
    totalMs += s.endTs - s.startTs;
  }

  // Edge case: if total time is 0 (e.g. all keystrokes at same timestamp)
  if (totalMs <= 0) return null;

  const totalMinutes = totalMs / 60_000;
  const words = totalChars / 5;

  return words / totalMinutes;
}

// ── Latency ─────────────────────────────────────────────────────────

/**
 * Milliseconds from drill prompt visible to first keystroke.
 */
export function computeLatency(
  startTs: number,
  firstKeystrokeTs: number,
): number {
  return firstKeystrokeTs - startTs;
}

// ── Longest clean run ───────────────────────────────────────────────

/**
 * Longest consecutive-correct keystroke count.
 * Counts only keystrokes that are correct and not corrections.
 */
export function computeLongestClean(keystrokes: KeystrokeEvent[]): number {
  let longest = 0;
  let current = 0;

  for (const ks of keystrokes) {
    if (ks.correct && !ks.isCorrection) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }

  return longest;
}

// ── Full run result ─────────────────────────────────────────────────

/**
 * Compute the complete RunResult from a finished drill state.
 */
export function computeRunResult(state: DrillState): RunResult {
  const { keystrokes, item, startTs } = state;

  const uWPM = computeUWPM(keystrokes);

  const firstKeystroke = keystrokes.length > 0 ? keystrokes[0] : null;
  const lastKeystroke =
    keystrokes.length > 0 ? keystrokes[keystrokes.length - 1] : null;

  const latencyMs =
    startTs !== null && firstKeystroke !== null
      ? computeLatency(startTs, firstKeystroke.ts)
      : null;

  const longestClean = computeLongestClean(keystrokes);

  const errors = keystrokes.filter((ks) => !ks.correct).length;

  const durationMs =
    firstKeystroke !== null && lastKeystroke !== null
      ? lastKeystroke.ts - firstKeystroke.ts
      : 0;

  const ts = lastKeystroke !== null ? lastKeystroke.ts : Date.now();

  return {
    tier: item.tier,
    uWPM,
    latencyMs,
    longestClean,
    errors,
    durationMs,
    ts,
  };
}
