# Dwell — Product Spec (v1)

A typing trainer for prompt writing that lives in the editor and only appears while a
coding agent is busy.

---

## 1. The loop

1. An agent starts a task. Dwell notices (see §4).
2. Dwell arms a timer. It does nothing for 25 seconds. Most agent tasks end inside 25
   seconds, and interrupting those is the failure mode that kills the product.
3. If the task is still running at 25s, **Wick** appears in the bottom-right of the
   auxiliary sidebar and in the status bar. Wick is a 2px vertical line with a small
   flame at the top. It does not take focus, does not move the editor, does not animate
   more than the sway described in the design system.
4. One keystroke — `Ctrl+Alt+Space` (`Cmd+Alt+Space` on macOS) — opens the drill panel.
   It opens already focused and already accepting keystrokes. Budget: reveal to first
   accepted keystroke under 100ms at p95.
5. You type a drill. Real prompt text: plain words, `Enter`, `---`, `>`. No brackets, no
   symbols, no code.
6. The agent's task ends. The drill does not stop. The panel dims its chrome by one step
   and Wick's flame goes out. You finish the line you are on or you press the same
   keystroke and the panel is gone. Nothing summarises anything at you.
7. Results are written to disk. No modal, no confetti, no "streak saved."

The same keystroke opens Dwell when no agent is running. The agent is the occasion, not
the gate.

### First run

Install completes → the panel opens itself once, immediately, with a drill already
loaded and the caret already blinking-free and placed. There is no settings page, no
welcome walkthrough, no account. The only interactive element on first run besides the
drill is a single line under it: `Also trigger from Claude Code? [Enable]`, which writes
the hook config (§4.2) and then removes itself permanently. Declining it never asks again.

---

## 2. The character bible — Wick

**What it is.** A small flame on a wick. Rendered as a 2px line in `--accent` with a
5×8px flame form at the top. Its height is a real measurement: it is the elapsed time of
the current agent task against a running median of your recent agent tasks. A long task
burns the wick down. When the task ends, the flame goes out — a 180ms fade, no puff of
smoke, no particles.

This is personification with a job. Wick is not decoration that also has a personality;
Wick is a progress indicator that happens to be alive. That is the whole trick and it is
the thing to protect.

**Temperament.** Dry, competent, faintly bored. A good lab technician. Wick has opinions
and states them once. It never uses an exclamation mark, never uses "Great job", never
uses your name, never uses emoji, never asks a question it does not need answered. It
speaks in lower case, in fragments, in `--ink-200`, at 12px, for no more than 3 seconds.
Its total vocabulary in v1 is under 40 strings.

**Behaviour table.**

| Situation | Wick does |
| --- | --- |
| Agent task starts | nothing for 25s |
| Task passes 25s, offer permitted (§3) | appears. no sound. no text. |
| You press the hotkey | panel opens, Wick moves to the top-left of the panel and becomes the timer |
| You are fast (uWPM in your top decile) | nothing during the run. after: `fastest in 40.` once. |
| You are slow | nothing. ever. Dwell never comments on being slow. |
| You make an error | nothing. the glyph simply does not light (§design). |
| You make 5 errors in 10 keystrokes | after the run only: `that one was awkward. again?` and the same drill is re-queued. |
| You quit mid-drill | the panel closes. the partial run is discarded, not scored. Wick says nothing. Discarding is the point: quitting must be free. |
| You ignore the offer (no keypress in 6s) | Wick retracts over 160ms. |
| You ignore three offers in a row | offers stop for the rest of the session. The hotkey still works. Wick does not mention this. |
| You open Dwell yourself with no agent running | Wick appears unlit, as a plain 2px line. It is a caret, not a character, when it has nothing to time. |
| You hit a tier unlock | `frame is open.` on one line. No badge. |
| You have not typed in 10 days | nothing. There is no re-engagement behaviour. Dwell does not chase. |

**Three rules that override the table.** (1) Wick never speaks while you are typing.
(2) Wick never speaks twice about the same run. (3) If a line would be encouragement,
it is cut.

---

## 3. Interruption ethics

The offer is the riskiest 200ms in the product. Design the restraint before the reward.

**Hard caps.**
- `T_arm = 25s`. No offer before the agent task has run 25 seconds.
- One offer per agent task. Never two.
- One offer per 20 minutes of wall clock.
- Four offers per calendar day.
- Zero offers in the first 90 seconds after the window regains focus (you just came back
  to work; you are not idle, you are reading).

**Suppression conditions.** Wick does not appear if any of these hold:
- A keystroke landed anywhere in the editor in the last 4 seconds.
- A quick-pick, input box, notification toast, or modal is open.
- The debugger is paused at a breakpoint.
- Zen mode is on, or the window is not focused.
- The user set Do Not Disturb (a single status-bar click; persists until cleared).
- A drill was completed in the last 10 minutes.

**Earned appearances.** After first run, Dwell must earn the right to offer again. The
offer budget refills only if your previous session ended with a completed drill, or 24
hours have passed. Two sessions of being ignored and Dwell becomes hotkey-only until you
invoke it yourself. It never announces this state.

**How it reads the room.** Three inputs, all local and cheap: keystroke recency (are you
working?), window focus (are you here?), and offer history (have I already asked?). No
CPU sampling, no camera, no "are you still there?" prompts.

**How it leaves.** Retraction is the default and is faster than appearance — 160ms out
versus 220ms in, so declining never feels like a struggle. Escape closes. The hotkey
closes. Clicking the editor closes. Agent task ending does not close it, because
yanking the panel away mid-word is worse than leaving it.

**The escalation we are not building.** No sound on the offer. No badge count. No
"3 drills to your next tier" nudge. No daily streak. No notification outside the editor
window, ever.

---

## 4. Detection, per host

The honest framing: **no host exposes "an agent is thinking" as a public API.** We are
inferring it. So the design is a ranked signal list with per-host fallbacks, and a
deliberate bias toward false negatives — missing an occasion costs nothing, inventing
one costs the product.

### 4.1 Signals available

| Signal | API | Quality | Hosts |
| --- | --- | --- | --- |
| Terminal shell execution | `window.onDidStartTerminalShellExecution` / `onDidEndTerminalShellExecution` (shell integration) | **Strong.** Exact start/end, and the command line. | All four |
| Task lifecycle | `tasks.onDidStartTask` / `onDidEndTask` | Strong, but only covers builds/tests | All four |
| Document-change bursts | `workspace.onDidChangeTextDocument` | **Medium.** The workhorse for in-editor agents. | All four |
| File system writes outside open editors | `workspace.createFileSystemWatcher` | Medium | All four |
| Claude Code session transcript | file watch on `~/.claude/projects/**/*.jsonl` | Strong for Claude Code, no hook needed | All four |
| Claude Code hooks | hook → local socket (§4.2) | **Strongest available signal in the product** | All four (terminal) |
| Debug sessions | `debug.onDidStartDebugSession` | Strong but rarely an agent | All four |
| Host agent state (Cursor/Windsurf/Antigravity internals) | none public | **Unavailable** | — |

**The document-change burst heuristic**, specified, because it is the cross-host fallback
and it must not misfire:

> A burst is: ≥ 6 `TextDocumentChangeEvent`s within 3 seconds, spanning ≥ 2 distinct
> files, where **no** event has `reason === TextDocumentChangeReason.Undo|Redo`, and
> where each event's `contentChanges` contains at least one change whose `text.length > 24`
> or that spans more than one line. Human typing produces single-character changes in the
> focused editor; agents produce multi-line rewrites, often in files that are not the
> active editor. Additionally require that at least one changed document is **not** the
> active editor's document. Burst start = first event. Burst end = 4 seconds with no
> qualifying event.

This is a heuristic and will have false positives on find-and-replace-across-files and on
formatters and on `git checkout`. Mitigations: ignore changes attributable to a
`WorkspaceEdit` we can see originate from a save-format (`onWillSaveTextDocument`
window), and suppress for 5 seconds after any SCM state change.

### 4.2 Claude Code hooks — the contract

This is the only signal that is actually authoritative, and it is the reason terminal
users get the best experience.

Registered in `~/.claude/settings.json` (global) or `.claude/settings.json` (project):

```jsonc
{
  "hooks": {
    "SessionStart":     [{ "hooks": [{ "type": "command", "command": "node <ext>/hook.cjs session-start" }] }],
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "node <ext>/hook.cjs task-start" }] }],
    "Notification":     [{ "hooks": [{ "type": "command", "command": "node <ext>/hook.cjs notify" }] }],
    "Stop":             [{ "hooks": [{ "type": "command", "command": "node <ext>/hook.cjs task-end" }] }],
    "SubagentStop":     [{ "hooks": [{ "type": "command", "command": "node <ext>/hook.cjs subagent-end" }] }]
  }
}
```

`hook.cjs` behaviour, which is the whole contract:

- Reads the hook payload JSON from stdin with a 50ms cap. If stdin is slow, give up.
- Writes **one line** of JSON to a per-user IPC endpoint:
  - POSIX: `${XDG_RUNTIME_DIR:-/tmp}/dwell-${uid}.sock` (unix domain socket, mode 0600)
  - Windows: `\\.\pipe\dwell-<username>`
- Frame: `{"v":1,"event":"task-start","sessionId":"…","cwd":"…","ts":1736…}`
- Connect timeout 20ms. If nothing is listening, **exit 0 silently**. Dwell not running
  must never be visible to the user of Claude Code.
- **Always exits 0. Always prints nothing to stdout or stderr.** A hook that can block,
  slow, or perturb Claude Code is an unshippable hook. Total budget: 15ms typical.
- No network. No writes outside the socket. Single file, zero dependencies, CommonJS so
  it runs on any Node the user already has.

Extension side: a `net.createServer` listener created at activation, torn down on
deactivate, with a stale-socket unlink on EADDRINUSE after a failed connect probe.
Task considered running from `task-start` until `task-end` or 15 minutes, whichever first.

**Fallback if hooks are not installed:** watch `~/.claude/projects/**/*.jsonl` for append
activity. Appends during a turn, quiet between turns. Coarser (a ~1s resolution and no
clean end event) but it needs no configuration at all, so it is the default and the hook
is the upgrade.

### 4.3 Per-host verdict

- **Claude Code (any host's terminal)** — Excellent. Hook events are exact. Ship this as
  the flagship path.
- **VS Code with an extension-based agent (Copilot, Cline, etc.)** — Good. Terminal shell
  integration plus document bursts covers most agents. Cline and similar write files
  constantly, which the burst detector catches well.
- **Antigravity** — Unknown at spec time, treat as Good-with-a-probe. It is a VS Code
  fork, so the standard APIs are present. At activation, probe for any additional
  `antigravity.*` or agent-manager API surface via `vscode.extensions.all` and feature-
  detect; if an agent-status event exists, prefer it and log which signal won. Do not
  hard-code an assumption either way. Until confirmed: document bursts + terminal.
- **Cursor** — Degraded, and say so. Cursor's agent state lives in its own extension host
  and in workspace-storage SQLite. There is no supported way to read it, and reverse-
  engineering it is an explicit non-goal (it breaks every release and it is rude).
  Cursor Agent does write files heavily, so the burst detector works; Cursor Tab and
  chat-only turns will be missed. That is acceptable — those are short.
- **Windsurf** — Same as Cursor, same reasoning, same degradation.

Users never see any of this. There is no "detection mode" setting. There is one hidden
command, `Dwell: Show detection log`, for bug reports.

---

## 5. Curriculum

The argument: generic typing tests train you on the wrong distribution. They optimise
transcription of English prose. Prompt writing is (a) a different vocabulary, (b)
structured by newline and delimiter rather than by comma, and (c) ultimately composition
from memory rather than transcription. So the ladder moves from motor skill to structural
fluency to authorship. Only the first three tiers are typing tests at all.

**Tier 1 — Plain.** Single-line prompt sentences drawn from a corpus of ~1,200 words
weighted by frequency in actual prompt text, not general English: *refactor, endpoint,
repro, idempotent, schema, flaky, revert, migration, assert, stub, throughput*. Teaches
raw speed on the words you will actually type. *Target: 55 uWPM.*

**Tier 2 — Break.** Multi-line prompts where `Enter` carries meaning: one instruction per
line, no punctuation at line ends. Teaches the return key as a thought boundary and
retrains the pinky that generic tests barely exercise. *Target: 55 uWPM including
newlines counted as characters.*

**Tier 3 — Rule.** Introduces `---` and `>`. Drills alternate instruction blocks and
quoted context blocks separated by a horizontal rule. Teaches the physical gesture of
separating what you want from the material you are talking about. *Target: 50 uWPM.*

**Tier 4 — Frame.** Whole prompts to a fixed shape: Goal / Context / Constraints / Done.
The target text is visible the whole time. Teaches the shape by hand-repetition, which is
how shapes get learned. *Target: 48 uWPM, 4 frames without a structural omission.*

**Tier 5 — Recall.** The prompt is shown for 4 seconds, then hidden. You type it from
memory. Scoring switches: uWPM still measured, but the run passes on **structural
recall** (did you reproduce all four sections and the constraints) rather than
character-exactness. This is the tier where typing becomes prompting.

**Tier 6 — Cold.** One sentence of task description appears — *"make the test suite run
on pull requests only, and cache node_modules"*. You write the prompt. No target text
exists. Scored on structure coverage (are Goal, Constraints and Done present and
non-empty) and on latency-to-first-keystroke. Speed is displayed but does not gate
anything. There is no correct answer and Dwell does not pretend to grade one.

**Progression rule.** A tier unlocks on **three consecutive runs** at or above target
with ≤ 2% uncorrected error. Consecutive, not best-of. One good run is luck; three is a
skill. Tiers never lock again. You can always drop back to any unlocked tier, and Tier 1
is always one keypress away because sometimes you just want to type.

**Corpus.** ~400 authored drill items shipped in the VSIX as JSON. Static, no LLM calls,
no network, works offline, identical for every user. Written by hand so that every item is
a prompt a person might really send.

---

## 6. Metrics

Three. Two are shown during a run; one only after.

**1. uWPM — unbroken words per minute.** Gross WPM (chars/5 ÷ minutes) computed only over
stretches of keystrokes containing no correction. A backspace ends the current stretch;
the next correct keystroke starts a new one. Time inside corrections is excluded from both
numerator and denominator.
*Why:* it collapses speed and accuracy into one honest number. You cannot inflate it by
typing fast and fixing later, and it does not punish you twice for one mistake. It is also
the number that tracks real-world prompt throughput, because in real writing you do pause
and fix, and what matters is how long your clean runs are.

**2. Latency — milliseconds from prompt-visible to first keystroke.** Shown only in Tiers
5 and 6.
*Why:* it is the only metric in the product that measures prompting rather than typing.
Hesitation before the first character is composition cost. Watching it fall from 4s to
900ms over a month is the actual claim of the product, made checkable.

**3. Longest clean run.** The longest consecutive-correct keystroke count in the session.
*Why:* it is the metric that moves first when you improve, so it is the one that makes
practice feel like it is working in week one, before uWPM budges. It is also trivially
cheap to compute and impossible to misread.

**Rejected, with reasons.**
- *Raw WPM* — inflated by short words and by the backspace-heavy typing style it
  implicitly encourages. Superseded by uWPM.
- *Accuracy %* — double-counts with uWPM and produces the perverse incentive to type
  slowly. Also a 97%-vs-98% difference is noise the user cannot act on.
- *Total time practised* — vanity. Rewards presence, not improvement, and pushes the
  product toward wanting your time, which is exactly the thing §3 is built to prevent.
- *Daily streaks / XP / levels* — a guilt engine. Directly contradicts "you can ignore
  this forever and it will not chase you."
- *Leaderboards* — turns a 90-second gap-filler into an obligation with other people in
  it. Also requires a server, an account, and telemetry, all of which are non-goals.
- *Keystroke heatmaps / per-finger analysis* — real, but it is a different product, and it
  makes the idle screen busy.

---

## 7. Non-goals (v1)

- No account, no sign-in, no sync, no server. All state is local.
- No telemetry leaving the machine. Not anonymised, not opt-out. None.
- No LLM calls. The corpus is static and shipped.
- No chat interface anywhere in the product.
- No typing of code, brackets, or symbols. This is the constraint the product is built on.
- No leaderboards, streak days, XP, levels, badges, or achievements.
- No settings page on first run, and no settings that a normal user must touch ever.
- No notification outside the editor window. No OS notifications. No sound on the offer.
- No mobile, no web app, no standalone desktop app.
- No reverse-engineering of Cursor, Windsurf or Antigravity internal state.
- No theming, no user-supplied colour schemes, no light/dark switcher beyond following
  the host's `ColorThemeKind`. The design is the product.
- No "share your result" anything.
