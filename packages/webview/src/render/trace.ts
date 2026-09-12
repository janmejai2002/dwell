/**
 * Trace renderer.
 *
 * Draws 20 hairlines representing recent uWPM values.
 * Most recent bar uses --ink-200; the rest use --ink-600.
 * No axis, no labels, no tooltip.
 */

const MAX_BARS = 20;

/**
 * Render the trace strip: up to 20 vertical hairlines.
 * Each bar is 1px wide, 3px apart, height proportional to value.
 *
 * @param container - the #trace-container element
 * @param runs      - array of recent uWPM values (most recent last)
 */
export function renderTrace(container: HTMLElement, runs: number[]): void {
  container.innerHTML = '';

  // Take the last 20 runs
  const visible = runs.slice(-MAX_BARS);
  if (visible.length === 0) return;

  // Find max for normalisation
  const max = Math.max(...visible, 1);
  const containerHeight = container.clientHeight || 32;

  for (let i = 0; i < visible.length; i++) {
    const value = visible[i]!;
    const isRecent = i === visible.length - 1;

    const bar = document.createElement('div');
    bar.className = isRecent ? 'trace-bar trace-bar--recent' : 'trace-bar';

    // Height proportional to uWPM, min 2px
    const height = Math.max(2, Math.round((value / max) * containerHeight));
    bar.style.height = `${height}px`;

    container.appendChild(bar);
  }
}
