---
name: visual-language
activation: always_on
description: Type stack, palette values, spacing scale, motion curves, per-keystroke behaviour, sound design, and how correctness is shown without red.
---

# Visual language

Reference object: a good measuring instrument. Starrett rule, Nagra deck, Braun ET66. Matte
surfaces, one accent, no part that exists to be admired. Every value below is normative.

## Type

Two families, both OFL, both bundled in the VSIX. **No network font fetch, ever.**

- **Drill text**: iA Writer Quattro S, 19px, line-height 1.55 (30px line box). Duospaced —
  monospace rhythm, proportional-feeling letterforms. Prompts are prose, not code, and the
  face should say so.
- **Numerals and timers**: IBM Plex Mono with `font-variant-numeric: tabular-nums`, 13px.
  Digits must not shift width while a timer runs.
- **Labels and Wick's lines**: iA Writer Quattro S, 12px, `letter-spacing: 0.02em`.

Nothing in the product is larger than 19px. There is no hero text because there is no hero.
Drill text wraps at 62ch maximum. Under 38ch of width, render Wick only.

Forbidden faces: Inter, Söhne, SF Pro, Geist, Satoshi, General Sans.

## Palette

Warm neutrals. No blue anywhere. No pure black, no pure white. One saturated hue on screen
at a time. These values live only in `packages/webview/src/styles/tokens.css`; a hex literal
anywhere else is a bug.

Dark (default):

```css
--ink-900:#12110F; --ink-800:#1A1917; --ink-700:#232220; --ink-600:#2E2C29;
--ink-400:#57534D; --ink-200:#8F8A82; --ink-050:#E8E4DC;
--accent:#C2703D; --accent-dim:#8A4F2B; --hold:#5F6B5A;
```

Light ("paper"):

```css
--ink-900:#F4F1EA; --ink-800:#EFEBE2; --ink-700:#E7E2D7; --ink-600:#D7D1C4;
--ink-400:#A39C90; --ink-200:#6B655C; --ink-050:#1C1A17;
--accent:#B3612E; --accent-dim:#C99B79; --hold:#5C6857;
```

Theme follows `activeColorTheme.kind`. There is no user switcher. High contrast: dark
palette with `--ink-050` → `#FFFFFF`, `--ink-400` → `#6E6A64`, hairlines → `--ink-200`.

`--ink-400` on `--ink-800` is 2.9:1 and that is intentional: untyped glyphs are a track to
follow, not content to read, and the glyph under the caret is always at `--ink-050`.

## Spacing and surfaces

Base 4px. Scale `4 8 12 16 24 32 48 64`. Nothing off-scale.

Panel padding 24. Drill-to-metrics gap 32. Metric strip internal gaps 24. Wick occupies
16×40px with 16px right margin. Radii: 2px on the panel, 0 everywhere else.

**No shadows exist in this product.** Surfaces differ by value and by 1px `--ink-600`
hairlines. No glass, no blur, no translucency, no `backdrop-filter`. No cards.

## Motion

| Thing | Duration | Easing | Properties |
| --- | --- | --- | --- |
| Caret step | 70ms | `cubic-bezier(.2,.8,.2,1)` | transform |
| Panel open | 140ms | `cubic-bezier(.16,1,.3,1)` | transform translateY(6→0), opacity |
| Panel close | 110ms | `cubic-bezier(.4,0,1,1)` | same reversed |
| Wick appears | 220ms | `cubic-bezier(.33,1,.68,1)` | opacity, translateY(4→0) |
| Wick retracts | 160ms | `cubic-bezier(.4,0,1,1)` | same reversed |
| Glyph lights | 90ms | linear | color |
| Clean-run rule grows | no transition, tracks typing | — | scaleX |
| Clean-run rule retracts | 300ms | `cubic-bezier(.4,0,.2,1)` | scaleX→0 |
| Flame out | 180ms | `cubic-bezier(.4,0,1,1)` | opacity |

One animated property per element per transition. No bounce, no overshoot, no spring, no
stagger. Never animate width, height, top, left, margin, filter or box-shadow. No looping
animation except the flame sway, which does not visibly loop.

`prefers-reduced-motion: reduce` → all durations 0ms, flame static. The product is fully
functional with motion off.

## Per keystroke — exactly this

`keydown` captures `performance.now()` and pushes to a queue. It renders nothing. The
single rAF loop drains the queue (a fast typist emits more than one key per frame).

- **Correct**: glyph `pending → struck` (color `--ink-400` → `--ink-050`, 90ms). Caret
  `translate3d()` to the cached next offset. Two nodes touched. Sound fires.
- **Incorrect**: glyph `pending → missed`. Colour unchanged — it simply never lights — plus
  a 2px `--ink-200` bottom border. Caret advances. **No sound.** Clean-run rule retracts.
- **Backspace**: previous glyph back to `pending`, losing its light. If it was `missed`, the
  border drops to `--ink-600` and stays as a scar for the run. Softer, lower sound.
- **Enter**: caret to the next line box, distinct lower sound. Counts as a character.
- **Space**: ordinary.

Nothing else. No scale pop, glow, ripple, shake, counter tick, top progress bar, or word
highlight box. Long drills scroll by instant `translateY` when the caret reaches the
fourth-from-last visible line — never a smooth scroll under a moving caret.

## Correctness without red

Correct text is lit; incorrect text is simply not lit. There is no failure colour in the
palette. Untyped `--ink-400`; correct `--ink-050`; incorrect stays dim with a 2px
`--ink-200` baseline rule, reading as a hole in the light; corrected drops that rule to
`--ink-600` and keeps it for the run.

The only positive-feedback animation is the **clean-run rule**: a 1px `--hold` hairline
under the current line, growing from the left in lockstep with the caret after 20
consecutive correct keystrokes, retracting to zero over 300ms on any error.

No red. No green. No checkmarks. No shake. No toast. No error sound.

## Sound

Synthesised with WebAudio at runtime. No sample files, no network, ~2KB.

Per keystroke, two summed voices: a 14ms white-noise burst through a bandpass at 1600Hz
(Q=6), and a sine body at the note frequency for 28ms. Both with 1–2ms attacks and
exponential decay. The result should read as a small wooden body struck with felt, not as a
mechanical switch.

**Pitch does not rise with speed or streak.** Rising pitch is a slot machine. Use a fixed
set — 196.0, 220.0, 246.9, 261.6 Hz — shuffled so no note repeats consecutively, with ±15
cents of random detune per strike. A texture, not a melody.

**Gain scales inversely with speed**: `gain = 0.22 * clamp(interval/140ms, 0.35, 1.0)`.
Fast typing gets quieter, so a good run recedes instead of building. This is the single
most important line in the sound design.

`Enter`: sine at 146.8Hz, 40ms body, bandpass down to 900Hz — lower and longer, because
Enter is punctuation here. `Backspace`: noise burst only, no body, 0.5× gain. Errors:
**silent** — the error signal is the note you expected and did not hear. Completion: no
fanfare.

Master: peak −18 dBFS, a compressor at threshold −24 / ratio 4, lowpass at 7kHz. On by
default, one toggle, persisted. `AudioContext` created lazily on the first keystroke and
suspended when the panel hides.

## The idle screen

Three elements, nothing else.

1. **Wick**: height = elapsed-vs-median agent task time. Flame sways by translateX of
   `0.7·sin(2πt/2.7) + 0.5·sin(2πt/4.3) + 0.3·sin(2πt/7.1)` px. Those periods are mutually
   incommensurable, so the motion never visibly repeats. Total excursion ~1.5px.
2. **The trace**: last 20 runs' uWPM as 1px vertical hairlines, 3px apart, `--ink-600`, most
   recent in `--ink-200`. No axis, no labels, no tooltip.
3. **One line**: tier and number in Plex Mono 13px `--ink-200`, e.g. `plain · 57`.

It rewards being looked at because everything on it is true right now and moving at the
pace of something real. A decoration pretending to be information is exactly what a
floating orb is, and it is what this replaces.

## Forbidden — rejecting a diff is the correct response

Gradients of any kind, especially purple/violet/indigo or blue-to-purple. Glassmorphism,
`backdrop-filter`, frosted panels. Glowing borders, box-shadow-as-glow, shimmer, aurora,
mesh gradients, noise overlays. Floating orbs, blobs, particles, confetti, sparkles.
A chat bubble, message list, avatar circle, or three-dot typing indicator. Inter/Geist/SF
Pro as UI face. Rounded cards in a grid. Emoji in UI copy. Skeleton loaders, spinners,
progress rings. `#0A0A0A` + `#FFFFFF` + blue accent as "dark mode". Tailwind default
palette as-is. shadcn/ui, MUI, Chakra, or the VS Code Webview UI Toolkit components.
Durations over 300ms, springs, bounce, staggered cascades. Copy containing "Let's",
"Awesome", "You're crushing it", "level up", "supercharge", "unleash", or any exclamation
mark. Red for errors, green for success, checkmark icons. A settings page as a first screen.
