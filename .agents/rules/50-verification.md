---
name: verification
activation: always_on
description: What "done" means here — plan before code, look at the running UI, and never treat a green build as evidence a UI is correct.
---

# Verification rules

## Plan before code

Before writing implementation code for any task larger than a one-file fix, write
`docs/plans/<short-name>.md` containing:

- The objective in one sentence.
- The files you will create or change, each with one line of purpose.
- The rules files that constrain this work, named.
- The test or check that will prove it works, named specifically.
- Anything you had to decide that the spec did not settle, marked `OPEN:` with your
  recommendation.

Then stop and wait for review. Do not write code and a plan in the same pass.

## A green build is not evidence

`tsc` passing means the types line up. It says nothing about whether the caret is in the
right place, whether the panel opens in 80ms or 400ms, whether the sound is pleasant, or
whether the thing you built looks like every other AI product.

Before claiming any visual or interactive task is done:

1. Run `pnpm --filter harness dev` and open it in a browser.
2. Use the mock host controls to fire `agent:start`, `reveal`, type a full drill, make
   errors, correct them, abandon a run, and fire `agent:end` mid-drill.
3. Take screenshots of the idle screen and a mid-drill state, in both light and dark, and
   at a narrow panel width. Look at them.
4. Check the result against the forbidden list in `.agents/rules/10-visual-language.md`,
   item by item. An agent left alone produces that list; assume you have too, and check.
5. Run `pnpm perf`. Report the actual p95 numbers, not "passes".

See `.agents/skills/verify-in-browser/SKILL.md` for the mechanics.

## Definition of done for a change

- Unit tests for any pure logic in `packages/core`, including the edge cases.
- The perf test passes with its thresholds unchanged.
- The visual check above was actually performed, with the screenshots attached or saved.
- No new dependency in `packages/core`. No `vscode` import in `core`. No hex literal
  outside `tokens.css`.
- If the change touched detection or the offer governor, the truth-table tests were updated
  and the change was justified against "prefer a false negative."
- Docs updated in the same change if the change made them wrong.

## Reporting

Report what you verified and how, with numbers. "Builds and tests pass" is not a report.
"p95 frame time 11.2ms over 600 keystrokes at 4× throttle, worst frame 19.8ms — one frame
over budget at the first reveal, caused by font decode; fixed by preloading" is a report.

If you could not verify something, say that plainly instead of implying you did. An
unverified claim is worse than an acknowledged gap, because it costs someone else the time
to discover it.
