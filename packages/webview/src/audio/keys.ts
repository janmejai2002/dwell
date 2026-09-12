/**
 * Audio synthesis for keystroke sounds.
 *
 * All sounds are synthesised at runtime with WebAudio — no sample files.
 * Material: small wooden body struck with felt (marimba-like at low volume).
 *
 * Per keystroke, two voices summed:
 * - Noise burst: 14ms white noise through bandpass at 1600Hz, Q=6
 * - Body: sine at note frequency, 28ms
 *
 * Pitch: fixed four-note set cycled in shuffled non-repeating order
 * with ±15 cents random detune per strike.
 *
 * Velocity: gain scales inversely with speed — fast typing gets quieter.
 */

const NOTES = [196.0, 220.0, 246.9, 261.6]; // G3 A3 B3 C4
const ENTER_FREQ = 146.8; // D3
const ENTER_BODY_MS = 40;
const ENTER_NOISE_FREQ = 900;
const NOISE_FREQ = 1600;
const NOISE_Q = 6;
const NOISE_DURATION = 0.014; // 14ms
const BODY_DURATION = 0.028; // 28ms
const PEAK_GAIN = 0.22; // -18 dBFS approx
const BACKSPACE_GAIN_MULT = 0.5;
const DETUNE_RANGE = 15; // ±15 cents

let ctx: AudioContext | null = null;
let compressor: DynamicsCompressorNode | null = null;
let masterLowpass: BiquadFilterNode | null = null;
let enabled = true;

// Shuffled note queue — never repeats same note twice in a row
let noteQueue: number[] = [];
let lastNote = -1;

function shuffleNotes(): void {
  // Fisher-Yates, then ensure first note ≠ lastNote
  const arr = [...NOTES];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  if (arr[0] === lastNote && arr.length > 1) {
    [arr[0], arr[1]] = [arr[1]!, arr[0]!];
  }
  noteQueue = arr;
}

function nextNote(): number {
  if (noteQueue.length === 0) shuffleNotes();
  const note = noteQueue.shift()!;
  lastNote = note;
  return note;
}

/**
 * Lazily create AudioContext on first keystroke (browsers require a gesture).
 */
export function initAudio(): AudioContext {
  if (ctx) return ctx;

  ctx = new AudioContext();

  // Master chain: compressor → lowpass → destination
  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.ratio.value = 4;
  compressor.knee.value = 10;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.1;

  masterLowpass = ctx.createBiquadFilter();
  masterLowpass.type = 'lowpass';
  masterLowpass.frequency.value = 7000;

  compressor.connect(masterLowpass);
  masterLowpass.connect(ctx.destination);

  return ctx;
}

function velocityGain(intervalMs: number): number {
  // Inverse velocity: fast typing → quieter
  const t = Math.max(0.35, Math.min(1.0, intervalMs / 140));
  return PEAK_GAIN * t;
}

function playNoiseBurst(
  audioCtx: AudioContext,
  destination: AudioNode,
  gain: number,
  bandpassFreq: number,
  durationS: number,
): void {
  const now = audioCtx.currentTime;

  // White noise buffer
  const bufferSize = Math.ceil(audioCtx.sampleRate * durationS);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  // Bandpass filter
  const bandpass = audioCtx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = bandpassFreq;
  bandpass.Q.value = NOISE_Q;

  // Gain envelope: 0 → peak in 1ms → 0 in remaining
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gain, now + 0.001);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationS);

  source.connect(bandpass);
  bandpass.connect(gainNode);
  gainNode.connect(destination);

  source.start(now);
  source.stop(now + durationS);
}

function playBody(
  audioCtx: AudioContext,
  destination: AudioNode,
  freq: number,
  gain: number,
  durationS: number,
): void {
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // Random detune ±15 cents
  osc.detune.value = (Math.random() * 2 - 1) * DETUNE_RANGE;

  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gain, now + 0.002);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationS);

  osc.connect(gainNode);
  gainNode.connect(destination);

  osc.start(now);
  osc.stop(now + durationS);
}

/**
 * Play a standard keystroke sound.
 * @param interval - ms since previous keystroke (for velocity scaling)
 */
export function playKeystroke(interval: number): void {
  if (!enabled || !ctx || !compressor) return;
  const gain = velocityGain(interval);
  const freq = nextNote();
  playNoiseBurst(ctx, compressor, gain, NOISE_FREQ, NOISE_DURATION);
  playBody(ctx, compressor, freq, gain, BODY_DURATION);
}

/**
 * Play Enter sound: lower freq (D3), longer body, lower noise bandpass.
 */
export function playEnter(): void {
  if (!enabled || !ctx || !compressor) return;
  const gain = PEAK_GAIN;
  playNoiseBurst(ctx, compressor, gain, ENTER_NOISE_FREQ, NOISE_DURATION);
  playBody(ctx, compressor, ENTER_FREQ, gain, ENTER_BODY_MS / 1000);
}

/**
 * Play Backspace sound: noise only, 0.5× gain.
 */
export function playBackspace(): void {
  if (!enabled || !ctx || !compressor) return;
  const gain = PEAK_GAIN * BACKSPACE_GAIN_MULT;
  playNoiseBurst(ctx, compressor, gain, NOISE_FREQ, NOISE_DURATION);
}

/**
 * Suspend AudioContext when panel hides.
 */
export function suspend(): void {
  if (ctx && ctx.state === 'running') {
    void ctx.suspend();
  }
}

/**
 * Resume AudioContext when panel shows.
 */
export function resume(): void {
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume();
  }
}

/**
 * Toggle sound on/off.
 */
export function toggleSound(on: boolean): void {
  enabled = on;
  if (!on) {
    suspend();
  }
}
