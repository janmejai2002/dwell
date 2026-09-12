# Goal prompt for Antigravity

Paste the block below into Antigravity's agent with this repository open.

---

```
OBJECTIVE

Build Dwell: a VS Code extension that detects when a coding agent is mid-task and offers a
typing drill that teaches prompt writing. One VSIX for VS Code, Cursor, Windsurf and
Antigravity, plus a Claude Code hook that produces the same trigger from a terminal session.

The full product, visual and architectural specifications are in this repository. Read them
before anything else:

  AGENTS.md
  .agents/rules/00-product.md         the loop, the character, curriculum, metrics, non-goals
  .agents/rules/10-visual-language.md tokens, type, motion, sound, the forbidden list
  .agents/rules/20-architecture.md    package boundaries, protocol, persistence, packaging
  .agents/rules/30-performance.md     the hot-path contract
  .agents/rules/40-host-detection.md  signals, priorities, the hook contract
  .agents/rules/50-verification.md    what done means
  docs/SPEC.md  docs/DESIGN-SYSTEM.md  docs/ARCHITECTURE.md  docs/TREE.md

Do not restate those rules back to me and do not summarise them into a new document. Follow
them. Where a rule and a doc disagree, the rule wins and you flag the discrepancy.

PHASE 0 — READ THE REFERENCES BEFORE YOU DESIGN ANYTHING

Clone these into ./reference/ (shallow, depth 1) and actually read the files named. Do not
copy code wholesale; read them to learn the shape of the problem, then write our own.

  1. github.com/monkeytypegame/monkeytype
     Read: src/ts/test/input-controller.ts, test-logic, the word/character state handling,
     and how the caret is positioned and moved. This is the best public reference for
     keystroke handling, correction semantics and caret movement in a typing test.
     What to take: the input model and the correction edge cases.
     What to reject: everything visual, and the WPM formula — we use uWPM, defined in
     .agents/rules/00-product.md.

  2. github.com/microsoft/vscode-extension-samples
     Read: webview-view-sample/ and webview-sample/ in full, including the CSP and nonce
     handling, localResourceRoots, and message passing.
     What to take: the host bridge, the provider registration, the HTML generation pattern.
     Also read webview-ui-toolkit usage if referenced — and then do not use the toolkit.

  3. github.com/disler/claude-code-hooks-mastery
     Read: the hook scripts and the settings.json shapes.
     What to take: the real payload shapes for UserPromptSubmit, Stop, SubagentStop,
     Notification, and how hooks are registered.
     Cross-check every event name and payload field against the current official Claude Code
     hooks documentation before you build on it, because both that repo and our specs may be
     out of date. Report any discrepancy you find instead of silently adapting.

  4. github.com/eclipse/openvsx (or the ovsx CLI docs)
     Read: what a VSIX needs in order to publish to Open VSX. Confirm our engines range and
     that we use no proposed APIs.

Also verify, against current official VS Code documentation, that these APIs exist with the
names and signatures our specs assume, and correct the specs in the same change if they do
not: window.onDidStartTerminalShellExecution, window.onDidEndTerminalShellExecution,
tasks.onDidStartTask, tasks.onDidEndTask, workspace.onDidChangeTextDocument with
TextDocumentChangeReason, WebviewViewProvider, and retainContextWhenHidden.

PHASE 1 — PLAN, THEN STOP

Write docs/plans/v1-implementation.md and stop for my review before writing any
implementation code. It must contain:

  - A milestone sequence: skeleton and harness, core engine and scoring, webview surface,
    sound, detection, the Claude Code hook, packaging. Each milestone ends at something
    runnable and verifiable.
  - Every file you will create, matching docs/TREE.md, with one line of purpose each. Where
    you deviate from that tree, say why.
  - What you learned from each of the four references, in three or four lines each, and what
    you are specifically taking from and rejecting in each.
  - Every discrepancy you found between our specs and current API reality.
  - Everything the specs did not settle, marked `OPEN:` with your recommendation.
  - The exact test or check that will prove each milestone, named.

Do not write code in this phase. A plan and an implementation in the same pass is a failed
pass.

PHASE 2 — BUILD, MILESTONE BY MILESTONE

Build apps/harness first, before the extension. The harness is how anything gets verified
visually, and packages/core must stay free of vscode and DOM imports so that it works. Add
a lint rule that fails the build on such an import.

After each milestone: run the tests, run the harness, look at it, and report with numbers.

DEFINITION OF DONE — all of these are checkable, and I will check them

  1. `pnpm -r build` and `pnpm -r test` pass with zero TypeScript errors and no skipped
     tests.
  2. `pnpm package` produces a single VSIX under 2MB with engines.vscode ^1.93.0 and no
     vscode.proposed API in the manifest.
  3. That VSIX installs and activates in VS Code and in at least one of Cursor, Windsurf or
     Antigravity, and on first run the drill panel opens itself with a drill loaded and a
     caret placed, with no settings page and no walkthrough.
  4. tests/perf/typing.spec.ts passes unmodified: 600 synthetic keystrokes at 140wpm with
     4x CPU throttle, p95 frame time under 16.7ms, zero frames over 33ms, zero forced
     reflows, reveal-to-first-keystroke p95 under 100ms over 50 reveals, webview bundle
     under 40KB gzipped. Report the actual numbers, not "passes".
  5. packages/hook/test asserts and demonstrates that hook.cjs exits 0 with empty stdout and
     stderr in all of: no listener, malformed payload, closed stdin, unwritable socket path.
     Show the test output.
  6. The hook installer merges into an existing ~/.claude/settings.json without destroying
     existing hooks, backs it up first, and aborts cleanly on a malformed file. Show it
     working against fixture files including a malformed one.
  7. The offer governor has a truth-table unit test covering every cap and every suppression
     condition in .agents/rules/00-product.md, and no appearance trigger exists anywhere
     else in the codebase. Show the grep that proves the second half.
  8. Screenshots in docs/shots/ of the idle screen and a mid-drill state, in light, dark and
     high-contrast, at full and narrow panel width, produced from the harness in a browser —
     not described, not mocked up, captured from the running thing.
  9. A written pass through the forbidden list in .agents/rules/10-visual-language.md, item
     by item, against those screenshots.
 10. All six tiers are playable end to end with the shipped corpus, and the corpus linter
     passes: no character outside the permitted set appears in any drill item.

VERIFY IN THE BROWSER, NOT IN THE BUILD LOG

Use the browser subagent against apps/harness. Drive the script in
.agents/skills/verify-in-browser/SKILL.md: type correct characters, type wrong ones, correct
them, press Enter, fire agent:end mid-drill, abandon a run, switch themes, enable reduced
motion, narrow the panel. Capture screenshots and read them.

A passing build is not evidence that a UI is correct. Do not tell me it works because it
compiles. If you could not verify something — no audio device, no second host installed —
say so plainly instead of implying you did.

FORBIDDEN — I will reject the work on sight if any of this appears

No gradients of any kind, and specifically no purple, violet, indigo, or blue-to-purple.
No glassmorphism, backdrop-filter, frosted or translucent panels.
No glowing borders, box-shadow used as a glow, shimmer, aurora, mesh gradients, noise
overlays.
No floating orbs, blobs, particles, confetti or sparkles.
No chat bubble, message list, avatar circle, or three-dot typing indicator.
No Inter, Geist, or SF Pro. Use the two OFL faces named in the visual language rules.
No rounded cards in a grid. No shadows at all.
No emoji anywhere in UI copy.
No skeleton loaders, spinners, or progress rings.
No dark mode built as #0A0A0A plus #FFFFFF plus a blue accent.
No Tailwind default palette, no shadcn/ui, MUI, Chakra, or VS Code Webview UI Toolkit
components.
No animation over 300ms, no springs, no bounce, no staggered cascades.
No red for errors and no green for success. Correctness is shown by illumination only.
No copy containing "Let's", "Awesome", "You're crushing it", "level up", "supercharge",
"unleash", or an exclamation mark.
No settings page as a first screen.
No telemetry, no network calls from the webview, no LLM calls, no accounts, no streaks, no
leaderboards.

Left alone, an agent produces almost exactly that list. Assume you will drift toward it,
and check your own output against it before you report anything as done.

START

Begin with Phase 0. Report what you read and what you found, then produce the Phase 1 plan
and stop.
```
