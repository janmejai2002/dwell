import * as vscode from 'vscode';
import { DwellPanelProvider } from './panel';
import { AgentActivityMonitor } from './detect/index';
import { ClaudeHookSignal } from './detect/claudeHook';
import { ClaudeTranscriptSignal } from './detect/claudeTranscript';
import { TerminalShellSignal } from './detect/terminalShell';
import { TaskApiSignal } from './detect/taskApi';
import { DocBurstSignal } from './detect/docBurst';
import { FsWatchSignal } from './detect/fsWatch';
import { probeHostAgentApi } from './detect/hostProbe';
import { loadState, saveState } from './storage';
import {
  canOffer,
  recordOffer,
  recordIgnore,
  createOfferState,
  type OfferState,
  type OfferContext,
} from '@dwell/core';

let monitor: AgentActivityMonitor | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Extension activation.
 * Registers the WebviewViewProvider, toggle command, detection log command,
 * starts all 7 agent detection signals, and integrates the offer governor.
 */
export function activate(context: vscode.ExtensionContext): void {
  // Load persisted state
  const state = loadState(context);

  // Register the webview panel provider
  const panelProvider = new DwellPanelProvider(context, state);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'dwell.drillView',
      panelProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );

  // Context key for visible state
  void vscode.commands.executeCommand('setContext', 'dwell.visible', false);

  // Offer governance state (per-day accounting in globalState)
  const todayStr = new Date().toISOString().slice(0, 10);
  const savedOfferState = context.globalState.get<{ day: string; state: OfferState }>('dwell.offerState');
  let offerState: OfferState = (savedOfferState && savedOfferState.day === todayStr)
    ? savedOfferState.state
    : createOfferState();

  const persistOfferState = () => {
    void context.globalState.update('dwell.offerState', { day: todayStr, state: offerState });
  };

  // Status bar offer item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'dwell.toggle';
  statusBarItem.text = '$(flame) Dwell';
  statusBarItem.tooltip = 'Dwell: Agent mid-task (Ctrl+Alt+Space)';
  context.subscriptions.push(statusBarItem);

  // Context tracking for offer governor
  let activeTaskStartTs = 0;
  let lastKeystrokeTs = 0;
  let isWindowFocused = vscode.window.state.focused;
  let windowFocusedTs = Date.now();
  let isDND = false;

  let armingTimer: ReturnType<typeof setTimeout> | undefined;
  let retractionTimer: ReturnType<typeof setTimeout> | undefined;
  let isOffering = false;

  // Track editor keystrokes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(() => {
      lastKeystrokeTs = Date.now();
    }),
  );

  // Track window focus
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((e) => {
      isWindowFocused = e.focused;
      if (e.focused) {
        windowFocusedTs = Date.now();
      }
    }),
  );

  // Register toggle command
  context.subscriptions.push(
    vscode.commands.registerCommand('dwell.toggle', () => {
      if (isOffering) {
        isOffering = false;
        statusBarItem?.hide();
        if (retractionTimer) {
          clearTimeout(retractionTimer);
          retractionTimer = undefined;
        }
      }
      panelProvider.toggle();
    }),
  );

  // Register detection log command
  context.subscriptions.push(
    vscode.commands.registerCommand('dwell.showDetectionLog', () => {
      panelProvider.showDetectionLog();
    }),
  );

  // Build and configure the AgentActivityMonitor with all signals
  monitor = new AgentActivityMonitor();

  // Priority 100: Claude Hook IPC
  monitor.addSignal(new ClaudeHookSignal());

  // Priority 95 (if present): Host probe
  const hostSignal = probeHostAgentApi();
  if (hostSignal) {
    monitor.addSignal(hostSignal);
  }

  // Priority 80: Claude transcript watcher
  monitor.addSignal(new ClaudeTranscriptSignal());

  // Priority 60: Terminal shell executions
  monitor.addSignal(new TerminalShellSignal());

  // Priority 50: Task API
  monitor.addSignal(new TaskApiSignal());

  // Priority 30: Document burst heuristic
  monitor.addSignal(new DocBurstSignal());

  // Priority 20: Fallback file system watcher
  monitor.addSignal(new FsWatchSignal());

  // Start activity monitoring
  const monitorDisposable = monitor.start((event) => {
    if (event.kind === 'start') {
      activeTaskStartTs = event.at;
      panelProvider.onAgentStart(event);

      // Cancel existing arming timer if any
      if (armingTimer) {
        clearTimeout(armingTimer);
      }

      // Hard cap: 25s silent arming window. Most tasks end inside 25s.
      armingTimer = setTimeout(() => {
        const now = Date.now();
        const offerContext: OfferContext = {
          taskRunningMs: now - activeTaskStartTs,
          lastKeystrokeTs,
          isQuickPickOpen: false,
          isInputBoxOpen: false,
          isModalOpen: false,
          isDebuggerPaused: vscode.debug.activeDebugSession !== undefined,
          isZenMode: false,
          isWindowFocused,
          isDND,
          windowFocusedTs,
        };

        const decision = canOffer(offerState, now, offerContext);
        if (decision.allowed) {
          isOffering = true;
          offerState = recordOffer(offerState, now);
          persistOfferState();
          statusBarItem?.show();

          // Retract after 6s of ignore
          if (retractionTimer) {
            clearTimeout(retractionTimer);
          }
          retractionTimer = setTimeout(() => {
            if (isOffering) {
              isOffering = false;
              statusBarItem?.hide();
              offerState = recordIgnore(offerState);
              persistOfferState();
            }
          }, 6000);
        }
      }, 25000);
    } else {
      // Agent task end
      if (armingTimer) {
        clearTimeout(armingTimer);
        armingTimer = undefined;
      }
      if (retractionTimer) {
        clearTimeout(retractionTimer);
        retractionTimer = undefined;
      }
      if (isOffering) {
        isOffering = false;
        statusBarItem?.hide();
      }
      activeTaskStartTs = 0;
      panelProvider.onAgentEnd(event);
    }
  });
  context.subscriptions.push(monitorDisposable);

  // First run auto-reveal: open once immediately after install
  const firstRunDone = context.globalState.get<boolean>('dwell.firstRunDone', false);
  if (!firstRunDone) {
    void context.globalState.update('dwell.firstRunDone', true);
    // Reveal panel on first run
    setTimeout(() => {
      panelProvider.reveal('first-run');
    }, 500);
  }

  // Persist state on deactivation
  context.subscriptions.push({
    dispose: () => {
      if (armingTimer) clearTimeout(armingTimer);
      if (retractionTimer) clearTimeout(retractionTimer);
      saveState(context, panelProvider.getState());
      persistOfferState();
    },
  });
}

/**
 * Extension deactivation. Cleanup is handled by disposables.
 */
export function deactivate(): void {
  monitor = undefined;
  statusBarItem = undefined;
}
