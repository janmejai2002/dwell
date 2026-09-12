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
      const statusEl = document.getElementById('panel-status');
      if (statusEl) statusEl.textContent = 'DRILL COMPLETE';
      break;
    case 'run:abandon':
      console.log('[host] run abandoned');
      break;
    default:
      break;
  }
}

const TIER_DRILLS: Record<number, string> = {
  1: 'refactor the endpoint to use idempotent schema validation',
  2: 'split the controller into service and router\nuse dependency injection for the repository\nensure all database queries are scoped',
  3: 'review the authentication middleware\n---\n> verify the bearer token\n> enforce session expiration\n---',
  4: 'Goal: Add rate limiting to public endpoints\nContext: Express app behind nginx\nConstraints: In-memory store only\nDone: Returns 429 after 100 requests',
  5: 'implement idempotent schema migrations',
  6: 'add distributed tracing to all external service calls',
};

let currentTier = 1;

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

    const loadDrill = (globalThis as unknown as Record<string, (text: string) => void>)['__dwell_loadDrill'];
    if (loadDrill) {
      loadDrill(TIER_DRILLS[1]!);
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
    btn?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      for (const t of themes) {
        document.getElementById(`btn-theme-${t}`)?.classList.toggle('active', t === theme);
      }
      document.documentElement.setAttribute('data-theme', theme);
      postToWebview({ v: 1, type: 'theme', kind: theme });
    });
  }

  // Tier buttons
  for (let tier = 1; tier <= 6; tier++) {
    const btn = document.getElementById(`btn-tier-${tier}`);
    btn?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      for (let t = 1; t <= 6; t++) {
        document.getElementById(`btn-tier-${t}`)?.classList.toggle('active', t === tier);
      }
      currentTier = tier;
      const drillText = TIER_DRILLS[tier] || TIER_DRILLS[1]!;
      const loadDrill = (globalThis as unknown as Record<string, (text: string) => void>)['__dwell_loadDrill'];
      if (loadDrill) {
        loadDrill(drillText);
      }
      const statusEl = document.getElementById('panel-status');
      if (statusEl) statusEl.textContent = `TIER ${tier} ACTIVE`;
    });
  }

  // Reveal button
  document.getElementById('btn-reveal')?.addEventListener('click', (e) => {
    (e.currentTarget as HTMLElement).blur();
    postToWebview({ v: 1, type: 'reveal', reason: 'hotkey' });
    const loadDrill = (globalThis as unknown as Record<string, (text: string) => void>)['__dwell_loadDrill'];
    if (loadDrill) {
      loadDrill(TIER_DRILLS[currentTier]!);
    }
    const statusEl = document.getElementById('panel-status');
    if (statusEl) statusEl.textContent = 'DRILL ACTIVE';
  });

  // Agent start (arm wick)
  document.getElementById('btn-agent-start')?.addEventListener('click', (e) => {
    (e.currentTarget as HTMLElement).blur();
    postToWebview({ v: 1, type: 'agent:start', estimateMs: 60000 });
    const statusEl = document.getElementById('panel-status');
    if (statusEl) statusEl.textContent = 'WICK LIT (ARMED)';
  });

  // Agent end (extinguish)
  document.getElementById('btn-agent-end')?.addEventListener('click', (e) => {
    (e.currentTarget as HTMLElement).blur();
    postToWebview({ v: 1, type: 'agent:end' });
    const statusEl = document.getElementById('panel-status');
    if (statusEl) statusEl.textContent = 'EXTINGUISHED';
  });

  // Sound checkbox
  const soundCheckbox = document.getElementById('chk-sound') as HTMLInputElement | null;
  soundCheckbox?.addEventListener('change', (e) => {
    (e.currentTarget as HTMLElement).blur();
    postToWebview({
      v: 1,
      type: 'state:restore',
      prefs: { sound: soundCheckbox.checked },
    });
  });

  // Reduced motion toggle
  const motionCheckbox = document.getElementById('chk-reduced-motion') as HTMLInputElement | null;
  motionCheckbox?.addEventListener('change', (e) => {
    (e.currentTarget as HTMLElement).blur();
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
  const wrapper = document.getElementById('sidebar-wrapper');
  const widthLabel = document.getElementById('width-label');
  slider?.addEventListener('input', () => {
    if (wrapper && slider) {
      wrapper.style.maxWidth = `${slider.value}px`;
    }
    if (widthLabel && slider) {
      widthLabel.textContent = `${slider.value}px`;
    }
  });

  // Clicking on webview frame focuses the typing area
  const frame = document.getElementById('webview-frame');
  frame?.addEventListener('click', () => {
    window.focus();
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
