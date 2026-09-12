/**
 * Caret management.
 *
 * The caret is the only element with will-change: transform.
 * Movement is translate3d only — no layout reads, ever.
 */

/**
 * Create the caret element and append it to the container.
 * Returns the caret element for direct reference.
 */
export function initCaret(container: HTMLElement): HTMLElement {
  const caret = document.createElement('div');
  caret.className = 'caret';
  // Height matches the drill line-height: 19px * 1.55 ≈ 30px
  caret.style.height = '30px';
  caret.style.willChange = 'transform';
  caret.style.transform = 'translate3d(0px, 0px, 0)';
  container.appendChild(caret);
  return caret;
}

/**
 * Move the caret to (x, y) using translate3d only.
 * This is a single style.transform write — no layout reads.
 */
export function moveCaret(el: HTMLElement, x: number, y: number): void {
  el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}
