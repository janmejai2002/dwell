import { describe, it, expect, beforeEach } from 'vitest';
import {
  ALLOWED_CHARS,
  registerCorpus,
  clearCorpusCache,
  loadCorpus,
  lintCorpusItem,
  lintCorpus,
} from '../src/corpus.js';
import type { DrillItem } from '../src/types.js';

beforeEach(() => {
  clearCorpusCache();
});

// ── ALLOWED_CHARS ───────────────────────────────────────────────────

describe('ALLOWED_CHARS', () => {
  it('allows lowercase letters', () => {
    expect(ALLOWED_CHARS.test('a')).toBe(true);
    expect(ALLOWED_CHARS.test('z')).toBe(true);
  });

  it('allows uppercase letters', () => {
    expect(ALLOWED_CHARS.test('A')).toBe(true);
  });

  it('allows digits', () => {
    expect(ALLOWED_CHARS.test('0')).toBe(true);
    expect(ALLOWED_CHARS.test('9')).toBe(true);
  });

  it('allows space, period, comma, colon, apostrophe, hyphen, newline, >', () => {
    for (const ch of [' ', '.', ',', ':', "'", '-', '\n', '>']) {
      expect(ALLOWED_CHARS.test(ch)).toBe(true);
    }
  });

  it('rejects brackets and symbols', () => {
    for (const ch of ['[', ']', '{', '}', '(', ')', '@', '#', '$', '%', '!', '?', ';', '"', '`', '~', '\\', '/', '=', '+', '*', '&', '^', '|', '<']) {
      expect(ALLOWED_CHARS.test(ch)).toBe(false);
    }
  });
});

// ── lintCorpusItem ──────────────────────────────────────────────────

describe('lintCorpusItem', () => {
  it('returns empty array for valid item', () => {
    const item: DrillItem = { id: 't1-001', tier: 1, text: 'refactor the endpoint' };
    expect(lintCorpusItem(item)).toEqual([]);
  });

  it('detects empty id', () => {
    const item: DrillItem = { id: '', tier: 1, text: 'some text here' };
    const errors = lintCorpusItem(item);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('empty id'))).toBe(true);
  });

  it('detects out-of-range tier', () => {
    const item = { id: 'x', tier: 7 as never, text: 'some text here' };
    const errors = lintCorpusItem(item);
    expect(errors.some(e => e.includes('out of range'))).toBe(true);
  });

  it('detects empty text', () => {
    const item: DrillItem = { id: 'x', tier: 1, text: '' };
    const errors = lintCorpusItem(item);
    expect(errors.some(e => e.includes('empty'))).toBe(true);
  });

  it('detects forbidden characters', () => {
    const item: DrillItem = { id: 'x', tier: 1, text: 'hello [world]' };
    const errors = lintCorpusItem(item);
    expect(errors.some(e => e.includes('forbidden character'))).toBe(true);
  });

  it('detects text shorter than 5 characters', () => {
    const item: DrillItem = { id: 'x', tier: 1, text: 'hi' };
    const errors = lintCorpusItem(item);
    expect(errors.some(e => e.includes('shorter than 5'))).toBe(true);
  });
});

// ── loadCorpus / registerCorpus ─────────────────────────────────────

describe('corpus loading', () => {
  it('throws when corpus not registered', () => {
    expect(() => loadCorpus(1)).toThrow('not loaded');
  });

  it('returns registered items', () => {
    const items: DrillItem[] = [{ id: 't1-001', tier: 1, text: 'hello world test' }];
    registerCorpus(1, items);
    expect(loadCorpus(1)).toEqual(items);
  });
});

// ── lintCorpus ──────────────────────────────────────────────────────

describe('lintCorpus', () => {
  it('reports missing tiers', () => {
    // No tiers registered
    const result = lintCorpus();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('no corpus data'))).toBe(true);
  });

  it('reports duplicate ids within a tier', () => {
    const items: DrillItem[] = [
      { id: 'dup', tier: 1, text: 'first item here now' },
      { id: 'dup', tier: 1, text: 'second item here now' },
    ];
    registerCorpus(1, items);
    // Register empty for other tiers to isolate
    for (const t of [2, 3, 4, 5, 6] as const) {
      registerCorpus(t, [{ id: `t${t}-001`, tier: t, text: 'placeholder text here' }]);
    }
    const result = lintCorpus();
    expect(result.errors.some(e => e.includes('duplicate'))).toBe(true);
  });

  it('valid when all tiers have correct data', () => {
    for (const t of [1, 2, 3, 4, 5, 6] as const) {
      registerCorpus(t, [
        { id: `t${t}-001`, tier: t, text: 'valid placeholder text here' },
      ]);
    }
    const result = lintCorpus();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('all shipped corpus JSON files pass linting and have at least 20 items per tier', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const corpusDir = path.resolve(__dirname, '../corpus');

    const files: Record<number, string> = {
      1: 'tier1-plain.json',
      2: 'tier2-break.json',
      3: 'tier3-rule.json',
      4: 'tier4-frame.json',
      5: 'tier5-recall.json',
      6: 'tier6-cold.json',
    };

    for (let t = 1; t <= 6; t++) {
      const filePath = path.join(corpusDir, files[t]!);
      expect(fs.existsSync(filePath)).toBe(true);
      const items = JSON.parse(fs.readFileSync(filePath, 'utf8')) as DrillItem[];
      expect(items.length).toBeGreaterThanOrEqual(20);
      registerCorpus(t as TierLevel, items);
    }

    const result = lintCorpus();
    if (!result.valid) {
      console.error('Corpus lint errors:', result.errors);
    }
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
