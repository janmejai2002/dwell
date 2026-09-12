---
name: host-detection
activation: glob
globs: ["packages/extension/**", "packages/hook/**"]
description: How Dwell infers that an agent is mid-task on each host, the signal interface and priorities, the Claude Code hook contract, and the offer governor.
---

# Host detection rules

**The honest premise: no host exposes "an agent is thinking" as a public API.** Everything
here is inference. So the bias is deliberate and one-directional: **prefer a false negative
to a false positive.** Missing an occasion costs nothing. Inventing one costs the product.

## The signal interface

```ts
interface Signal {
  id: string;
  priority: number;
  start(emit: (e: AgentEvent) => void): vscode.Disposable;
}
type AgentEvent = { kind: 'start' | 'end'; source: string; at: number };
```

`AgentActivityMonitor` merges signals. A task runs from the first `start` until the matching
`end` from the same source, or a 15-minute ceiling. When several signals claim the same
task, the highest-priority source owns the end event — so a hook `Stop` always beats a
document-burst timeout.

Priorities: `claude-hook 100`, `claude-transcript 80`, `terminal-shell 60`, `task-api 50`,
`doc-burst 30`, `fs-watch 20`.

## Signals

- **`claudeHook.ts`** (100) — a `net.createServer` listener receiving frames from
  `hook.cjs`. Authoritative start and end. See the contract below.
- **`claudeTranscript.ts`** (80) — watches `~/.claude/projects/**/*.jsonl` for append
  activity. Needs no configuration at all, so this is the **default** path and the hook is
  the upgrade. ~1s resolution, no clean end event; end is inferred from 4s of quiet.
- **`terminalShell.ts`** (60) — `window.onDidStartTerminalShellExecution` /
  `onDidEndTerminalShellExecution`. Exact start and end plus the command line. Filter to
  commands that plausibly run long; never fire on a `cd` or an `ls`.
- **`taskApi.ts`** (50) — `tasks.onDidStartTask` / `onDidEndTask`. Covers builds and tests.
- **`docBurst.ts`** (30) — the cross-host fallback for in-editor agents, specified below.
- **`fsWatch.ts`** (20) — `createFileSystemWatcher` for writes to files not open in editors.
- **`hostProbe.ts`** — at activation, feature-detect any host-specific agent API via
  `vscode.extensions.all` and the global namespace, and register an extra signal if one
  exists. Do **not** hard-code an assumption that it does or does not.

## The document-burst heuristic, specified

A burst is: **≥6 `TextDocumentChangeEvent`s within 3 seconds, spanning ≥2 distinct files**,
where no event has `reason === Undo|Redo`, where each event has at least one content change
with `text.length > 24` or spanning more than one line, and where **at least one changed
document is not the active editor's document**.

Rationale: humans produce single-character changes in the focused editor; agents produce
multi-line rewrites, often in files that are not on screen.

Burst end: 4 seconds with no qualifying event.

Known false positives, and their mitigations: find-and-replace across files, formatters on
save, and `git checkout`. Suppress during the `onWillSaveTextDocument` window, and for 5
seconds after any SCM state change.

## Per-host verdict — be honest about this in any user-facing copy

- **Claude Code, in any host's terminal** — excellent. Hook events are exact. Flagship path.
- **VS Code with an extension-based agent** — good. Terminal shell integration plus bursts
  covers most agents; file-writing agents are caught well.
- **Antigravity** — unknown at spec time; treat as good-with-a-probe. It is a VS Code fork,
  so the standard APIs are present. Probe for an agent-status API at activation and prefer
  it if found. Until confirmed: bursts plus terminal.
- **Cursor** — degraded, and say so. Agent state lives in its own extension host and in
  workspace-storage SQLite. There is no supported way to read it, and **reverse-engineering
  it is forbidden** — it breaks on every release and it is rude. Cursor Agent writes files
  heavily so bursts work; chat-only turns are missed, which is acceptable because they are
  short.
- **Windsurf** — same as Cursor, same reasoning, same degradation.

Users never see any of this. There is no detection-mode setting. There is one hidden
command, `Dwell: Show detection log`, for bug reports.

## Claude Code hook contract

Registered in `~/.claude/settings.json` (global) or `.claude/settings.json` (project), on
the events `SessionStart`, `UserPromptSubmit`, `Notification`, `Stop`, `SubagentStop`, each
invoking `node <ext>/hook.cjs <name>`.

`hook.cjs` must:

- Read the hook payload from stdin with a **50ms cap**. If stdin is slow, give up.
- Write **one line** of JSON to a per-user endpoint —
  POSIX `${XDG_RUNTIME_DIR:-/tmp}/dwell-${uid}.sock` (mode 0600), Windows
  `\\.\pipe\dwell-<username>`. Frame:
  `{"v":1,"event":"task-start","sessionId":"…","cwd":"…","ts":1736…}`.
- Use a **20ms connect timeout**, and **exit 0 silently** if nothing is listening.
- **Always exit 0. Always print nothing to stdout or stderr.** Under every failure mode.
- Be a single zero-dependency CommonJS file. Total budget ~15ms.
- Never touch the network. Never write outside the socket.

A hook that can block, slow, or perturb a Claude Code session is unshippable. That property
is worth more than any feature in this file. `packages/hook/test/` must assert it directly:
exit code 0 and empty output with no listener, with a malformed payload, with a closed
stdin, and with an unwritable socket path.

Extension side: tolerate stale socket files (probe, then unlink on EADDRINUSE), a missing
`XDG_RUNTIME_DIR`, and multiple editor windows.

Installer: read `~/.claude/settings.json`, back it up to `settings.json.dwell-backup-<ts>`,
**merge** — never replace — the `hooks` object, appending to existing per-event arrays, and
write atomically. Uninstall removes only entries whose `command` contains the Dwell
extension path. A malformed existing settings file must abort the install with a clear
message and change nothing.

## The offer governor

Every rule in `.agents/rules/00-product.md` under "Interruption governance" lives in
`packages/core/src/offer-governor.ts` as a pure function of
`(monitorState, keystrokeRecency, windowFocus, offerHistory, clock)`.

No appearance trigger may exist anywhere else in the codebase. Any change that makes Dwell
appear more often is wrong by default and needs an explicit decision recorded in
`docs/SPEC.md` before it is written.
