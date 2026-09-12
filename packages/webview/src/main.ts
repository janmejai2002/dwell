/**
 * Webview entry point.
 *
 * - Acquires the VS Code API once
 * - Single rAF loop drains the keystroke queue
 * - Two DOM mutations per keystroke maximum
 */

import './styles/tokens.css';
import './styles/panel.css';
import { buildGlyphTrack, cacheOffsets, cacheGlyphElements, updateGlyph, getExpectedChar, getGlyphCount } from './render/glyphs';
import { initCaret, moveCaret } from './render/caret';
import { initWick, updateWick, extinguishWick, relightWick } from './render/wick';
import { renderTrace } from './render/trace';
import { updateMetrics } from './render/metrics';
import { initAudio, playKeystroke, playEnter, playBackspace, suspend, resume, toggleSound } from './audio/keys';

// ---------- Types ----------

interface VsCodeApi {
  postMessage(msg: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

interface KeystrokeEntry {
  key: string;
  time: number;
}

interface HostMessage {
  v: number;
  type: string;
  [key: string]: unknown;
}

// ---------- State ----------

/** Acquire once — subsequent calls throw */
const vscode: VsCodeApi = (globalThis as unknown as { acquireVsCodeApi(): VsCodeApi }).acquireVsCodeApi();

const keystrokeQueue: KeystrokeEntry[] = [];
let rafId = 0;
let running = false;
let cursorIndex = 0;
let glyphOffsets: Float32Array | null = null;
let lastKeystrokeTime = 0;
let soundEnabled = true;

let startTime = 0;
let correctCount = 0;
let errorCount = 0;
let cleanStreak = 0;
let maxCleanStreak = 0;
let typingTimer = 0;

// ---------- DOM refs ----------

const drillContainer = document.getElementById('drill-container')!;
const wickContainer = document.getElementById('wick-container')!;
const metricsStrip = document.getElementById('metrics-strip')!;
const traceContainer = document.getElementById('trace-container')!;

const caretEl = initCaret(drillContainer);
initWick(wickContainer);

// ---------- Keystroke capture ----------

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (!running) return;

  const time = performance.now();
  const key = e.key;

  // Only process printable characters, Enter, Backspace, Space
  if (key === 'Escape') return;
  if (key.length > 1 && key !== 'Enter' && key !== 'Backspace') return;

  e.preventDefault();

  // Lazily initialise audio on first keystroke
  if (soundEnabled && lastKeystrokeTime === 0) {
    initAudio();
  }

  keystrokeQueue.push({ key, time });
  lastKeystrokeTime = time;
});

// ---------- rAF loop ----------

function tick(): void {
  // Drain entire queue — a fast typist may produce multiple keys per frame
  while (keystrokeQueue.length > 0) {
    const entry = keystrokeQueue.shift()!;
    processKeystroke(entry);
  }

  if (running) {
    rafId = requestAnimationFrame(tick);
  }
}

function processKeystroke(entry: KeystrokeEntry): void {
  if (!glyphOffsets) return;

  const { key, time } = entry;
  const interval = lastKeystrokeTime > 0 ? time - lastKeystrokeTime : 140;

  if (key === 'Backspace') {
    if (cursorIndex > 0) {
      cursorIndex--;
      updateGlyph(cursorIndex, 'pending');
      // Move caret back — two DOM ops: glyph classList + caret transform
      const x = glyphOffsets[cursorIndex * 2]!;
      const y = glyphOffsets[cursorIndex * 2 + 1]!;
      moveCaret(caretEl, x, y);

      caretEl.classList.add('caret--typing');
      if (typingTimer) clearTimeout(typingTimer);
      typingTimer = window.setTimeout(() => {
        caretEl.classList.remove('caret--typing');
      }, 600);

      if (soundEnabled) playBackspace();
    }
    return;
  }

  if (key === 'Enter') {
    // Treat Enter as a character in Tiers 2–6
    handleCharacter('\n', interval);
    if (soundEnabled) playEnter();
    return;
  }

  // Regular character (including Space)
  handleCharacter(key, interval);
  if (soundEnabled) playKeystroke(interval);
}

function handleCharacter(char: string, interval: number): void {
  if (!glyphOffsets) return;

  const totalGlyphs = getGlyphCount();
  if (cursorIndex >= totalGlyphs) return;

  const expected = getExpectedChar(cursorIndex);
  const correct = char === expected;

  if (startTime === 0) {
    startTime = performance.now();
  }

  if (correct) {
    correctCount++;
    cleanStreak++;
    if (cleanStreak > maxCleanStreak) {
      maxCleanStreak = cleanStreak;
    }
    updateGlyph(cursorIndex, 'struck');
  } else {
    errorCount++;
    cleanStreak = 0;
    updateGlyph(cursorIndex, 'missed');
  }

  cursorIndex++;

  // Suppress caret blink while actively typing
  caretEl.classList.add('caret--typing');
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = window.setTimeout(() => {
    caretEl.classList.remove('caret--typing');
  }, 600);

  // Move caret to cursorIndex (works cleanly including cursorIndex === totalGlyphs terminal position)
  const x = glyphOffsets[cursorIndex * 2]!;
  const y = glyphOffsets[cursorIndex * 2 + 1]!;
  moveCaret(caretEl, x, y);

  if (cursorIndex >= totalGlyphs) {
    drillComplete();
  }

  // Update live metrics on metric strip
  const elapsedMinutes = (performance.now() - startTime) / 60000;
  const currentUwpm = elapsedMinutes > 0 ? (correctCount / 5) / elapsedMinutes : 0;
  updateMetrics(currentUwpm, null, maxCleanStreak);

  void interval;
}

function drillComplete(): void {
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  caretEl.classList.remove('caret--typing');
  vscode.postMessage({ v: 1, type: 'run:complete' });
}

// ---------- Host message handling ----------

window.addEventListener('message', (e: MessageEvent<HostMessage>) => {
  const msg = e.data;
  if (!msg || msg.v !== 1) return;

  switch (msg.type) {
    case 'reveal':
      handleReveal();
      break;

    case 'hide':
      handleHide();
      break;

    case 'agent:start':
      handleAgentStart(msg);
      break;

    case 'agent:end':
      handleAgentEnd();
      break;

    case 'state:restore':
      handleStateRestore(msg);
      break;

    case 'theme':
      handleTheme(msg);
      break;

    default:
      break;
  }
});

function handleReveal(): void {
  running = true;
  if (!rafId) {
    rafId = requestAnimationFrame(tick);
  }
  resume();
}

function handleHide(): void {
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  suspend();
}

function handleAgentStart(msg: HostMessage): void {
  const estimateMs = typeof msg['estimateMs'] === 'number' ? msg['estimateMs'] : 60000;
  wickContainer.classList.add('wick--active');
  relightWick();
  updateWick(0, estimateMs / 1000, performance.now() / 1000);
}

function handleAgentEnd(): void {
  extinguishWick();
  setTimeout(() => {
    wickContainer.classList.remove('wick--active');
  }, 300);
}

function handleStateRestore(msg: HostMessage): void {
  const recentRuns = msg['recentRuns'] as number[] | undefined;
  if (recentRuns) {
    renderTrace(traceContainer, recentRuns);
  }

  const prefs = msg['prefs'] as { sound?: boolean } | undefined;
  if (prefs && typeof prefs.sound === 'boolean') {
    soundEnabled = prefs.sound;
    toggleSound(soundEnabled);
  }
}

function handleTheme(msg: HostMessage): void {
  const kind = msg['kind'] as string | undefined;
  if (kind) {
    document.documentElement.setAttribute('data-theme', kind);
  }
}

// ---------- Drill loading ----------

/**
 * Load a drill text into the drill container.
 * Called on state:restore and when a new drill is offered.
 */
export function loadDrill(text: string): void {
  cursorIndex = 0;
  startTime = 0;
  correctCount = 0;
  errorCount = 0;
  cleanStreak = 0;
  maxCleanStreak = 0;
  running = true;

  buildGlyphTrack(drillContainer, text);
  cacheGlyphElements(drillContainer);

  // Ensure caret is inside drillContainer
  drillContainer.appendChild(caretEl);
  caretEl.classList.remove('caret--typing');

  glyphOffsets = cacheOffsets(drillContainer);

  // Position caret at first glyph
  if (glyphOffsets.length >= 2) {
    moveCaret(caretEl, glyphOffsets[0]!, glyphOffsets[1]!);
  }

  updateMetrics(0, null, 0);

  if (!rafId) {
    rafId = requestAnimationFrame(tick);
  }
}

// ---------- Init ----------

vscode.postMessage({ v: 1, type: 'ready' });

// Export for potential use by the host mock in the harness
(globalThis as unknown as Record<string, unknown>)['__dwell_loadDrill'] = loadDrill;
(globalThis as unknown as Record<string, unknown>)['__dwell_updateMetrics'] = updateMetrics;
(globalThis as unknown as Record<string, unknown>)['__dwell_updateWick'] = updateWick;
