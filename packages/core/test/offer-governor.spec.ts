import { describe, it, expect } from 'vitest';
import {
  canOffer,
  recordOffer,
  recordIgnore,
  recordComplete,
  createOfferState,
} from '../src/offer-governor.js';
import type { OfferContext } from '../src/offer-governor.js';
import type { OfferState } from '../src/types.js';

// ── Helpers ─────────────────────────────────────────────────────────

const NOW = 1_700_000_000_000;

function baseContext(overrides: Partial<OfferContext> = {}): OfferContext {
  return {
    taskRunningMs: 30_000,       // > 25s
    lastKeystrokeTs: NOW - 10_000, // > 4s ago
    isQuickPickOpen: false,
    isInputBoxOpen: false,
    isModalOpen: false,
    isDebuggerPaused: false,
    isZenMode: false,
    isWindowFocused: true,
    isDND: false,
    windowFocusedTs: NOW - 300_000, // > 90s ago
    ...overrides,
  };
}

function freshState(overrides: Partial<OfferState> = {}): OfferState {
  return {
    ...createOfferState(),
    ...overrides,
  };
}

// ── Hard caps ───────────────────────────────────────────────────────

describe('hard caps', () => {
  it('rejects when task running < 25s', () => {
    const result = canOffer(
      freshState(),
      NOW,
      baseContext({ taskRunningMs: 20_000 }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('25s');
  });

  it('rejects when last offer was < 20min ago', () => {
    const state = freshState({ lastOfferTs: NOW - 10 * 60 * 1000 }); // 10 min ago
    const result = canOffer(state, NOW, baseContext());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('20min');
  });

  it('rejects when 4 offers already made today', () => {
    const state = freshState({ offersToday: 4 });
    const result = canOffer(state, NOW, baseContext());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('daily');
  });

  it('rejects within 90s of window focus', () => {
    const result = canOffer(
      freshState(),
      NOW,
      baseContext({ windowFocusedTs: NOW - 30_000 }), // 30s ago
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('90s');
  });

  it('allows when all hard caps pass', () => {
    const result = canOffer(freshState(), NOW, baseContext());
    expect(result.allowed).toBe(true);
  });
});

// ── Suppression conditions ──────────────────────────────────────────

describe('suppression conditions', () => {
  it('suppresses on recent keystroke (< 4s)', () => {
    const result = canOffer(
      freshState(),
      NOW,
      baseContext({ lastKeystrokeTs: NOW - 2_000 }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('keystroke');
  });

  it('suppresses when quick-pick is open', () => {
    const result = canOffer(
      freshState(),
      NOW,
      baseContext({ isQuickPickOpen: true }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('quick-pick');
  });

  it('suppresses when input box is open', () => {
    const result = canOffer(
      freshState(),
      NOW,
      baseContext({ isInputBoxOpen: true }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('input box');
  });

  it('suppresses when modal is open', () => {
    const result = canOffer(
      freshState(),
      NOW,
      baseContext({ isModalOpen: true }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('modal');
  });

  it('suppresses when debugger is paused', () => {
    const result = canOffer(
      freshState(),
      NOW,
      baseContext({ isDebuggerPaused: true }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('debugger');
  });

  it('suppresses in zen mode', () => {
    const result = canOffer(
      freshState(),
      NOW,
      baseContext({ isZenMode: true }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('zen');
  });

  it('suppresses when window not focused', () => {
    const result = canOffer(
      freshState(),
      NOW,
      baseContext({ isWindowFocused: false }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not focused');
  });

  it('suppresses when DND is enabled', () => {
    const result = canOffer(
      freshState(),
      NOW,
      baseContext({ isDND: true }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('disturb');
  });

  it('suppresses when drill completed within last 10min', () => {
    const state = freshState({ lastCompletedRunTs: NOW - 5 * 60 * 1000 }); // 5 min ago
    const result = canOffer(state, NOW, baseContext());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('10min');
  });
});

// ── Earned appearances ──────────────────────────────────────────────

describe('earned appearances', () => {
  it('stops offering after 3 consecutive ignores', () => {
    const state = freshState({ consecutiveIgnores: 3 });
    const result = canOffer(state, NOW, baseContext());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('three consecutive');
  });

  it('allows offering with 2 consecutive ignores', () => {
    const state = freshState({ consecutiveIgnores: 2 });
    const result = canOffer(state, NOW, baseContext());
    expect(result.allowed).toBe(true);
  });
});

// ── State mutations ─────────────────────────────────────────────────

describe('recordOffer', () => {
  it('updates lastOfferTs and increments offersToday', () => {
    const state = freshState();
    const updated = recordOffer(state, NOW);
    expect(updated.lastOfferTs).toBe(NOW);
    expect(updated.offersToday).toBe(1);
  });
});

describe('recordIgnore', () => {
  it('increments consecutiveIgnores', () => {
    const state = freshState({ consecutiveIgnores: 1 });
    const updated = recordIgnore(state);
    expect(updated.consecutiveIgnores).toBe(2);
  });
});

describe('recordComplete', () => {
  it('resets consecutiveIgnores and marks session drill completed', () => {
    const state = freshState({ consecutiveIgnores: 2 });
    const updated = recordComplete(state, NOW);
    expect(updated.consecutiveIgnores).toBe(0);
    expect(updated.lastCompletedRunTs).toBe(NOW);
    expect(updated.lastDrillEndTs).toBe(NOW);
    expect(updated.sessionHadCompletedDrill).toBe(true);
  });
});

// ── Combined scenarios ──────────────────────────────────────────────

describe('combined scenarios', () => {
  it('full lifecycle: offer → ignore → offer → ignore → offer → ignore → blocked', () => {
    let state = freshState();

    // First offer
    const r1 = canOffer(state, NOW, baseContext());
    expect(r1.allowed).toBe(true);
    state = recordOffer(state, NOW);
    state = recordIgnore(state);

    // Second offer (20+ min later)
    const t2 = NOW + 21 * 60 * 1000;
    const r2 = canOffer(state, t2, baseContext({ windowFocusedTs: NOW }));
    expect(r2.allowed).toBe(true);
    state = recordOffer(state, t2);
    state = recordIgnore(state);

    // Third offer (20+ min later)
    const t3 = t2 + 21 * 60 * 1000;
    const r3 = canOffer(state, t3, baseContext({ windowFocusedTs: NOW }));
    expect(r3.allowed).toBe(true);
    state = recordOffer(state, t3);
    state = recordIgnore(state);

    // Fourth attempt — blocked by 3 consecutive ignores
    const t4 = t3 + 21 * 60 * 1000;
    const r4 = canOffer(state, t4, baseContext({ windowFocusedTs: NOW }));
    expect(r4.allowed).toBe(false);
    expect(r4.reason).toContain('three consecutive');
  });

  it('completing a drill resets ignore counter', () => {
    let state = freshState({ consecutiveIgnores: 2 });
    state = recordComplete(state, NOW);
    expect(state.consecutiveIgnores).toBe(0);

    const result = canOffer(
      state,
      NOW + 11 * 60 * 1000, // past 10-min suppress
      baseContext({ windowFocusedTs: NOW }),
    );
    expect(result.allowed).toBe(true);
  });
});
