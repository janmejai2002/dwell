---
name: performance
activation: glob
globs: ["packages/webview/**", "tests/perf/**"]
description: The hot-path contract for the typing surface — 60fps while the machine is compiling, and a sub-100ms open.
---

# Performance rules (webview hot path)

The budget: **every frame under 16.7ms on a mid-range laptop with an agent compiling in the
background**, and **reveal → first accepted keystroke under 100ms at p95**. These are
tested, not asserted.

## The nine constraints

1. **The webview is created once and never destroyed.** Hiding sets `display:none` and
   suspends the rAF loop. This is where the 100ms comes from.
2. **Glyph geometry is measured once per drill.** On load, one pass of
   `getBoundingClientRect()` over every glyph span, cached into a `Float32Array` of x/y
   offsets. **The hot path never reads layout.** Zero forced reflows while typing. If you
   need a measurement during typing, you have designed the feature wrong.
3. **Two DOM mutations per keystroke, maximum.** One `classList` swap on the struck glyph,
   one `style.transform` on the caret. No `innerHTML`, no node creation, no attribute churn
   on the container, no class changes on ancestors.
4. **One rAF loop for the whole panel**, draining a keystroke queue. No `setInterval`, no
   `setTimeout` in the typing path, no per-element timers, no CSS `animation` except the
   flame sway.
5. **Only compositable properties animate**: `transform` and `opacity`, plus `color` on at
   most two text nodes per frame. `contain: strict` on the drill container and the Wick box.
   `will-change: transform` on the **caret and the flame only** — two elements. Broad
   `will-change` is itself the jank.
6. **No framework.** Vanilla TS. Bundle under 40KB gzipped, fonts excluded.
7. **The extension host does nothing during a drill.** All drill state is in the webview.
   The document-change detector is throttled to one evaluation per 250ms and short-circuits
   entirely while the panel is visible.
8. **Fonts are preloaded with `font-display: block`.** A swap-reflow in the middle of a run
   is the worst single frame the product can produce.
9. **Timing comes from the input handler, not from paint.** Capture `performance.now()`
   synchronously in `keydown`. Metrics computed from paint timestamps are wrong by a frame
   and the error correlates with load, which is exactly when you care.

## Things that look harmless and are not

- `element.scrollIntoView()` in the typing path — forces layout. Use a cached `translateY`.
- Reading `.offsetWidth`, `.clientHeight`, `getComputedStyle()` during a run.
- Rebuilding the glyph track on window resize *while a run is active* — defer to run end.
- A `ResizeObserver` or `IntersectionObserver` on the glyph container.
- `classList.toggle` on the container to drive descendant styles — invalidates the subtree.
- Logging per keystroke, including `console.debug` behind a flag.
- Animating the clean-run rule's `width`. Use `transform: scaleX()` with
  `transform-origin: left`.

## The test that enforces this

`tests/perf/typing.spec.ts`, Playwright against `apps/harness`, blocking in CI:

- Drive 600 synthetic keystrokes at 140wpm with CPU throttled 4×.
- Assert p95 frame time < 16.7ms and **zero** frames over 33ms.
- Assert zero forced reflows, via a `PerformanceObserver` on `long-animation-frame`.
- Assert reveal → first accepted keystroke p95 < 100ms across 50 reveals.
- Assert the gzipped webview bundle is under 40KB.

If a change makes this test fail, the change is wrong. Do not raise the thresholds. If you
believe a threshold is genuinely unachievable, say so and stop — do not quietly widen it.
