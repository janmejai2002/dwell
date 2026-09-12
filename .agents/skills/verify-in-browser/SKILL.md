---
name: verify-in-browser
description: Run the harness and check a Dwell UI change the way a person would, instead of inferring correctness from a passing build.
---

# Verify in browser

Use this at the end of any change that touches `packages/webview/`, the design tokens, the
sound, or anything a user can see or hear.

## Why the harness exists

`packages/core` has no `vscode` import and no DOM dependency, so `apps/harness` can mount
the real typing surface as an ordinary web page. That is the only way to look at this
product without installing a VSIX, and looking at it is required.

## Steps

1. `pnpm --filter harness dev` — serves on the fixed port in `vite.config.ts`.
2. Open it. The mock host panel gives you: `reveal`, `hide`, `agent:start`, `agent:end`,
   tier selector, theme toggle, and reduced-motion toggle.
3. Walk this script every time, in order:
   - Idle, no agent. Wick unlit. Trace visible. Does the screen reward looking at it?
   - `agent:start`, wait, `reveal`. Time the reveal by eye first, then by the perf run.
   - Type 30 correct characters. Confirm: glyphs light, caret steps by transform, the
     clean-run hairline appears at 20, and the sound gets *quieter* as you speed up.
   - Type a wrong character. Confirm: no red, no sound, the glyph stays dim with a baseline
     rule, the clean-run rule retracts.
   - Backspace over it. Confirm the scar persists at `--ink-600`.
   - Press Enter mid-drill. Confirm the lower, longer sound.
   - `agent:end` mid-drill. Confirm the flame fades over ~180ms and the panel does **not**
     close.
   - Abandon the run. Confirm nothing is scored and nothing is said.
4. Repeat in light theme, in high-contrast, with reduced motion on, and at a panel width
   under 38ch.
5. Capture screenshots of the idle screen and a mid-drill state in both themes. Save them
   to `docs/shots/<date>-<change>/`.
6. `pnpm perf`. Record the actual p95 frame time, the worst frame, and the reveal p95.

## The check that matters most

Open `.agents/rules/10-visual-language.md`, go to the forbidden list, and walk it item by
item against your screenshots. Gradient. Glass. Glow. Orb. Chat bubble. Inter. Card. Emoji.
Spinner. Red. Green. Exclamation mark.

Assume you produced at least one of them, because the statistical pull toward that visual
language is strong and it does not feel like a mistake while you are making it. Find it
before someone else does.

## Reporting

Report with numbers and screenshots. Name what you checked and what you did not. If a check
was impossible — no audio device in the environment, for instance — say so explicitly
rather than omitting it.
