# Dwell — Architecture

## 1. Shape

pnpm workspace, TypeScript everywhere, esbuild for both bundles.

```
packages/core        pure TS. drill engine, scoring, corpus, tier FSM. no DOM, no vscode.
packages/webview     the typing surface. vanilla TS + CSS. imports core.
packages/extension   VS Code host: activation, detection, IPC server, keybinding, storage.
packages/hook        hook.cjs — zero-dependency CommonJS single file for Claude Code.
apps/harness         a Vite page that mounts the webview outside VS Code, for visual and
                     perf verification by a browser agent and by Playwright.
```

`core` has no dependency on either host. That is what makes the harness possible, and the
harness is what makes an agent able to *verify* the thing rather than declare a green
build.

## 2. Webview vs native

Native VS Code UI (`TreeView`, `StatusBarItem`, `QuickPick`) cannot render a typing
surface with per-glyph state and a positioned caret. So: **webview**, specifically a
`WebviewViewProvider` registered into the **auxiliary bar (secondary sidebar)**.

Why the auxiliary bar and not an editor tab or a modal:
- It does not displace the code the agent is editing — you can watch the diff land while
  you type.
- It is dismissible with one keystroke and its visibility is a first-class `when` context,
  which makes the toggle trivial.
- A modal would steal focus from the editor on every offer, which §3 of the spec forbids.

Webview configuration:
- `retainContextWhenHidden: true` — the memory cost (~25–35MB) is the price of the 100ms
  open budget and we pay it knowingly.
- `enableScripts: true`, `localResourceRoots: [dist]`, strict CSP:
  `default-src 'none'; style-src ${cspSource} 'nonce-…'; script-src 'nonce-…'; font-src ${cspSource}; media-src 'none'; connect-src 'none'`.
  `connect-src 'none'` is load-bearing: the webview is structurally incapable of network
  access, which is how "no telemetry" becomes a fact rather than a promise.
- The status-bar item and Wick's pre-open offer are **native** (`StatusBarItem` +
  a 1-line `WebviewView` badge), so the offer costs nothing while the panel is hidden.

## 3. Message protocol (host ⇄ webview)

Small, versioned, one-way-per-message. All messages `{v:1, type, …}`.

Host → webview:
- `agent:start {estimateMs}` — begin the wick burn.
- `agent:end`
- `reveal {reason: 'hotkey'|'offer'|'first-run'}`
- `hide`
- `state:restore {tiers, prefs, recentRuns}` — sent once at activation.
- `theme {kind}`

Webview → host:
- `ready`
- `run:complete {tier, uWPM, latencyMs, longestClean, errors, durationMs, ts}`
- `run:abandon` — discarded, not persisted.
- `pref:set {sound?, dnd?}`
- `hook:install` — first-run button.

Persistence is host-side only. The webview never touches disk.

## 4. State and persistence

- **Preferences + tier unlocks + aggregates**: `context.globalState`. Tiny, synchronous
  enough, survives reinstall via Settings Sync if the user has it on.
- **Run history**: last 500 runs as a single JSON array at
  `context.globalStorageUri/runs.json`. Written atomically (write `runs.json.tmp`, then
  `rename`). Debounced 2000ms, plus a forced flush on `deactivate` and on panel hide.
  Flat file, not SQLite: 500 runs is ~60KB, and a native dependency would break the
  one-VSIX-for-four-hosts promise.
- **Offer accounting** (last offer time, offers today, consecutive ignores): `globalState`,
  keyed by day, pruned on activation.
- **Nothing is stored per-workspace.** Your typing speed is not a property of a repo.

## 5. Detection layer

`packages/extension/src/detect/` — one file per signal, all implementing:

```ts
interface Signal {
  id: string;
  priority: number;               // higher wins when several fire
  start(emit: (e: AgentEvent) => void): Disposable;
}
type AgentEvent = { kind: 'start' | 'end'; source: string; at: number };
```

`AgentActivityMonitor` merges them: a task is "running" from the first `start` until the
matching `end` from the same source, or a 15-minute ceiling. When several signals claim a
task, the highest-priority source owns the end event, so a hook `Stop` always beats a
document-burst timeout.

Priorities: `claude-hook 100`, `claude-transcript 80`, `terminal-shell 60`,
`task-api 50`, `doc-burst 30`, `fs-watch 20`.

Signals ship as: `claudeHook.ts`, `claudeTranscript.ts`, `terminalShell.ts`, `taskApi.ts`,
`docBurst.ts`, `fsWatch.ts`, plus `hostProbe.ts` which feature-detects host-specific
agent APIs at activation (see spec §4.3) and registers an extra signal if one exists.

The `OfferGovernor` sits between the monitor and the UI and owns every rule in spec §3.
It is a pure function of `(monitorState, keystrokeRecency, windowFocus, offerHistory,
clock)` so it is unit-testable without VS Code, and it is the file to point a reviewer at
when they ask whether the product is polite.

## 6. Claude Code hook contract

Full contract in spec §4.2. Implementation notes:

- `packages/hook/hook.cjs` is a **single CommonJS file, zero dependencies**, shipped
  inside the VSIX and referenced by absolute path in the generated settings. CommonJS so
  it runs on whatever Node the user already has, with no ESM/loader surprises.
- Installer: `installHook()` reads `~/.claude/settings.json`, backs it up to
  `settings.json.dwell-backup-<ts>`, **merges** (never replaces) the `hooks` object,
  preserving any existing entries for the same events by appending to their `hooks`
  arrays, and writes atomically. Uninstall removes only entries whose `command` contains
  the Dwell extension path.
- The extension's IPC server tolerates: stale socket files (probe-then-unlink), a missing
  `XDG_RUNTIME_DIR`, multiple editor windows (first listener wins; others connect as
  clients to it and get events rebroadcast — or, simpler for v1, later windows simply
  don't listen and rely on the transcript watcher. **OPEN**, see closing notes).
- Because the hook exits 0 and prints nothing under every failure mode, uninstalling or
  crashing Dwell can never break a Claude Code session. That property is worth more than
  any feature in this section.

## 7. Keybinding

`ctrl+alt+space` / `cmd+alt+space`, `when: "!terminalFocus"`. Toggle implemented as two
commands guarded by a context key `dwell.visible`, so the same chord opens and closes.
Chosen because it is unbound in VS Code, Cursor, Windsurf and Antigravity defaults, and is
not claimed by macOS input-source switching (which is `ctrl+space`) or by common terminal
multiplexers.

## 8. Packaging and distribution

- **One VSIX.** `engines.vscode: ^1.93.0` (the floor for the stable terminal shell
  integration API). No `vscode.proposed.*` APIs — proposed APIs cannot ship to Open VSX
  and would break the one-codebase promise immediately.
- Built with `@vscode/vsce package`. Fonts and corpus are bundled assets; `.vscodeignore`
  excludes sources, tests and the harness so the VSIX stays under ~2MB.
- **Published to Open VSX** (`ovsx publish`) — this is the registry Cursor, Windsurf and
  Antigravity resolve against — **and** to the VS Code Marketplace. Same VSIX to both.
- One-step install for a non-technical user: search the extension panel, click Install.
  Activation event `onStartupFinished`, then the panel reveals itself once on first run.
  The Claude Code hook is an optional single button inside that first run, not a terminal
  command and not a prerequisite.
- Versioning: semver, `CHANGELOG.md`, signed releases from CI. No auto-update behaviour of
  our own — the host handles it.

## 9. Testing

- `core`: vitest. Scoring maths, tier FSM, uWPM edge cases (correction spanning a word
  boundary, newline counting, abandoned runs), and the `OfferGovernor` truth table.
- `extension`: `@vscode/test-electron` integration tests for activation time, the IPC
  server round-trip with a spawned `hook.cjs`, and the settings-merge installer against
  fixture `settings.json` files including a malformed one.
- `webview` / visual: Playwright against `apps/harness` — keystroke handling, correctness
  states, reduced-motion, light/dark, and the perf assertions in design-system §9.
- The perf test and a screenshot-diff of the idle screen are both blocking in CI.
