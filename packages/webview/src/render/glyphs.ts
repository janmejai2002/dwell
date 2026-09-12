/**
 * Glyph track renderer.
 *
 * Builds <span> elements for each character in the drill text,
 * caches their layout offsets once, and provides a classList-only
 * update function for the hot path.
 */

export type GlyphState = 'pending' | 'struck' | 'missed' | 'corrected';

/**
 * Build the glyph track: one <span class="glyph"> per character.
 * Newlines produce a <br> followed by a zero-width glyph span.
 */
export function buildGlyphTrack(container: HTMLElement, text: string): void {
  // Clear previous content
  container.innerHTML = '';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;

    if (ch === '\n') {
      // Line break: place newline slot at the end of the line, then break
      const span = document.createElement('span');
      span.className = 'glyph glyph--newline';
      span.dataset['char'] = '\n';
      span.textContent = ' ';
      container.appendChild(span);
      container.appendChild(document.createElement('br'));
    } else {
      const span = document.createElement('span');
      span.className = 'glyph';
      span.dataset['char'] = ch;
      span.textContent = ch;
      container.appendChild(span);
    }
  }
}

/**
 * Measure all glyph positions once into a Float32Array.
 * Layout: [x0, y0, x1, y1, ...] — one pair per glyph, plus one terminal pair
 * positioned immediately after the final glyph.
 * This is the only layout read in the lifecycle; the hot path never reads layout.
 */
export function cacheOffsets(container: HTMLElement): Float32Array {
  const glyphs = container.querySelectorAll('.glyph');
  const offsets = new Float32Array((glyphs.length + 1) * 2);
  const containerRect = container.getBoundingClientRect();

  for (let i = 0; i < glyphs.length; i++) {
    const el = glyphs[i] as HTMLElement;
    const rect = el.getBoundingClientRect();
    offsets[i * 2] = rect.left - containerRect.left;
    offsets[i * 2 + 1] = rect.top - containerRect.top;
  }

  // Terminal caret offset: immediately after the final character
  if (glyphs.length > 0) {
    const lastEl = glyphs[glyphs.length - 1] as HTMLElement;
    const lastRect = lastEl.getBoundingClientRect();
    offsets[glyphs.length * 2] = lastRect.right - containerRect.left;
    offsets[glyphs.length * 2 + 1] = lastRect.top - containerRect.top;
  }

  return offsets;
}

// Cache of glyph elements for hot-path access — avoids querySelectorAll in the loop
let _glyphEls: HTMLElement[] = [];

/**
 * Call after buildGlyphTrack to populate the element cache.
 */
export function cacheGlyphElements(container: HTMLElement): void {
  _glyphEls = Array.from(container.querySelectorAll('.glyph'));
}

export function getExpectedChar(index: number): string {
  return _glyphEls[index]?.dataset['char'] ?? '';
}

export function getGlyphCount(): number {
  return _glyphEls.length;
}

/**
 * Update a single glyph's visual state via classList swap.
 * This is the hot path — one DOM mutation (classList change), no layout reads.
 */
export function updateGlyph(index: number, state: GlyphState): void {
  const el = _glyphEls[index];
  if (!el) return;

  const cl = el.classList;
  if (state === 'pending') {
    const wasMissed = cl.contains('missed') || cl.contains('corrected');
    cl.remove('struck', 'missed', 'corrected');
    if (wasMissed) {
      cl.add('corrected');
    }
  } else {
    cl.remove('struck', 'missed', 'corrected');
    cl.add(state);
  }
}
