import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import type { AgentEvent } from './detect/index';

/** Persisted state shape */
export interface DwellState {
  tiers: Record<string, boolean>;
  prefs: { sound: boolean; dnd: boolean };
  recentRuns: number[];
}

const DEFAULT_STATE: DwellState = {
  tiers: {},
  prefs: { sound: true, dnd: false },
  recentRuns: [],
};

/**
 * WebviewViewProvider for the Dwell drill panel.
 *
 * Responsibilities:
 * - Build the webview HTML with CSP nonces and URI substitutions
 * - Handle reveal/hide lifecycle
 * - Relay host ⇄ webview messages
 * - Pass agent detection events to the webview
 */
export class DwellPanelProvider implements vscode.WebviewViewProvider {
  private _view: vscode.WebviewView | undefined;
  private _state: DwellState;
  private _detectionLog: string[] = [];

  constructor(
    private readonly _context: vscode.ExtensionContext,
    state: DwellState,
  ) {
    this._state = state;
  }

  /**
   * Called by VS Code when the webview view needs to be resolved.
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _resolveContext: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._context.extensionUri, 'dist'),
      ],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      (msg: { v: number; type: string; [key: string]: unknown }) => {
        if (msg.v !== 1) return;

        switch (msg.type) {
          case 'ready':
            this._onReady();
            break;
          case 'run:complete':
            this._onRunComplete(msg);
            break;
          case 'run:abandon':
            // Discarded — not persisted
            break;
          case 'pref:set':
            this._onPrefSet(msg);
            break;
          case 'hook:install':
            this._onHookInstall();
            break;
        }
      },
      undefined,
      this._context.subscriptions,
    );

    // Handle visibility changes
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this._postMessage({ v: 1, type: 'reveal', reason: 'visibility' });
      } else {
        this._postMessage({ v: 1, type: 'hide' });
      }
    });
  }

  /**
   * Generate the webview HTML with nonce-substituted CSP.
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = crypto.randomBytes(16).toString('hex');

    // Resolve URIs from extension dist directory
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'dist', 'webview.js'),
    );
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'dist', 'webview.css'),
    );
    const cspSource = webview.cspSource;

    // Read the HTML template from dist/index.html, falling back to ../webview/index.html
    const distHtmlPath = path.join(this._context.extensionUri.fsPath, 'dist', 'index.html');
    const fallbackHtmlPath = path.join(this._context.extensionUri.fsPath, '..', 'webview', 'index.html');
    const htmlPath = fs.existsSync(distHtmlPath) ? distHtmlPath : fallbackHtmlPath;

    let html: string;
    try {
      html = fs.readFileSync(htmlPath, 'utf-8');
    } catch {
      // Fallback inline HTML if template not found
      html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src {{cspSource}} 'nonce-{{nonce}}'; script-src 'nonce-{{nonce}}'; font-src {{cspSource}};">
  <link rel="stylesheet" nonce="{{nonce}}" href="{{stylesUri}}">
  <title>Dwell</title>
</head>
<body>
  <div id="dwell-root">
    <div id="wick-container" style="contain: strict;"></div>
    <div id="drill-container" style="contain: strict;"></div>
    <div id="metrics-strip"></div>
    <div id="trace-container"></div>
    <div id="idle-info"></div>
  </div>
  <script nonce="{{nonce}}" src="{{scriptUri}}"></script>
</body>
</html>`;
    }

    html = html
      .replace(/\{\{nonce\}\}/g, nonce)
      .replace(/\{\{cspSource\}\}/g, cspSource)
      .replace(/\{\{scriptUri\}\}/g, scriptUri.toString())
      .replace(/\{\{stylesUri\}\}/g, stylesUri.toString());

    return html;
  }

  /**
   * Reveal the webview panel with a specific reason.
   */
  reveal(reason: 'hotkey' | 'offer' | 'first-run' = 'hotkey'): void {
    if (this._view) {
      this._view.show(true);
      this._postMessage({ v: 1, type: 'reveal', reason });
    }
  }

  /**
   * Toggle panel visibility.
   */
  toggle(): void {
    if (this._view) {
      if (this._view.visible) {
        this._postMessage({ v: 1, type: 'hide' });
      } else {
        this._view.show(true);
        this._postMessage({ v: 1, type: 'reveal', reason: 'hotkey' });
      }
    }
  }

  /**
   * Show detection log in an output channel.
   */
  showDetectionLog(): void {
    const channel = vscode.window.createOutputChannel('Dwell Detection');
    channel.clear();
    for (const line of this._detectionLog) {
      channel.appendLine(line);
    }
    channel.show();
  }

  /**
   * Handle agent:start event from the detection layer.
   */
  onAgentStart(event: AgentEvent): void {
    this._detectionLog.push(
      `[${new Date(event.at).toISOString()}] agent:start source=${event.source}`,
    );
    this._postMessage({ v: 1, type: 'agent:start', source: event.source });
  }

  /**
   * Handle agent:end event from the detection layer.
   */
  onAgentEnd(event: AgentEvent): void {
    this._detectionLog.push(
      `[${new Date(event.at).toISOString()}] agent:end source=${event.source}`,
    );
    this._postMessage({ v: 1, type: 'agent:end', source: event.source });
  }

  /**
   * Get current state for persistence.
   */
  getState(): DwellState {
    return { ...this._state };
  }

  // ---------- Private handlers ----------

  private _onReady(): void {
    // Send restored state on first ready
    this._postMessage({
      v: 1,
      type: 'state:restore',
      tiers: this._state.tiers,
      prefs: this._state.prefs,
      recentRuns: this._state.recentRuns,
    });

    // Send current theme
    const themeKind = vscode.window.activeColorTheme.kind;
    let theme: string;
    switch (themeKind) {
      case vscode.ColorThemeKind.Light:
        theme = 'light';
        break;
      case vscode.ColorThemeKind.HighContrast:
        theme = 'hc-dark';
        break;
      case vscode.ColorThemeKind.HighContrastLight:
        theme = 'hc-light';
        break;
      default:
        theme = 'dark';
    }
    this._postMessage({ v: 1, type: 'theme', kind: theme });
  }

  private _onRunComplete(msg: Record<string, unknown>): void {
    // Persist run data
    const uWPM = typeof msg['uWPM'] === 'number' ? msg['uWPM'] : 0;
    this._state.recentRuns.push(uWPM);
    // Keep last 500
    if (this._state.recentRuns.length > 500) {
      this._state.recentRuns = this._state.recentRuns.slice(-500);
    }
  }

  private _onPrefSet(msg: Record<string, unknown>): void {
    if (typeof msg['sound'] === 'boolean') {
      this._state.prefs.sound = msg['sound'];
    }
    if (typeof msg['dnd'] === 'boolean') {
      this._state.prefs.dnd = msg['dnd'];
    }
  }

  private _onHookInstall(): void {
    try {
      const hookPath = path.join(this._context.extensionPath, 'dist', 'hook.cjs');
      const { installClaudeHook } = require('./hook-installer');
      const res = installClaudeHook(hookPath);
      if (res.success) {
        void vscode.window.showInformationMessage('Dwell: Claude Code hook successfully installed.');
      } else {
        void vscode.window.showWarningMessage(`Dwell: Could not install Claude Code hook (${res.error ?? 'unknown error'}).`);
      }
    } catch (e) {
      void vscode.window.showErrorMessage(`Dwell: Hook installation error: ${e}`);
    }
  }

  private _postMessage(msg: Record<string, unknown>): void {
    if (this._view) {
      void this._view.webview.postMessage(msg);
    }
  }
}
