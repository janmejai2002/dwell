import type { DrillItem, GlyphInfo, GlyphState } from './types.js';

// ── Keystroke event ─────────────────────────────────────────────────

export interface KeystrokeEvent {
  char: string;
  ts: number;
  correct: boolean;
  isCorrection: boolean;
}

// ── Drill state ─────────────────────────────────────────────────────

export interface DrillState {
  item: DrillItem;
  glyphs: GlyphInfo[];
  cursor: number;
  started: boolean;
  startTs: number | null;
  keystrokes: KeystrokeEvent[];
  done: boolean;
}

// ── Initialiser ─────────────────────────────────────────────────────

/**
 * Create a fresh drill state from a corpus item.
 * Every character in the item's text becomes a pending glyph.
 */
export function loadDrill(item: DrillItem): DrillState {
  const glyphs: GlyphInfo[] = Array.from(item.text).map((char, index) => ({
    char,
    state: 'pending' as GlyphState,
    index,
  }));

  return {
    item,
    glyphs,
    cursor: 0,
    started: false,
    startTs: null,
    keystrokes: [],
    done: false,
  };
}

// ── Keystroke processing (immutable reducer) ────────────────────────

/**
 * Process a single character keystroke. Returns a new state object.
 *
 * - If the drill is already done, returns state unchanged.
 * - If the typed char matches the expected glyph, mark it 'struck' and advance.
 * - If it doesn't match, mark the current glyph 'missed' and do NOT advance.
 *   The cursor stays on the missed glyph; the user must backspace to correct.
 */
export function processKeystroke(
  state: DrillState,
  char: string,
  ts: number,
): DrillState {
  if (state.done) return state;
  if (state.cursor >= state.glyphs.length) return state;

  const glyph = state.glyphs[state.cursor];
  const correct = char === glyph.char;

  const newGlyphs = state.glyphs.slice();

  // Determine whether this keystroke is part of a correction sequence.
  // A correction keystroke is one where the current glyph was previously
  // missed (and has been backspaced to 'corrected'), meaning we're re-typing it.
  const isCorrection = glyph.state === 'corrected';

  if (correct) {
    newGlyphs[state.cursor] = {
      ...glyph,
      state: isCorrection ? 'corrected' : 'struck',
    };
  } else {
    newGlyphs[state.cursor] = { ...glyph, state: 'missed' };
  }

  const newKeystroke: KeystrokeEvent = {
    char,
    ts,
    correct,
    isCorrection,
  };

  const newKeystrokes = [...state.keystrokes, newKeystroke];
  const newCursor = correct ? state.cursor + 1 : state.cursor;
  const newDone = correct && newCursor >= state.glyphs.length;

  return {
    item: state.item,
    glyphs: newGlyphs,
    cursor: newCursor,
    started: true,
    startTs: state.startTs ?? ts,
    keystrokes: newKeystrokes,
    done: newDone,
  };
}

// ── Backspace processing ────────────────────────────────────────────

/**
 * Process a backspace. Returns a new state object.
 *
 * - Cannot backspace past position 0.
 * - If the current glyph is 'missed', mark it 'corrected' (scar). Cursor stays.
 * - Otherwise, move cursor back one position and revert that glyph to 'pending'.
 *
 * A 'corrected' glyph is a scar: it records that an error happened here,
 * even after the user fixes it. The glyph will stay 'corrected' (not 'struck')
 * when re-typed correctly, so the scoring system can distinguish clean from scarred.
 */
export function processBackspace(state: DrillState, ts: number): DrillState {
  if (state.done) return state;

  const newGlyphs = state.glyphs.slice();

  // If current glyph is missed, mark it corrected (scar) — cursor stays
  if (state.cursor < state.glyphs.length && state.glyphs[state.cursor].state === 'missed') {
    newGlyphs[state.cursor] = {
      ...state.glyphs[state.cursor],
      state: 'corrected',
    };

    const newKeystroke: KeystrokeEvent = {
      char: '\b',
      ts,
      correct: false,
      isCorrection: true,
    };

    return {
      ...state,
      glyphs: newGlyphs,
      keystrokes: [...state.keystrokes, newKeystroke],
    };
  }

  // Otherwise, move cursor back and revert previous glyph to pending
  if (state.cursor === 0) return state;

  const prevIndex = state.cursor - 1;
  const prevGlyph = state.glyphs[prevIndex];

  // Revert the previous glyph to pending
  newGlyphs[prevIndex] = { ...prevGlyph, state: 'pending' };

  const newKeystroke: KeystrokeEvent = {
    char: '\b',
    ts,
    correct: false,
    isCorrection: true,
  };

  return {
    ...state,
    glyphs: newGlyphs,
    cursor: prevIndex,
    keystrokes: [...state.keystrokes, newKeystroke],
  };
}

// ── Completion check ────────────────────────────────────────────────

/** Returns true when every glyph has been typed (correctly or via correction). */
export function isDrillComplete(state: DrillState): boolean {
  return state.done;
}
