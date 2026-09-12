# AGENTS.md — Dwell

## What this repository is

Dwell is a VS Code extension that teaches prompt writing as a typing skill. It detects
that a coding agent is mid-task, and after 25 seconds it offers a typing drill. One
keystroke opens it, the same keystroke closes it. The drill corpus is plain words, `Enter`,
`---` and `>` — never code, never brackets, never symbols. One VSIX installs into VS Code,
Cursor, Windsurf and Antigravity. A separate Claude Code hook produces the same trigger
from a terminal session.

Read `docs/SPEC.md` for the product, `docs/DESIGN-SYSTEM.md` for the visual language and
`docs/ARCHITECTURE.md` for the build. The rules in `.agents/rules/` are the enforceable
subset of those documents; where a rule and a doc disagree, the rule wins and you should
flag the discrepancy.

## The three things that are easy to get wrong

1. **This must not look like an AI product.** No gradients, no glass, no glow, no Inter, no
   orbs, no chat bubble, no purple. `.agents/rules/50-...` and `10-visual-language.md` list
   what is forbidden. An agent left unsupervised produces exactly the forbidden list, so
   check your own output against it before you claim a UI task is done.
2. **This must not be annoying.** Every interruption rule lives in
   `packages/core/src/offer-governor.ts` as pure functions. Do not add an appearance
   trigger, a nudge, a badge, a streak, or a notification anywhere else. If a change makes
   Dwell appear more often, it is wrong by default.
3. **The typing surface must hold 60fps while the machine is compiling.** The hot path is
   two DOM mutations per keystroke and no layout reads. `.agents/rules/30-performance.md`
   is the contract, and `tests/perf/typing.spec.ts` enforces it.

## Repository conventions

- pnpm workspace. `pnpm -r build`, `pnpm -r test`, `pnpm perf`, `pnpm package`.
- TypeScript strict everywhere. `packages/core` has **zero** runtime dependencies and must
  not import `vscode` or touch the DOM — this is what makes `apps/harness` possible.
- No UI framework in `packages/webview`. Vanilla TS and CSS. No component library.
- Colour literals live only in `packages/webview/src/styles/tokens.css`. A hex value
  anywhere else is a bug.
- Commit messages: imperative, one line, scoped — `webview: cache glyph offsets at load`.

## How to work here

- Before writing code for a task, write the plan to `docs/plans/<short-name>.md` and stop
  for review. Plans name the files you will touch and the test that will prove the change.
- Prefer deleting an idea to adding a setting. There is almost no configuration in this
  product on purpose.
- When you finish visual work, run the harness (`pnpm --filter harness dev`) and actually
  look at it in a browser. A passing build is not evidence that a UI is correct. See
  `.agents/skills/verify-in-browser/SKILL.md`.
- API surfaces in the docs were written from memory and may be stale. Verify VS Code API
  names and Claude Code hook event names against current official documentation before
  building on them, and correct the docs in the same change if they are wrong.

## Out of scope — do not build these

Accounts, sync, servers, telemetry of any kind, LLM calls, a chat UI, code-typing drills,
leaderboards, streaks, XP, achievements, OS notifications, themes, a settings page, or any
attempt to read Cursor's or Windsurf's internal agent state.
