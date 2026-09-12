---
name: architecture
activation: always_on
description: Package boundaries, webview configuration, host-webview message protocol, persistence, keybinding, packaging and distribution.
---

# Architecture rules

## Package boundaries — enforced, not stylistic

```
packages/core        pure TS. no `vscode` import, no DOM, zero runtime dependencies.
packages/webview     the typing surface. vanilla TS + CSS. imports core.
packages/extension   host integration. imports core. never imports webview source.
packages/hook        one zero-dependency CommonJS file.
apps/harness         mounts webview outside VS Code. the reason core must stay pure.
```

If `packages/core` acquires a dependency on `vscode` or on the DOM, the harness stops
working and with it the only way to verify this product visually. Treat that as a build
break, and add a lint rule that fails on the import.

No UI framework in `packages/webview`. A reconciler in the keystroke path costs 2–6ms to
achieve what two `classList` calls do in microseconds. Bundle budget: **under 40KB
gzipped**, fonts excluded.

## Webview configuration

A `WebviewViewProvider` registered into the **auxiliary bar (secondary sidebar)**. Not an
editor tab (it would displace the code the agent is editing), not a modal (it would steal
focus on every offer, which the product forbids).

- `retainContextWhenHidden: true`. The ~25–35MB is the price of the 100ms open budget and
  we pay it knowingly. Hiding sets `display:none` and suspends the rAF loop; showing is a
  class toggle plus `focus()`. **Never dispose and recreate the webview to save memory.**
- `enableScripts: true`, `localResourceRoots` limited to `dist`.
- CSP, with nonces substituted by the host at HTML generation time:
  `default-src 'none'; style-src ${cspSource} 'nonce-…'; script-src 'nonce-…'; font-src ${cspSource}; media-src 'none'; connect-src 'none'`
  `connect-src 'none'` is load-bearing: it makes "no telemetry" a structural fact rather
  than a promise. Do not relax it for any reason.
- The pre-open offer is **native** (`StatusBarItem` plus a view badge), so it costs nothing
  while the panel is hidden.

## Message protocol

All messages are `{ v: 1, type, ... }`. Types live in `packages/core/src/types.ts` as a
discriminated union; both sides import it, so an unhandled case is a compile error.

Host → webview: `agent:start {estimateMs}`, `agent:end`,
`reveal {reason:'hotkey'|'offer'|'first-run'}`, `hide`,
`state:restore {tiers, prefs, recentRuns}` (once at activation), `theme {kind}`.

Webview → host: `ready`, `run:complete {tier,uWPM,latencyMs,longestClean,errors,durationMs,ts}`,
`run:abandon`, `pref:set {sound?,dnd?}`, `hook:install`.

The webview never touches disk and never has network access. Persistence is host-side only.

## Persistence

- Preferences, tier unlocks and aggregates → `context.globalState`.
- Run history → last 500 runs as a JSON array at `context.globalStorageUri/runs.json`.
  Written atomically: write `runs.json.tmp`, then `rename`. Debounced 2000ms, with a forced
  flush on `deactivate` and on panel hide.
- Offer accounting (last offer time, offers today, consecutive ignores) → `globalState`,
  keyed by day, pruned at activation.
- **Nothing is stored per-workspace.** Typing speed is not a property of a repo.
- No SQLite and no native module. A native dependency breaks the one-VSIX-for-four-hosts
  promise on the first platform mismatch.

## Activation and the 100ms budget

`onStartupFinished`. At activation: resolve the webview provider, build the HTML, preload
corpus and fonts, restore state, start detection signals, register commands. By the time
the user first presses the chord, the only remaining work is a visibility toggle and a
`focus()`.

Do not do file I/O, corpus parsing, or font loading in the reveal path. If you add work to
`panel.reveal()`, the perf test should fail; if it does not, the perf test is wrong and
needs fixing in the same change.

## Keybinding

`ctrl+alt+space` / `cmd+alt+space`, `when: "!terminalFocus"`. Implemented as two commands
guarded by the `dwell.visible` context key so one chord toggles. It is unbound by default in
VS Code, Cursor, Windsurf and Antigravity, and does not collide with macOS input-source
switching (`ctrl+space`) or common terminal multiplexers.

## Packaging and distribution

- **One VSIX for all four hosts.** `engines.vscode: ^1.93.0`.
- **No `vscode.proposed.*` APIs.** Proposed APIs cannot ship to Open VSX and would break
  the single-codebase promise immediately. If a feature seems to need one, the feature is
  wrong.
- Built with `@vscode/vsce package`. Fonts and corpus are bundled assets. `.vscodeignore`
  excludes sources, tests and the harness. Target VSIX size under 2MB.
- Published to **Open VSX** (`ovsx publish`) — the registry Cursor, Windsurf and Antigravity
  resolve against — and to the VS Code Marketplace. Same artifact to both.
- One-step install: search, click Install, and the panel reveals itself once. The Claude
  Code hook is one optional button inside that first run, never a terminal command and
  never a prerequisite.
- Semver, `CHANGELOG.md` written before the release, signed releases from CI.
