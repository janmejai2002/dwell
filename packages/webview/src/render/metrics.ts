/**
 * Metrics display.
 *
 * Shows uWPM, latency (Tiers 5–6 only), and longest clean run
 * in the metric strip using IBM Plex Mono with tabular-nums.
 */

let metricsStrip: HTMLElement | null = null;
let uWPMEl: HTMLElement | null = null;
let latencyEl: HTMLElement | null = null;
let cleanRunEl: HTMLElement | null = null;

function ensureElements(): void {
  if (metricsStrip) return;

  metricsStrip = document.getElementById('metrics-strip');
  if (!metricsStrip) return;

  uWPMEl = document.createElement('span');
  uWPMEl.className = 'metric-value';
  uWPMEl.textContent = '—';

  latencyEl = document.createElement('span');
  latencyEl.className = 'metric-value';
  latencyEl.textContent = '';

  cleanRunEl = document.createElement('span');
  cleanRunEl.className = 'metric-value';
  cleanRunEl.textContent = '—';

  metricsStrip.appendChild(uWPMEl);
  metricsStrip.appendChild(latencyEl);
  metricsStrip.appendChild(cleanRunEl);
}

/**
 * Update the metrics display.
 *
 * @param uWPM          - unbroken words per minute
 * @param latency       - ms from prompt-visible to first keystroke (null hides it)
 * @param longestClean  - longest consecutive-correct keystroke count
 */
export function updateMetrics(
  uWPM: number,
  latency: number | null,
  longestClean: number,
): void {
  ensureElements();
  if (!uWPMEl || !latencyEl || !cleanRunEl) return;

  uWPMEl.textContent = `${Math.round(uWPM)}`;

  if (latency !== null) {
    const latencyS = (latency / 1000).toFixed(1);
    latencyEl.textContent = `${latencyS}s`;
  } else {
    latencyEl.textContent = '';
  }

  cleanRunEl.textContent = `${longestClean}`;
}
