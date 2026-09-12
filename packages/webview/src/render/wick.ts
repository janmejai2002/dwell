/**
 * Wick renderer.
 *
 * The wick is a 2px line with a 5×8px flame that sways using three
 * incommensurable sine periods so the motion never visibly loops.
 *
 * Flame sway formula: A₁sin(2πt/2.7) + A₂sin(2πt/4.3) + A₃sin(2πt/7.1)
 * Amplitudes: 0.7, 0.5, 0.3 px. Total motion: ~1.5px.
 */

let wickLine: HTMLElement | null = null;
let wickFlame: HTMLElement | null = null;
let wickContainer: HTMLElement | null = null;

const TWO_PI = 2 * Math.PI;
const PERIOD_1 = 2.7;
const PERIOD_2 = 4.3;
const PERIOD_3 = 7.1;
const AMP_1 = 0.7;
const AMP_2 = 0.5;
const AMP_3 = 0.3;

/**
 * Initialise wick elements inside the container.
 */
export function initWick(container: HTMLElement): void {
  wickContainer = container;

  // The wick line — a 2px vertical bar
  wickLine = document.createElement('div');
  wickLine.className = 'wick-line';
  wickLine.style.position = 'absolute';
  wickLine.style.bottom = '0';
  wickLine.style.left = '7px'; // centre in the 16px box
  wickLine.style.height = '32px'; // grows based on elapsed/median

  // The flame — 5×8 at the top
  wickFlame = document.createElement('div');
  wickFlame.className = 'wick-flame';
  wickFlame.style.position = 'absolute';
  wickFlame.style.left = '5px'; // roughly centred
  wickFlame.style.bottom = '32px';
  wickFlame.style.willChange = 'transform';

  container.appendChild(wickLine);
  container.appendChild(wickFlame);
}

/**
 * Update wick each frame.
 *
 * @param elapsed  - seconds since agent task started
 * @param median   - median agent task duration in seconds
 * @param t        - current time in seconds (for sway calculation)
 */
export function updateWick(elapsed: number, median: number, t: number): void {
  if (!wickLine || !wickFlame) return;

  // Wick height: burn down from elapsed/median ratio
  // Full height at start, shrinks as task progresses
  const burnRatio = median > 0 ? Math.max(0, 1 - elapsed / median) : 1;
  const height = Math.max(4, Math.round(32 * burnRatio));
  wickLine.style.height = `${height}px`;
  wickFlame.style.bottom = `${height}px`;

  // Three-sine sway — incommensurable periods, no visible loop
  const sway =
    AMP_1 * Math.sin(TWO_PI * t / PERIOD_1) +
    AMP_2 * Math.sin(TWO_PI * t / PERIOD_2) +
    AMP_3 * Math.sin(TWO_PI * t / PERIOD_3);

  wickFlame.style.transform = `translateX(${sway}px)`;
}

/**
 * Extinguish the flame: 180ms opacity fade.
 * Called when the agent task ends.
 */
export function extinguishWick(): void {
  if (!wickFlame) return;
  wickFlame.classList.add('wick-flame--out');
}

/**
 * Reset wick to its initial lit state.
 */
export function relightWick(): void {
  if (!wickFlame) return;
  wickFlame.classList.remove('wick-flame--out');
}
