# Dwell — Design System

The reference object is a good measuring instrument: a Starrett rule, a Nagra deck, a
Braun ET66. Matte surfaces, one accent, legible at a glance, no part that exists to be
admired. Nothing here is decided by taste alone; every value below is a number the
implementation must use literally.

---

## 1. Type

**Two families. Both OFL. Both bundled in the VSIX. No network font fetch, ever.**

| Role | Face | Why |
| --- | --- | --- |
| Drill text (the thing you type) | **iA Writer Quattro S** | Duospaced: monospace rhythm and alignment, proportional-feeling letterforms. The curriculum's whole claim is that prompts are prose, not code. A duospaced face makes that argument visible while still letting us position a caret by cached glyph offsets. |
| Numerals, timers, metrics | **IBM Plex Mono**, `font-variant-numeric: tabular-nums` | Digits must not shift width while a timer runs. Plex Mono is neutral, slightly mechanical, and reads as measurement rather than as branding. |
| UI labels, Wick's lines | iA Writer Quattro S, 12px, `letter-spacing: 0.02em` | A third family would be a third opinion. |

**Explicitly not used:** Inter, Söhne, SF Pro, Geist, Satoshi, General Sans, and every
other face that currently signals "AI startup."

**Sizes.** Drill text 19px / line-height 1.55 (that is 29.45px, round to 30px line box).
Metrics 13px. Labels 12px. Wick's speech 12px. Nothing larger than 19px exists in the
product — there is no hero text, because there is no hero.

**Measure.** Drill text wraps at 62ch, hard maximum. Below 62ch the panel narrows with
the sidebar; below 38ch the panel shows Wick only and says nothing else.

---

## 2. Palette

Warm neutrals, no blue anywhere, no pure black, no pure white. One saturated hue on
screen at a time.

### Dark (default)

```css
--ink-900:   #12110F;  /* ground */
--ink-800:   #1A1917;  /* panel */
--ink-700:   #232220;  /* raised: metric strip, input row */
--ink-600:   #2E2C29;  /* hairlines, 1px rules */
--ink-400:   #57534D;  /* untyped glyph, disabled */
--ink-200:   #8F8A82;  /* secondary text, error underline */
--ink-050:   #E8E4DC;  /* primary text = a glyph you got right */
--accent:    #C2703D;  /* caret, flame. the only saturated hue. */
--accent-dim:#8A4F2B;  /* caret while the agent task has ended */
--hold:      #5F6B5A;  /* clean-run rule. a moss green, deliberately low chroma. */
```

### Light ("paper")

```css
--ink-900:   #F4F1EA;
--ink-800:   #EFEBE2;
--ink-700:   #E7E2D7;
--ink-600:   #D7D1C4;
--ink-400:   #A39C90;
--ink-200:   #6B655C;
--ink-050:   #1C1A17;
--accent:    #B3612E;
--accent-dim:#C99B79;
--hold:      #5C6857;
```

Theme follows `vscode.window.activeColorTheme.kind` with no user switch. High-contrast
themes get the dark palette with `--ink-050` → `#FFFFFF` and `--ink-400` → `#6E6A64`, and
all hairlines go to `--ink-200`.

**Contrast check (dark):** `--ink-050` on `--ink-800` = 12.6:1. `--ink-400` on `--ink-800`
= 2.9:1 — this is intentional and legal, because untyped glyphs are not content you are
asked to read, they are a track you are following; the glyph you are *on* is always at
`--ink-050` under the caret. `--ink-200` on `--ink-800` = 6.1:1.

**Zero gradients.** Not on backgrounds, not on borders, not on the flame. A gradient
anywhere in the product is a bug.

---

## 3. Spacing and surfaces

Base unit 4px. Scale: `4, 8, 12, 16, 24, 32, 48, 64`. Nothing off-scale.

- Panel padding: `24px`.
- Gap between drill text and the metric strip: `32px`.
- Metric strip internal gaps: `24px`.
- Wick occupies a `16 × 40px` box at top-left of the panel with `16px` right margin.
- Radii: `2px` on the panel, `0` on everything else. No pill shapes. No cards.
- Elevation: none. There are no shadows in the product. Surfaces are distinguished by
  value (`--ink-800` vs `--ink-700`) and by 1px `--ink-600` hairlines. No glass, no blur,
  no translucency, no `backdrop-filter`.
- Borders: 1px, `--ink-600`, and only where two surfaces genuinely meet. No border on the
  panel's outer edge — it meets the sidebar, and the sidebar already has one.

---

## 4. Motion

Every duration and curve below is normative.

| Thing | Duration | Easing | Properties |
| --- | --- | --- | --- |
| Caret step between glyphs | `70ms` | `cubic-bezier(.2,.8,.2,1)` | `transform` only |
| Panel open | `140ms` | `cubic-bezier(.16,1,.3,1)` | `transform: translateY(6px→0)`, `opacity 0→1` |
| Panel close | `110ms` | `cubic-bezier(.4,0,1,1)` | same, reversed |
| Wick appears (the offer) | `220ms` | `cubic-bezier(.33,1,.68,1)` | `opacity`, `transform: translateY(4px→0)` |
| Wick retracts | `160ms` | `cubic-bezier(.4,0,1,1)` | same, reversed |
| Glyph lights on correct keystroke | `90ms` | `linear` | `color` only |
| Clean-run rule grows | tracks typing, no transition | — | `transform: scaleX()` |
| Clean-run rule retracts on error | `300ms` | `cubic-bezier(.4,0,.2,1)` | `transform: scaleX(→0)` |
| Flame extinguishes (task ends) | `180ms` | `cubic-bezier(.4,0,1,1)` | `opacity` |
| Flame sway (idle) | continuous | — | `transform: translateX()` |

**Rules.**
- One animated property per element per transition. Colour *or* transform, never both on
  the same node.
- No bounce, no overshoot, no spring, no `cubic-bezier` with a value outside `[0,1]` on
  the y-axis except the two "decelerate hard" curves above, which do not overshoot.
- Nothing animates `width`, `height`, `top`, `left`, `margin`, `filter`, or `box-shadow`.
- No looping animation anywhere except the flame sway, which does not visibly loop (§6).
- `prefers-reduced-motion: reduce` sets every duration above to `0ms` and replaces the
  flame sway with a static flame. The product is fully functional with all motion off.

---

## 5. Per keystroke — exactly what happens

On `keydown`, synchronously:

1. Timestamp captured from `performance.now()`. Pushed with the key into a queue.
2. Nothing is rendered in the handler.

On the next `requestAnimationFrame` (one rAF loop for the life of the panel; it drains the
whole queue, because a 120wpm typist can emit two keys in one frame):

- **Correct character:** the glyph's class goes `pending → struck`. That is a `color`
  change from `--ink-400` to `--ink-050` over 90ms. The caret's `translate3d(x,y,0)` is set
  to the cached offset of the next glyph. Two nodes touched. Sound fires (§7).
- **Incorrect character:** the glyph's class goes `pending → missed`. `missed` is
  `color: --ink-400` (unchanged — it simply never lights) plus a `2px` bottom border in
  `--ink-200`. The caret advances anyway. **No sound.** The clean-run rule retracts.
- **Backspace:** the previous glyph goes back to `pending`, losing its light. If it was
  `missed`, the border drops to `--ink-600` and stays there for the rest of the run as a
  scar. Caret steps back. A softer, lower key sound (§7).
- **Enter:** caret moves to the start of the next line box. A distinct, lower sound. In
  Tiers 2–6 the newline counts as a character for uWPM.
- **Space:** ordinary character, ordinary sound.

Nothing else happens. No scale pop, no glow, no ripple, no shake, no character counter
ticking, no progress bar at the top, no word highlight box.

**Scrolling.** Long drills scroll by line when the caret reaches the fourth-from-last
visible line, as an instant `transform: translateY()` on the text block — not a smooth
scroll, because a moving background under a moving caret is unreadable.

---

## 6. Correctness without red

The governing idea: **correct text is lit, incorrect text is simply not lit.** Success is
illumination; failure is its absence. There is no failure colour in the palette.

- Untyped: `--ink-400`. Dim.
- Correct: `--ink-050`. Bright. The line you have typed glows; the line ahead is grey.
  Progress is visible from across the room as a bright region growing.
- Incorrect: stays `--ink-400` *and* takes a 2px `--ink-200` baseline rule. It reads as an
  underscored gap in the bright region — a hole in the light.
- Corrected: the baseline rule drops to `--ink-600` and persists to the end of the run.
  You can see the shape of where you struggled without anything shouting at you.
- The **clean-run rule**: a 1px `--hold` line under the current text line, scaled from the
  left in lockstep with the caret, appearing only after 20 consecutive correct keystrokes
  and retracting to zero over 300ms on any error. This is the only positive feedback
  animation in the product, and it is a hairline.

No red. No green checkmarks. No shake. No toast. No sound on error.

---

## 7. Sound

All synthesised at runtime with WebAudio. No sample files, no network, ~2KB of code.

**Material.** A small wooden body struck with felt — closer to a marimba key at low
volume than to a mechanical switch. Per keystroke, two voices summed:
- A noise burst: 14ms of white noise through a bandpass at `1600Hz`, `Q = 6`, gain
  envelope `0 → peak in 1ms → 0 in 13ms` (exponential).
- A body: a sine at the note frequency, `28ms`, envelope `0 → peak in 2ms → 0 in 26ms`.

**Pitch behaviour.** Pitch does **not** rise with speed or streak. Rising pitch is a slot
machine and it makes fast typing feel like a reward loop. Instead: a fixed four-note set
— `196.0, 220.0, 246.9, 261.6 Hz` (G3 A3 B3 C4) — cycled in a shuffled order that never
repeats a note twice in a row, with `±15 cents` of random detune per strike. The result is
a texture, not a melody, and never a machine-gun.

**Velocity.** Gain scales *inversely* with typing speed: `gain = 0.22 * clamp(interval/140ms, 0.35, 1.0)`.
Fast typing gets quieter. A good run recedes into the background instead of building. This
is the single most important line in the sound design.

**Special keys.**
- `Enter`: sine at `146.8Hz` (D3), 40ms body, noise bandpass dropped to `900Hz`. Lower and
  longer, because in this curriculum Enter is punctuation and should feel structural.
- `Backspace`: the noise burst only, no body, at `0.5×` gain. A brush, not a note.
- `---` completion and drill completion: nothing. There is no fanfare.

**Errors.** Silent. The error signal is the note you expected and did not hear. This is
the sound equivalent of §6.

**Master.** Peak `-18 dBFS`, a `DynamicsCompressor` with `threshold -24, ratio 4` to catch
fast runs, and a lowpass at `7kHz` so nothing is ever sharp through laptop speakers.
Defaults on; one toggle in the metric strip; state persisted. The `AudioContext` is created
lazily on first keystroke (browsers require a gesture) and `suspend()`ed when the panel
hides, so it costs nothing while idle.

---

## 8. The idle screen

It has to be worth looking at while you wait, without becoming something that wants
attention. Three elements and nothing else:

1. **Wick.** A 2px `--accent` line, height driven by real elapsed-vs-median agent task
   time, with a 5×8px flame. The flame sways by `translateX` of
   `A₁sin(2πt/2.7) + A₂sin(2πt/4.3) + A₃sin(2πt/7.1)` with amplitudes `0.7, 0.5, 0.3` px.
   Those periods are mutually incommensurable, so the motion has no visible loop — the
   thing you notice in a looping animation is the loop, and there isn't one. Total motion:
   1.5px. It is barely moving. That is why it is watchable.
2. **The trace.** The last 20 runs' uWPM as 20 vertical hairlines, 1px wide, 3px apart, in
   `--ink-600`, with the most recent in `--ink-200`. No axis, no labels, no tooltip. It is
   a shape, and over a month the shape changes, and that is the reward.
3. **One line of text.** The drill tier and a single number, in Plex Mono 13px,
   `--ink-200`: `plain · 57`. Nothing else.

What makes it reward being looked at: everything on it is *true right now* and moving at
the pace of something real. The flame is a live measurement of how long your agent has
been working. The trace is a record of you. Neither is a decoration pretending to be
information, which is what a floating orb is.

---

## 9. 60fps guarantee on a mid-range laptop under compile load

Not a hope — a set of constraints the implementation is held to.

1. **The webview is created once at activation and never destroyed.** `retainContextWhenHidden: true`.
   Hiding sets `display:none` on the root and suspends the rAF loop. Showing costs a class
   toggle and a `focus()`. This is what buys the sub-100ms open.
2. **Glyph geometry is measured once per drill, never during typing.** On drill load, one
   pass of `getBoundingClientRect()` over all glyph spans, cached into a `Float32Array` of
   x/y offsets. The hot path never reads layout. Zero forced reflows while typing.
3. **Two DOM mutations per keystroke, maximum.** One `classList` swap on the struck glyph,
   one `style.transform` on the caret. No `innerHTML`, no node creation, no attribute
   churn on the container.
4. **One rAF loop for the whole panel**, draining a keystroke queue. No `setInterval`, no
   per-element timers, no CSS animation except the flame.
5. **Only compositable properties animate**: `transform` and `opacity`, plus `color` on at
   most two text nodes per frame. `contain: strict` on the drill container and on the Wick
   box so nothing outside them can be invalidated. `will-change: transform` on the caret
   and the flame only — two elements, because `will-change` on many elements is itself the
   jank.
6. **No framework.** Vanilla TS. A reconciler in the keystroke path is 2–6ms of work to
   achieve what two `classList` calls do in microseconds. Bundle target: < 40KB gzipped
   including fonts-excluded CSS.
7. **The extension host does nothing during a drill.** All drill state lives in the
   webview. Persistence is batched and flushed on drill end and on hide, debounced 2s. The
   detection layer's document-change listener is throttled to one evaluation per 250ms via
   a coarse timer and is short-circuited while the panel is visible.
8. **Fonts are `preload`ed with `font-display: block`** so there is no swap-reflow in the
   middle of a run.
9. **Verification, not vibes.** A Playwright perf test drives 600 synthetic keystrokes at
   140wpm into the harness page with CPU throttled 4× and asserts: p95 frame time < 16.7ms,
   zero frames > 33ms, zero forced reflows (via `PerformanceObserver` on `layout-shift` and
   a `long-animation-frame` observer), and reveal-to-first-keystroke p95 < 100ms. This test
   is required to pass in CI and is part of the definition of done.

---

## 10. Anti-pattern list — forbidden, no exceptions

Any of these appearing in a diff is grounds for rejecting it.

- Purple, violet, indigo, or blue-to-purple gradients. Any gradient at all.
- Glassmorphism: `backdrop-filter`, translucent panels, frosted anything.
- Glowing borders, `box-shadow` used as a glow, animated border gradients, shimmer,
  aurora, mesh gradients, noise overlays.
- Floating orbs, blobs, particles, confetti, sparkles, starfields.
- A chat bubble, a message list, an avatar circle, a "typing…" three-dot indicator.
- Inter, Geist, or SF Pro as the UI face.
- Rounded cards with 12–16px radii stacked in a grid. Cards at all.
- Emoji in UI copy. Rocket ship, sparkle, brain, robot — especially those.
- Skeleton loaders, spinners, progress rings.
- Dark mode implemented as `#0A0A0A` with `#FFFFFF` text and a blue accent.
- Tailwind's default palette (`slate`, `zinc`, `indigo`) used as-is.
- `shadcn/ui`, MUI, Chakra, or the VS Code Webview UI Toolkit as the component layer.
  Study the toolkit's host-bridge code; do not ship its components.
- Motion durations above 300ms. Spring physics. Bounce. Stagger cascades.
- Any copy containing "Let's", "Awesome", "You're crushing it", "Ready to level up",
  "supercharge", "unleash", or an exclamation mark.
- Red for errors. Green for success. Checkmark icons.
- A settings page as the first thing a user sees.
