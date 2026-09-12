import type { OfferState } from './types.js';

// ── Offer context ───────────────────────────────────────────────────

export interface OfferContext {
  /** How long the current agent task has been running, in ms. */
  taskRunningMs: number;
  /** Timestamp of the most recent keystroke in the editor. */
  lastKeystrokeTs: number;
  /** Whether a quick-pick dropdown is currently open. */
  isQuickPickOpen: boolean;
  /** Whether an input box is currently open. */
  isInputBoxOpen: boolean;
  /** Whether a modal dialog is currently open. */
  isModalOpen: boolean;
  /** Whether the debugger is paused at a breakpoint. */
  isDebuggerPaused: boolean;
  /** Whether Zen mode is active. */
  isZenMode: boolean;
  /** Whether the editor window is focused. */
  isWindowFocused: boolean;
  /** Whether the user has enabled Do Not Disturb. */
  isDND: boolean;
  /** Timestamp when the window last gained focus. */
  windowFocusedTs: number;
}

// ── Constants ───────────────────────────────────────────────────────

/** Minimum agent task runtime before an offer, in ms. */
const T_ARM_MS = 25_000;

/** Minimum wall-clock gap between offers, in ms. */
const OFFER_COOLDOWN_MS = 20 * 60 * 1_000; // 20 minutes

/** Maximum offers per calendar day. */
const MAX_OFFERS_PER_DAY = 4;

/** Suppress if keystroke within this window, in ms. */
const KEYSTROKE_SUPPRESS_MS = 4_000;

/** Suppress in first N ms after window regains focus. */
const FOCUS_GRACE_MS = 90_000; // 90 seconds

/** Suppress if a drill was completed within this window, in ms. */
const DRILL_COMPLETE_SUPPRESS_MS = 10 * 60 * 1_000; // 10 minutes

/** Consecutive ignores that disable auto-offers for the session. */
const MAX_CONSECUTIVE_IGNORES = 3;

// ── Core decision ───────────────────────────────────────────────────

export interface OfferDecision {
  allowed: boolean;
  reason: string;
}

/**
 * Determine whether Dwell may offer a drill right now.
 *
 * Implements all hard caps and suppression conditions from SPEC §3.
 */
export function canOffer(
  state: OfferState,
  now: number,
  context: OfferContext,
): OfferDecision {
  // ── Hard caps ───────────────────────────────────────────────────

  // 1. T_arm = 25s — no offer before the agent task has run 25 seconds
  if (context.taskRunningMs < T_ARM_MS) {
    return { allowed: false, reason: 'task running less than 25s' };
  }

  // 2. One offer per 20 minutes of wall clock
  if (state.lastOfferTs > 0 && now - state.lastOfferTs < OFFER_COOLDOWN_MS) {
    return { allowed: false, reason: 'less than 20min since last offer' };
  }

  // 3. Four offers per calendar day
  if (state.offersToday >= MAX_OFFERS_PER_DAY) {
    return { allowed: false, reason: 'daily offer limit reached (4)' };
  }

  // 4. Zero offers in first 90s after window regains focus
  if (
    context.windowFocusedTs > 0 &&
    now - context.windowFocusedTs < FOCUS_GRACE_MS
  ) {
    return { allowed: false, reason: 'within 90s of window focus' };
  }

  // ── Suppression conditions ────────────────────────────────────

  // Keystroke in last 4s
  if (
    context.lastKeystrokeTs > 0 &&
    now - context.lastKeystrokeTs < KEYSTROKE_SUPPRESS_MS
  ) {
    return { allowed: false, reason: 'keystroke within last 4s' };
  }

  // Quick-pick, input box, or modal open
  if (context.isQuickPickOpen) {
    return { allowed: false, reason: 'quick-pick is open' };
  }
  if (context.isInputBoxOpen) {
    return { allowed: false, reason: 'input box is open' };
  }
  if (context.isModalOpen) {
    return { allowed: false, reason: 'modal is open' };
  }

  // Debugger paused
  if (context.isDebuggerPaused) {
    return { allowed: false, reason: 'debugger is paused' };
  }

  // Zen mode
  if (context.isZenMode) {
    return { allowed: false, reason: 'zen mode is active' };
  }

  // Window not focused
  if (!context.isWindowFocused) {
    return { allowed: false, reason: 'window is not focused' };
  }

  // Do Not Disturb
  if (context.isDND) {
    return { allowed: false, reason: 'do not disturb is enabled' };
  }

  // Drill completed in last 10 minutes
  if (
    state.lastCompletedRunTs > 0 &&
    now - state.lastCompletedRunTs < DRILL_COMPLETE_SUPPRESS_MS
  ) {
    return { allowed: false, reason: 'drill completed within last 10min' };
  }

  // ── Earned appearances ────────────────────────────────────────

  // Three consecutive ignores → offers stop for the session
  if (state.consecutiveIgnores >= MAX_CONSECUTIVE_IGNORES) {
    return {
      allowed: false,
      reason: 'three consecutive ignores, hotkey-only until invoked',
    };
  }

  // After first run, offer budget refills only if:
  // - previous session ended with a completed drill, OR
  // - 24 hours have passed since the last drill ended
  // Two sessions of being ignored → hotkey-only until self-invoked
  //
  // This is handled by the consecutiveIgnores check above. The
  // "previous session" and "24 hours" logic is session-level and
  // managed by the caller resetting OfferState between sessions.
  // Here we check the per-session constraint.

  return { allowed: true, reason: 'all checks passed' };
}

// ── State mutations ─────────────────────────────────────────────────

/** Record that an offer was shown. */
export function recordOffer(state: OfferState, ts: number): OfferState {
  return {
    ...state,
    lastOfferTs: ts,
    offersToday: state.offersToday + 1,
  };
}

/** Record that the user ignored an offer. */
export function recordIgnore(state: OfferState): OfferState {
  return {
    ...state,
    consecutiveIgnores: state.consecutiveIgnores + 1,
  };
}

/** Record that the user completed a drill. */
export function recordComplete(state: OfferState, ts: number): OfferState {
  return {
    ...state,
    lastCompletedRunTs: ts,
    lastDrillEndTs: ts,
    consecutiveIgnores: 0,
    sessionHadCompletedDrill: true,
  };
}

// ── Initial state factory ───────────────────────────────────────────

/** Create a fresh OfferState for a new session. */
export function createOfferState(): OfferState {
  return {
    lastOfferTs: 0,
    offersToday: 0,
    consecutiveIgnores: 0,
    lastCompletedRunTs: 0,
    lastDrillEndTs: 0,
    sessionHadCompletedDrill: false,
  };
}
