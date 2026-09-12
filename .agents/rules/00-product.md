---
name: product
activation: always_on
description: The core loop, the character, the curriculum, the metrics, and what Dwell refuses to be.
---

# Product rules

## The loop, normatively

1. Agent task detected → wait **25 seconds**. Do nothing. Most tasks end inside 25s and
   interrupting those is the failure mode that kills this product.
2. Still running at 25s and the offer governor permits → **Wick** appears in the auxiliary
   sidebar and the status bar. No focus steal, no sound, no editor movement.
3. `Ctrl+Alt+Space` / `Cmd+Alt+Space` opens the panel, already focused, already accepting
   keystrokes. Budget: reveal → first accepted keystroke **under 100ms at p95**.
4. The same chord closes it. So does `Escape`. So does clicking the editor.
5. The agent task ending does **not** close the panel. It dims chrome one step and puts the
   flame out. Yanking the surface away mid-word is worse than leaving it.
6. Run ends → write to disk → nothing else. No modal, no summary, no celebration.

## First run

The panel opens itself once, immediately after install, with a drill loaded and the caret
placed. No settings page, no walkthrough, no account, no tour. The only extra element is
one line: `Also trigger from Claude Code? [Enable]`, which writes the hook config and then
removes itself permanently. Declining never asks again.

## Wick — the character

A 2px `--accent` line with a 5×8px flame. Its height is a real measurement: elapsed time of
the current agent task against a running median of recent tasks. When the task ends the
flame fades out over 180ms. No smoke, no particles.

Temperament: dry, competent, faintly bored. Lower case, fragments, 12px, `--ink-200`,
visible for at most 3 seconds. Under 40 total strings in v1.

Wick **never**: uses an exclamation mark, uses your name, uses emoji, congratulates,
comments on you being slow, speaks while you are typing, speaks twice about one run, asks a
question it does not need answered, or mentions its own rules.

Wick's complete behaviour set:

| Situation | Behaviour |
| --- | --- |
| Task starts | nothing for 25s |
| Offer permitted | appear, silently |
| Hotkey pressed | move to panel top-left, become the timer |
| Personal-best run | `fastest in 40.` once, after the run |
| Slow run | nothing, ever |
| Single error | nothing — the glyph simply does not light |
| 5 errors in 10 keystrokes | after the run: `that one was awkward. again?` and re-queue the same drill |
| Quit mid-drill | close; discard the partial run unscored; say nothing |
| Offer ignored 6s | retract over 160ms |
| Three ignores in a row | stop offering for the session; do not mention it |
| Opened with no agent running | render unlit, as a plain caret-like line |
| Tier unlocked | `frame is open.` on one line |
| Idle 10 days | nothing. Dwell never chases. |

## Interruption governance

All of this lives in `packages/core/src/offer-governor.ts` as pure functions. No appearance
trigger may exist anywhere else in the codebase.

Hard caps: no offer before 25s of task time; one offer per task; one per 20 minutes; four
per day; none in the first 90 seconds after the window regains focus.

Suppress entirely if: a keystroke landed anywhere in the last 4s; a quick-pick, input box
or modal is open; the debugger is paused; zen mode is on; the window is unfocused; DND is
set; a drill was completed in the last 10 minutes.

Earned appearances: after first run, the offer budget refills only if the previous session
ended in a completed drill, or 24 hours passed. Two ignored sessions → hotkey-only.

Retraction (160ms) is faster than appearance (220ms), so declining never feels like a
struggle.

## Curriculum

Six tiers. Motor skill → structural fluency → authorship.

1. **Plain** — single-line prompt sentences from a ~1,200-word prompt-weighted vocabulary
   (*refactor, endpoint, repro, idempotent, schema, flaky, revert, migration*). Target 55 uWPM.
2. **Break** — multi-line prompts where `Enter` carries meaning, one instruction per line,
   no terminal punctuation. Target 55 uWPM, newlines counted as characters.
3. **Rule** — introduces `---` and `>`. Alternating instruction and quoted-context blocks.
   Target 50 uWPM.
4. **Frame** — full prompts in a fixed shape: Goal / Context / Constraints / Done. Target
   visible throughout. Target 48 uWPM and 4 frames with no structural omission.
5. **Recall** — target shown 4 seconds, then hidden; type from memory. Passes on structural
   recall, not character-exactness.
6. **Cold** — one sentence of task description, no target text. You write the prompt.
   Scored on structure coverage and latency-to-first-keystroke. Speed shown, gates nothing.

Unlock rule: **three consecutive runs** at or above target with ≤2% uncorrected error.
Consecutive, not best-of. Tiers never re-lock. Tier 1 is always one keypress away.

Corpus is static JSON shipped in the VSIX. No LLM calls. Works offline. Identical for
every user.

## Metrics — exactly three

1. **uWPM** — gross WPM computed only over stretches containing no correction. A backspace
   ends the stretch; time inside corrections is excluded from numerator and denominator.
2. **Latency** — ms from prompt-visible to first keystroke. Tiers 5 and 6 only. This is the
   only metric that measures prompting rather than typing.
3. **Longest clean run** — longest consecutive-correct keystroke count in the session.

Do not add: raw WPM, accuracy %, total time practised, daily streaks, XP, levels, badges,
leaderboards, or per-finger heatmaps. Each was considered and rejected; the reasons are in
`docs/SPEC.md` §6. Adding one back requires changing that document first.

## Non-goals

No account, sync, server, or telemetry of any kind. No LLM calls. No chat UI. No code,
brackets or symbols in drills. No gamification. No settings page on first run and no
setting a normal user must ever touch. No notification outside the editor window. No
mobile or web build. No reverse-engineering of Cursor, Windsurf or Antigravity internals.
No user theming. No sharing features.
