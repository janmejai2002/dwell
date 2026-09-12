import { describe, it, expect } from 'vitest';
import {
  TIERS,
  getTier,
  checkPass,
  initTierProgress,
  updateProgress,
} from '../src/tiers.js';
import type { RunResult, TierProgress } from '../src/types.js';

// ── Helpers ─────────────────────────────────────────────────────────

function makeResult(overrides: Partial<RunResult> = {}): RunResult {
  return {
    tier: 1,
    uWPM: 60,
    latencyMs: 500,
    longestClean: 50,
    errors: 0,
    durationMs: 30_000,
    ts: Date.now(),
    ...overrides,
  };
}

// ── TIERS constant ──────────────────────────────────────────────────

describe('TIERS', () => {
  it('has 6 tiers', () => {
    expect(TIERS).toHaveLength(6);
  });

  it('tier 1 is plain with target 55', () => {
    expect(TIERS[0]).toMatchObject({ level: 1, name: 'plain', targetUWPM: 55 });
  });

  it('tier 5 has no speed gate', () => {
    expect(TIERS[4]).toMatchObject({ level: 5, targetUWPM: 0 });
  });
});

// ── checkPass ───────────────────────────────────────────────────────

describe('checkPass', () => {
  it('passes when uWPM meets target and no errors', () => {
    const result = makeResult({ tier: 1, uWPM: 55, errors: 0, longestClean: 50 });
    expect(checkPass(result, getTier(1))).toBe(true);
  });

  it('fails when uWPM is below target', () => {
    const result = makeResult({ tier: 1, uWPM: 40, errors: 0, longestClean: 50 });
    expect(checkPass(result, getTier(1))).toBe(false);
  });

  it('fails when uWPM is null', () => {
    const result = makeResult({ tier: 1, uWPM: null, errors: 0, longestClean: 50 });
    expect(checkPass(result, getTier(1))).toBe(false);
  });

  it('passes tier 5 with zero errors regardless of speed', () => {
    const result = makeResult({ tier: 5, uWPM: 10, errors: 0, longestClean: 50 });
    expect(checkPass(result, getTier(5))).toBe(true);
  });

  it('fails tier 5 with any errors', () => {
    const result = makeResult({ tier: 5, uWPM: 80, errors: 1, longestClean: 50 });
    expect(checkPass(result, getTier(5))).toBe(false);
  });

  it('fails when error rate exceeds maximum', () => {
    // 2 errors out of longestClean(8) + errors(2) = 10 → 20% error rate, way above 2%
    const result = makeResult({ tier: 1, uWPM: 60, errors: 2, longestClean: 8 });
    expect(checkPass(result, getTier(1))).toBe(false);
  });
});

// ── initTierProgress ────────────────────────────────────────────────

describe('initTierProgress', () => {
  it('tier 1 starts unlocked', () => {
    const progress = initTierProgress(1);
    expect(progress.unlocked).toBe(true);
    expect(progress.consecutivePasses).toBe(0);
  });

  it('tier 2 starts locked', () => {
    const progress = initTierProgress(2);
    expect(progress.unlocked).toBe(false);
  });
});

// ── updateProgress ──────────────────────────────────────────────────

describe('updateProgress', () => {
  it('increments consecutive passes on pass', () => {
    const progress = initTierProgress(1);
    const result = makeResult({ uWPM: 60, errors: 0, longestClean: 50 });
    const updated = updateProgress(progress, result);
    expect(updated.consecutivePasses).toBe(1);
  });

  it('unlocks after 3 consecutive passes', () => {
    let progress: TierProgress = initTierProgress(2);
    const passingResult = makeResult({ tier: 2, uWPM: 60, errors: 0, longestClean: 50 });

    progress = updateProgress(progress, passingResult);
    expect(progress.unlocked).toBe(false);
    expect(progress.consecutivePasses).toBe(1);

    progress = updateProgress(progress, passingResult);
    expect(progress.unlocked).toBe(false);
    expect(progress.consecutivePasses).toBe(2);

    progress = updateProgress(progress, passingResult);
    expect(progress.unlocked).toBe(true);
    expect(progress.consecutivePasses).toBe(3);
  });

  it('resets consecutive count on failure', () => {
    let progress: TierProgress = initTierProgress(2);
    const passingResult = makeResult({ tier: 2, uWPM: 60, errors: 0, longestClean: 50 });
    const failingResult = makeResult({ tier: 2, uWPM: 30, errors: 0, longestClean: 50 });

    progress = updateProgress(progress, passingResult);
    progress = updateProgress(progress, passingResult);
    expect(progress.consecutivePasses).toBe(2);

    progress = updateProgress(progress, failingResult);
    expect(progress.consecutivePasses).toBe(0);
    expect(progress.unlocked).toBe(false);
  });

  it('never re-locks a tier', () => {
    let progress: TierProgress = initTierProgress(2);
    const passingResult = makeResult({ tier: 2, uWPM: 60, errors: 0, longestClean: 50 });
    const failingResult = makeResult({ tier: 2, uWPM: 10, errors: 5, longestClean: 5 });

    // Unlock it
    progress = updateProgress(progress, passingResult);
    progress = updateProgress(progress, passingResult);
    progress = updateProgress(progress, passingResult);
    expect(progress.unlocked).toBe(true);

    // Fail multiple times — stays unlocked
    progress = updateProgress(progress, failingResult);
    expect(progress.unlocked).toBe(true);
    expect(progress.consecutivePasses).toBe(0);

    progress = updateProgress(progress, failingResult);
    expect(progress.unlocked).toBe(true);
  });

  it('tracks bestUWPM regardless of pass/fail', () => {
    let progress: TierProgress = initTierProgress(1);
    progress = updateProgress(progress, makeResult({ uWPM: 45 }));
    expect(progress.bestUWPM).toBe(45);

    progress = updateProgress(progress, makeResult({ uWPM: 70 }));
    expect(progress.bestUWPM).toBe(70);

    // Lower score doesn't replace best
    progress = updateProgress(progress, makeResult({ uWPM: 50 }));
    expect(progress.bestUWPM).toBe(70);
  });

  it('keeps bestUWPM null when uWPM is always null', () => {
    let progress: TierProgress = initTierProgress(1);
    progress = updateProgress(progress, makeResult({ uWPM: null }));
    expect(progress.bestUWPM).toBeNull();
  });

  it('tier 1 is always accessible (starts unlocked)', () => {
    const progress = initTierProgress(1);
    expect(progress.unlocked).toBe(true);

    // Even after failures
    const updated = updateProgress(
      progress,
      makeResult({ uWPM: 10, errors: 10, longestClean: 5 }),
    );
    expect(updated.unlocked).toBe(true);
  });
});
