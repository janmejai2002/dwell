/**
 * Mock host for the Dwell harness.
 *
 * Fakes acquireVsCodeApi and the host message protocol so the
 * webview can run outside VS Code for visual verification.
 * Loads the full 120-item corpus across all 6 tiers.
 */

import tier1Items from '../../../packages/core/corpus/tier1-plain.json';
import tier2Items from '../../../packages/core/corpus/tier2-break.json';
import tier3Items from '../../../packages/core/corpus/tier3-rule.json';
import tier4Items from '../../../packages/core/corpus/tier4-frame.json';
import tier5Items from '../../../packages/core/corpus/tier5-recall.json';
import tier6Items from '../../../packages/core/corpus/tier6-cold.json';

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

// ---------- Corpus Data (120 drills) ----------

interface DrillItem {
  id: string;
  tier: number;
  text: string;
}

const CORPUS: Record<number, DrillItem[]> = {
  1: tier1Items,
  2: tier2Items,
  3: tier3Items,
  4: tier4Items,
  5: tier5Items,
  6: tier6Items,
};

let currentTier = 1;
let currentDrillIndex = 0;

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
      if (statusEl) statusEl.textContent = 'DRILL COMPLETE! NEXT IN 1.2s';
      setTimeout(() => {
        currentDrillIndex++;
        updateDrillDisplay();
      }, 1200);
      break;
    case 'run:abandon':
      console.log('[host] run abandoned');
      break;
    default:
      break;
  }
}

function updateDrillDisplay(): void {
  const items = CORPUS[currentTier] || CORPUS[1]!;
  if (currentDrillIndex >= items.length) currentDrillIndex = 0;
  if (currentDrillIndex < 0) currentDrillIndex = items.length - 1;

  const drill = items[currentDrillIndex]!;
  const counterEl = document.getElementById('drill-counter');
  if (counterEl) {
    counterEl.textContent = `${currentDrillIndex + 1}/${items.length}`;
  }

  const statusEl = document.getElementById('panel-status');
  if (statusEl) {
    statusEl.textContent = `TIER ${currentTier} · ${drill.id.toUpperCase()}`;
  }

  const loadDrill = (globalThis as unknown as Record<string, (text: string) => void>)['__dwell_loadDrill'];
  if (loadDrill) {
    loadDrill(drill.text);
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

  // Auto-reveal with initial drill
  setTimeout(() => {
    postToWebview({ v: 1, type: 'reveal', reason: 'first-run' });
    updateDrillDisplay();
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

  // Tier buttons (1 to 6)
  for (let tier = 1; tier <= 6; tier++) {
    const btn = document.getElementById(`btn-tier-${tier}`);
    btn?.addEventListener('click', (e) => {
      (e.currentTarget as HTMLElement).blur();
      for (let t = 1; t <= 6; t++) {
        document.getElementById(`btn-tier-${t}`)?.classList.toggle('active', t === tier);
      }
      currentTier = tier;
      currentDrillIndex = 0;
      updateDrillDisplay();
    });
  }

  // Previous drill button
  document.getElementById('btn-prev-drill')?.addEventListener('click', (e) => {
    (e.currentTarget as HTMLElement).blur();
    currentDrillIndex--;
    updateDrillDisplay();
  });

  // Next drill button
  document.getElementById('btn-next-drill')?.addEventListener('click', (e) => {
    (e.currentTarget as HTMLElement).blur();
    currentDrillIndex++;
    updateDrillDisplay();
  });

  // Random / Shuffle drill button
  document.getElementById('btn-random-drill')?.addEventListener('click', (e) => {
    (e.currentTarget as HTMLElement).blur();
    const count = CORPUS[currentTier]?.length || 20;
    currentDrillIndex = Math.floor(Math.random() * count);
    updateDrillDisplay();
  });

  // Reveal button
  document.getElementById('btn-reveal')?.addEventListener('click', (e) => {
    (e.currentTarget as HTMLElement).blur();
    postToWebview({ v: 1, type: 'reveal', reason: 'hotkey' });
    updateDrillDisplay();
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

  // Focus on panel click
  const frame = document.getElementById('webview-frame');
  frame?.addEventListener('click', () => {
    window.focus();
  });

  // Curriculum Browser Modal
  const modal = document.getElementById('curriculum-modal');
  const btnBrowseAll = document.getElementById('btn-browse-all');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const drillListContainer = document.getElementById('modal-drill-list');

  let modalActiveTier = 1;

  function renderModalDrills(tier: number): void {
    if (!drillListContainer) return;
    drillListContainer.innerHTML = '';
    const items = CORPUS[tier] || [];

    for (let idx = 0; idx < items.length; idx++) {
      const drill = items[idx]!;
      const card = document.createElement('div');
      card.style.background = 'var(--ink-700)';
      card.style.border = '1px solid var(--ink-600)';
      card.style.padding = '12px 14px';
      card.style.borderRadius = '2px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '8px';

      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';

      const idSpan = document.createElement('span');
      idSpan.style.fontFamily = 'var(--font-mono)';
      idSpan.style.fontSize = '12px';
      idSpan.style.fontWeight = '600';
      idSpan.style.color = 'var(--accent)';
      idSpan.textContent = `#${idx + 1} · ${drill.id.toUpperCase()}`;

      const typeBtn = document.createElement('button');
      typeBtn.type = 'button';
      typeBtn.textContent = 'Type This Drill ↵';
      typeBtn.style.background = 'var(--ink-600)';
      typeBtn.style.color = 'var(--ink-050)';
      typeBtn.style.border = '1px solid var(--ink-400)';
      typeBtn.style.padding = '3px 10px';
      typeBtn.style.borderRadius = '2px';
      typeBtn.style.fontSize = '11px';
      typeBtn.style.fontFamily = 'var(--font-mono)';
      typeBtn.style.cursor = 'pointer';
      typeBtn.addEventListener('click', () => {
        currentTier = tier;
        currentDrillIndex = idx;
        for (let t = 1; t <= 6; t++) {
          document.getElementById(`btn-tier-${t}`)?.classList.toggle('active', t === tier);
        }
        updateDrillDisplay();
        if (modal) modal.style.display = 'none';
      });

      header.appendChild(idSpan);
      header.appendChild(typeBtn);

      const textPre = document.createElement('pre');
      textPre.style.margin = '0';
      textPre.style.fontFamily = 'var(--font-drill)';
      textPre.style.fontSize = '13px';
      textPre.style.lineHeight = '1.45';
      textPre.style.color = 'var(--ink-050)';
      textPre.style.whiteSpace = 'pre-wrap';
      textPre.textContent = drill.text;

      card.appendChild(header);
      card.appendChild(textPre);
      drillListContainer.appendChild(card);
    }
  }

  btnBrowseAll?.addEventListener('click', () => {
    modalActiveTier = currentTier;
    for (let t = 1; t <= 6; t++) {
      document.getElementById(`modal-tab-${t}`)?.classList.toggle('active', t === modalActiveTier);
    }
    renderModalDrills(modalActiveTier);
    if (modal) modal.style.display = 'flex';
  });

  btnCloseModal?.addEventListener('click', () => {
    if (modal) modal.style.display = 'none';
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });

  for (let t = 1; t <= 6; t++) {
    document.getElementById(`modal-tab-${t}`)?.addEventListener('click', () => {
      modalActiveTier = t;
      for (let i = 1; i <= 6; i++) {
        document.getElementById(`modal-tab-${i}`)?.classList.toggle('active', i === t);
      }
      renderModalDrills(t);
    });
  }
}

// ---------- Boot ----------

import('@dwell/webview/main').then(() => {
  console.log('[harness] webview loaded with 120-item corpus');
}).catch((err) => {
  console.error('[harness] failed to load webview:', err);
});

// Setup controls once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupControls);
} else {
  setupControls();
}
