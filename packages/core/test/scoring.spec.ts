import { describe, it, expect } from 'vitest';
import {
  computeUWPM,
  computeLatency,
  computeLongestClean,
  computeRunResult,
} from '../src/scoring.js';
import { loadDrill, processKeystroke, processBackspace } from '../src/engine.js';
import type { KeystrokeEvent } from '../src/engine.js';
import type { DrillItem } from '../src/types.js';

// ── Helper ──────────────────────────────────────────────────────────

function makeCleanKeystrokes(count: number, startTs: number, intervalMs: number): KeystrokeEvent[] {
  const ks: KeystrokeEvent[] = [];
  for (let i = 0; i < count; i++) {
    ks.push({
      char: 'a',
      ts: startTs + i * intervalMs,
      correct: true,
      isCorrection: false,
    });
  }
  return ks;
}

// ── uWPM ────────────────────────────────────────────────────────────

describe('computeUWPM', () => {
  it('returns null when no clean stretch has >= 5 chars', () => {
    // 4 clean chars, then a correction
    const ks: KeystrokeEvent[] = [
      ...makeCleanKeystrokes(4, 0, 100),
      { char: '\b', ts: 400, correct: false, isCorrection: true },
    ];
    expect(computeUWPM(ks)).toBeNull();
  });

  it('computes WPM over a single clean stretch', () => {
    // 10 chars over 2 seconds = 10/5 / (2/60) = 2 / 0.03333 = 60 WPM
    const ks = makeCleanKeystrokes(10, 0, 200);
    // Duration: 9 * 200 = 1800ms
    // chars/5 = 2, minutes = 1.8/60 = 0.03
    // WPM = 2 / 0.03 = 66.67
    const result = computeUWPM(ks);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(66.67, 1);
  });

  it('excludes correction time from calculation', () => {
    // 6 clean chars (0-500ms), then correction at 600ms, then 6 more clean (1000-1500ms)
    const ks: KeystrokeEvent[] = [
      ...makeCleanKeystrokes(6, 0, 100),      // 0-500ms, 6 chars clean
      { char: '\b', ts: 600, correct: false, isCorrection: true },
      ...makeCleanKeystrokes(6, 1000, 100),   // 1000-1500ms, 6 chars clean
    ];

    const result = computeUWPM(ks);
    expect(result).not.toBeNull();

    // Stretch 1: 6 chars, 500ms
    // Stretch 2: 6 chars, 500ms
    // Total: 12 chars, 1000ms
    // WPM = (12/5) / (1000/60000) = 2.4 / 0.01667 = 144
    expect(result!).toBeCloseTo(144, 0);
  });

  it('only counts stretches >= 5 chars', () => {
    // 3 clean (too short), correction, 7 clean
    const ks: KeystrokeEvent[] = [
      ...makeCleanKeystrokes(3, 0, 100),       // 3 chars — excluded
      { char: '\b', ts: 300, correct: false, isCorrection: true },
      ...makeCleanKeystrokes(7, 1000, 100),    // 7 chars — included
    ];

    const result = computeUWPM(ks);
    expect(result).not.toBeNull();

    // Only stretch 2: 7 chars, 600ms
    // WPM = (7/5) / (600/60000) = 1.4 / 0.01 = 140
    expect(result!).toBeCloseTo(140, 0);
  });

  it('returns null for empty keystrokes', () => {
    expect(computeUWPM([])).toBeNull();
  });

  it('returns null when all keystrokes at same timestamp', () => {
    const ks = makeCleanKeystrokes(10, 0, 0);
    expect(computeUWPM(ks)).toBeNull();
  });
});

// ── Latency ─────────────────────────────────────────────────────────

describe('computeLatency', () => {
  it('computes ms from start to first keystroke', () => {
    expect(computeLatency(1000, 1500)).toBe(500);
  });

  it('returns 0 when start equals first keystroke', () => {
    expect(computeLatency(1000, 1000)).toBe(0);
  });
});

// ── Longest clean ───────────────────────────────────────────────────

describe('computeLongestClean', () => {
  it('returns 0 for empty keystrokes', () => {
    expect(computeLongestClean([])).toBe(0);
  });

  it('counts longest consecutive correct, non-correction stretch', () => {
    const ks: KeystrokeEvent[] = [
      ...makeCleanKeystrokes(3, 0, 100),
      { char: '\b', ts: 300, correct: false, isCorrection: true },
      ...makeCleanKeystrokes(5, 400, 100),
      { char: 'x', ts: 900, correct: false, isCorrection: false },
      ...makeCleanKeystrokes(2, 1000, 100),
    ];
    expect(computeLongestClean(ks)).toBe(5);
  });

  it('handles all-correct keystrokes', () => {
    const ks = makeCleanKeystrokes(10, 0, 100);
    expect(computeLongestClean(ks)).toBe(10);
  });
});

// ── Full run result ─────────────────────────────────────────────────

describe('computeRunResult', () => {
  it('computes a complete result from a finished drill', () => {
    const item: DrillItem = { id: 'test-1', tier: 1, text: 'hello world' };
    let state = loadDrill(item);
    const base = 1000;
    for (let i = 0; i < item.text.length; i++) {
      state = processKeystroke(state, item.text[i], base + i * 100);
    }

    const result = computeRunResult(state);
    expect(result.tier).toBe(1);
    expect(result.uWPM).not.toBeNull();
    expect(result.latencyMs).toBe(0); // startTs === first keystroke ts
    expect(result.longestClean).toBe(item.text.length);
    expect(result.errors).toBe(0);
  });

  it('returns null uWPM when drill abandoned with < 5 clean chars', () => {
    const item: DrillItem = { id: 'test-2', tier: 1, text: 'abcde' };
    let state = loadDrill(item);
    state = processKeystroke(state, 'a', 100);
    state = processKeystroke(state, 'b', 200);
    state = processKeystroke(state, 'x', 300); // miss

    const result = computeRunResult(state);
    expect(result.uWPM).toBeNull(); // only 2 clean chars
  });

  it('counts errors from incorrect keystrokes', () => {
    const item: DrillItem = { id: 'test-3', tier: 1, text: 'ab' };
    let state = loadDrill(item);
    state = processKeystroke(state, 'x', 100); // miss
    state = processBackspace(state, 150);       // correct
    state = processKeystroke(state, 'a', 200);  // re-type correctly
    state = processKeystroke(state, 'b', 300);  // finish

    const result = computeRunResult(state);
    // 'x' miss + backspace (both !correct)
    expect(result.errors).toBe(2);
  });
});
