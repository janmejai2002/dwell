/**
 * Mock host for the Dwell harness.
 *
 * Fakes acquireVsCodeApi and the host message protocol so the
 * webview can run outside VS Code for visual verification.
 */

// ---------- Mock VS Code API ----------

interface MockState {
  tiers: Record<string, boolean>;
  prefs: { sound: boolean; dnd: boolean };
  recentRuns: number[];
}

const mockState: MockState = {
  tiers: {},
  prefs: { sound: true, dnd: false },
  recentRuns: [42, 45, 48, 44, 50, 52, 47, 55, 53, 51, 49, 54, 56, 50, 48, 52, 55, 53, 57, 54],
};

let savedState: unknown = null;

const mockVsCodeApi = {
  postMessage(msg: unknown): void {
    console.log('[webview → host]', msg);
    handleWebviewMessage(msg as { v: number; type: string });
  },
  getState(): unknown {
    return savedState;
  },
  setState(state: unknown): void {
    savedState = state;
  },
};

// Expose globally so the webview can call acquireVsCodeApi()
(globalThis as unknown as Record<string, unknown>)['acquireVsCodeApi'] = () => mockVsCodeApi;

// ---------- Message handling ----------

function handleWebviewMessage(msg: { v: number; type: string }): void {
  if (msg.v !== 1) return;

  switch (msg.type) {
    case 'ready':
      onWebviewReady();
      break;
    case 'run:complete':
      console.log('[host] run complete');
      break;
    case 'run:abandon':
      console.log('[host] run abandoned');
      break;
    default:
      break;
  }
}

function onWebviewReady(): void {
  // Send restored state
  postToWebview({
    v: 1,
    type: 'state:restore',
    tiers: mockState.tiers,
    prefs: mockState.prefs,
    recentRuns: mockState.recentRuns,
  });

  // Send theme
  postToWebview({
    v: 1,
    type: 'theme',
    kind: document.documentElement.getAttribute('data-theme') ?? 'dark',
  });

  // Auto-reveal with a tier 1 drill
  setTimeout(() => {
    postToWebview({ v: 1, type: 'reveal', reason: 'first-run' });

    // Load a tier 1 drill via the exposed API
    const loadDrill = (globalThis as unknown as Record<string, (text: string) => void>)['__dwell_loadDrill'];
    if (loadDrill) {
      loadDrill('refactor the endpoint to use idempotent schema validation');
    }
  }, 100);
}

function postToWebview(msg: Record<string, unknown>): void {
  console.log('[host → webview]', msg);
  window.dispatchEvent(new MessageEvent('message', { data: msg }));
}

// ---------- Control buttons ----------

function setupControls(): void {
  // Theme buttons
  const themes = ['dark', 'light', 'hc-dark', 'hc-light'] as const;
  for (const theme of themes) {
    const btn = document.getElementById(`btn-theme-${theme}`);
    btn?.addEventListener('click', () => {
      document.documentElement.setAttribute('data-theme', theme);
      postToWebview({ v: 1, type: 'theme', kind: theme });
    });
  }

  // Reveal button
  document.getElementById('btn-reveal')?.addEventListener('click', () => {
    postToWebview({ v: 1, type: 'reveal', reason: 'hotkey' });
  });

  // Agent start
  document.getElementById('btn-agent-start')?.addEventListener('click', () => {
    postToWebview({ v: 1, type: 'agent:start', estimateMs: 60000 });
  });

  // Agent end
  document.getElementById('btn-agent-end')?.addEventListener('click', () => {
    postToWebview({ v: 1, type: 'agent:end' });
  });

  // Reduced motion toggle
  const motionCheckbox = document.getElementById('chk-reduced-motion') as HTMLInputElement | null;
  motionCheckbox?.addEventListener('change', () => {
    // Toggle a class that overrides motion variables
    if (motionCheckbox.checked) {
      document.documentElement.style.setProperty('--motion-caret', '0ms');
      document.documentElement.style.setProperty('--motion-panel-open', '0ms');
      document.documentElement.style.setProperty('--motion-panel-close', '0ms');
      document.documentElement.style.setProperty('--motion-wick-appear', '0ms');
      document.documentElement.style.setProperty('--motion-wick-retract', '0ms');
      document.documentElement.style.setProperty('--motion-glyph', '0ms');
      document.documentElement.style.setProperty('--motion-clean-retract', '0ms');
      document.documentElement.style.setProperty('--motion-flame-out', '0ms');
    } else {
      // Remove overrides — fall back to tokens.css values
      document.documentElement.style.removeProperty('--motion-caret');
      document.documentElement.style.removeProperty('--motion-panel-open');
      document.documentElement.style.removeProperty('--motion-panel-close');
      document.documentElement.style.removeProperty('--motion-wick-appear');
      document.documentElement.style.removeProperty('--motion-wick-retract');
      document.documentElement.style.removeProperty('--motion-glyph');
      document.documentElement.style.removeProperty('--motion-clean-retract');
      document.documentElement.style.removeProperty('--motion-flame-out');
    }
  });

  // Width slider
  const slider = document.getElementById('width-slider') as HTMLInputElement | null;
  const frame = document.getElementById('webview-frame');
  slider?.addEventListener('input', () => {
    if (frame) {
      frame.style.maxWidth = `${slider.value}px`;
    }
  });
}

// ---------- Boot ----------

// Import the webview entry point
import('@dwell/webview/main').then(() => {
  console.log('[harness] webview loaded');
}).catch((err) => {
  console.error('[harness] failed to load webview:', err);
});

// Setup controls once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupControls);
} else {
  setupControls();
}
