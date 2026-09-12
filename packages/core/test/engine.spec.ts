import { describe, it, expect } from 'vitest';
import {
  loadDrill,
  processKeystroke,
  processBackspace,
  isDrillComplete,
} from '../src/engine.js';
import type { DrillItem } from '../src/types.js';

const ITEM: DrillItem = { id: 'test-1', tier: 1, text: 'abc' };

describe('loadDrill', () => {
  it('creates glyphs from item text', () => {
    const state = loadDrill(ITEM);
    expect(state.glyphs).toHaveLength(3);
    expect(state.glyphs[0]).toEqual({ char: 'a', state: 'pending', index: 0 });
    expect(state.glyphs[1]).toEqual({ char: 'b', state: 'pending', index: 1 });
    expect(state.glyphs[2]).toEqual({ char: 'c', state: 'pending', index: 2 });
  });

  it('initialises with cursor at 0, not started, not done', () => {
    const state = loadDrill(ITEM);
    expect(state.cursor).toBe(0);
    expect(state.started).toBe(false);
    expect(state.startTs).toBeNull();
    expect(state.done).toBe(false);
    expect(state.keystrokes).toHaveLength(0);
  });
});

describe('processKeystroke', () => {
  it('advances cursor on correct character', () => {
    let state = loadDrill(ITEM);
    state = processKeystroke(state, 'a', 100);
    expect(state.cursor).toBe(1);
    expect(state.glyphs[0].state).toBe('struck');
    expect(state.started).toBe(true);
    expect(state.startTs).toBe(100);
  });

  it('marks glyph missed on incorrect character and does NOT advance', () => {
    let state = loadDrill(ITEM);
    state = processKeystroke(state, 'x', 100);
    expect(state.cursor).toBe(0);
    expect(state.glyphs[0].state).toBe('missed');
  });

  it('records keystrokes with correct flag', () => {
    let state = loadDrill(ITEM);
    state = processKeystroke(state, 'a', 100);
    state = processKeystroke(state, 'x', 200);
    expect(state.keystrokes).toHaveLength(2);
    expect(state.keystrokes[0].correct).toBe(true);
    expect(state.keystrokes[1].correct).toBe(false);
  });

  it('completes drill when all glyphs typed correctly', () => {
    let state = loadDrill(ITEM);
    state = processKeystroke(state, 'a', 100);
    state = processKeystroke(state, 'b', 200);
    state = processKeystroke(state, 'c', 300);
    expect(state.done).toBe(true);
    expect(isDrillComplete(state)).toBe(true);
  });

  it('does nothing when drill is already complete', () => {
    let state = loadDrill(ITEM);
    state = processKeystroke(state, 'a', 100);
    state = processKeystroke(state, 'b', 200);
    state = processKeystroke(state, 'c', 300);
    const final = processKeystroke(state, 'd', 400);
    expect(final).toBe(state);
  });

  it('preserves startTs on subsequent keystrokes', () => {
    let state = loadDrill(ITEM);
    state = processKeystroke(state, 'a', 100);
    state = processKeystroke(state, 'b', 200);
    expect(state.startTs).toBe(100);
  });

  it('marks re-typed corrected glyph as corrected (scar), not struck', () => {
    let state = loadDrill(ITEM);
    // Miss 'a', backspace, then re-type 'a'
    state = processKeystroke(state, 'x', 100); // miss
    state = processBackspace(state, 150); // mark corrected
    state = processKeystroke(state, 'a', 200); // re-type correctly
    expect(state.glyphs[0].state).toBe('corrected');
    expect(state.cursor).toBe(1);
  });
});

describe('processBackspace', () => {
  it('does nothing at position 0 with pending glyph', () => {
    const state = loadDrill(ITEM);
    const result = processBackspace(state, 100);
    expect(result).toBe(state);
  });

  it('marks missed glyph as corrected (scar) without moving cursor', () => {
    let state = loadDrill(ITEM);
    state = processKeystroke(state, 'x', 100); // miss
    expect(state.glyphs[0].state).toBe('missed');
    state = processBackspace(state, 150);
    expect(state.glyphs[0].state).toBe('corrected');
    expect(state.cursor).toBe(0);
  });

  it('reverts struck glyph to pending and moves cursor back', () => {
    let state = loadDrill(ITEM);
    state = processKeystroke(state, 'a', 100); // struck
    expect(state.cursor).toBe(1);
    state = processBackspace(state, 150);
    expect(state.cursor).toBe(0);
    expect(state.glyphs[0].state).toBe('pending');
  });

  it('records backspace as a keystroke event', () => {
    let state = loadDrill(ITEM);
    state = processKeystroke(state, 'a', 100);
    state = processBackspace(state, 150);
    expect(state.keystrokes).toHaveLength(2);
    expect(state.keystrokes[1].char).toBe('\b');
    expect(state.keystrokes[1].isCorrection).toBe(true);
  });

  it('does nothing when drill is complete', () => {
    let state = loadDrill(ITEM);
    state = processKeystroke(state, 'a', 100);
    state = processKeystroke(state, 'b', 200);
    state = processKeystroke(state, 'c', 300);
    const result = processBackspace(state, 400);
    expect(result).toBe(state);
  });
});
