# Dwell — Google Flow prompt pack

Prompts for generating visual reference for Dwell: mood, material, light, the character
Wick, and short motion studies. Written for Flow's Imagen (stills) and Veo (video) paths.

## How to use this

- **Text-to-Image** for every still prompt below. Generate 4, keep 1, then use the keeper as
  an **Ingredient** so later shots stay consistent.
- **Frames-to-Video** or **Ingredients-to-Video** for the motion studies — feed the still you
  kept so the material and palette carry over.
- Append the **Style Block** (§0) to every single prompt. It is what keeps the output off the
  AI-product default.
- Expect text in images to be garbled. Where a prompt mentions text, treat it as texture, not
  content. Real copy gets composited later or built in code.

What Flow is for here: palette calibration, material and lighting reference, Wick's form and
personality, the emotional register of the idle screen, and README/marketplace imagery.
What it is not for: layout, spacing, type specimens, or anything you would measure.

---

## 0. Style Block — append to every prompt

```
Style: matte and analogue, like a well-made measuring instrument. Warm neutral palette only
— warm charcoal #12110F, dark clay #1A1917, bone #E8E4DC, and a single burnt sienna accent
#C2703D. No blue, no purple, no violet, no teal. No gradients of any kind. No glass, no
glow, no bloom, no lens flare, no chromatic aberration, no neon, no particles, no bokeh
orbs, no holograms, no floating UI, no circuit-board motifs, no futuristic tech aesthetic.
Surfaces are matte: anodised aluminium, blackened brass, oiled walnut, uncoated paper,
felt. Lighting is soft and directional from one source, like a north-facing window or a
single desk lamp. Shot on a 50mm lens at f/4, Kodak Portra 400, slight grain, shallow but
not blurry depth. Restrained, quiet, precise. Reference: Braun ET66, Nagra tape deck,
Starrett machinist rule, Dieter Rams, Naoto Fukasawa, Teenage Engineering OP-1.
```

---

## 1. Material and mood boards

### 1.1 The instrument, as object

```
A flat-lay photograph of a small precision instrument on a dark linen surface: a blackened
brass rule, a machinist's depth gauge, a single burnt sienna enamel indicator dot, and a
strip of uncoated bone-white paper with faint horizontal ruling. Shot from directly
overhead. Negative space on the right third. Nothing digital in frame, nothing glowing.

[Style Block]
```

### 1.2 The palette, as physical samples

```
Six matte material swatches arranged in a single row on a neutral grey card, photographed
straight on under soft even light: warm charcoal anodised aluminium, dark clay ceramic,
oiled walnut, uncoated bone paper, moss green wool felt, and one burnt sienna enamel chip.
Each swatch is a plain rectangle with a soft shadowless edge. Colour accuracy is the point.

[Style Block]
```

### 1.3 Light study for the dark UI

```
A dark warm charcoal surface photographed in near-darkness, lit by a single small warm
light source out of frame to the left. The light falls off across the surface revealing a
fine matte texture. One small burnt sienna point of light is visible in the upper left,
about the size of a grain of rice, not glowing, not blooming — simply lit. Extremely low
contrast in the shadows, rich and warm, never black.

[Style Block]
```

### 1.4 The paper (light theme) study

```
A sheet of uncoated warm off-white paper, slightly textured, photographed at a shallow
angle under soft north light. A single thin burnt sienna vertical pencil line, two
centimetres tall, sits in the left third. Faint impressions of horizontal ruling are
visible in raking light. Nothing else in frame.

[Style Block]
```

---

## 2. Wick — the character

Wick is a two-pixel-wide vertical line with a small flame at the top. It is a real
measurement, not a mascot. Its height is how long the coding agent has been working. The
brief for Flow is: make me believe a thin line with a flame has a temperament — dry,
competent, faintly bored, never eager.

### 2.1 Wick, the hero still

```
Macro photograph of a single very thin upright wick standing on a matte warm charcoal
surface, with a small steady flame at its tip. The flame is small, controlled, burnt
sienna and amber, about five millimetres tall, not flickering wildly. The wick itself is a
clean straight dark line, almost geometric, unnaturally precise — it reads as a drawn line
rather than a string. Shallow depth of field, the flame in sharp focus. Everything else
falls into warm darkness. No smoke, no sparks, no embers, no glow halo, no bloom.

[Style Block]
```

### 2.2 Wick as burn-down indicator — a sequence

```
Four identical wicks standing in a row on a matte warm charcoal surface, photographed
straight on. From left to right they are progressively shorter: tall, two-thirds, half,
and a short stub. Each has the same small controlled burnt sienna flame at its tip. The
image reads as a measurement scale, like a set of calibration weights. Even soft lighting,
no dramatic shadow. Precise, clinical, quiet.

[Style Block]
```

### 2.3 Wick extinguished

```
Macro photograph of a thin upright wick on a matte warm charcoal surface immediately after
the flame has gone out. The tip is faintly warm-toned but there is no flame and no glow. A
single very thin thread of pale grey is barely suggested and then gone. The image is
overwhelmingly dark and still. It should feel like the end of something small and
ordinary, not like a dramatic moment.

[Style Block]
```

### 2.4 Wick as a drawn mark, not an object

```
A minimal graphic study on a matte dark clay ground: a single vertical burnt sienna line,
two pixels wide, forty pixels tall, absolutely straight, with a small solid flame-shaped
form at the top rendered in the same flat colour with no gradient and no glow. Flat vector
rendering, no texture, no shading, no outline, no highlights. Centred with generous
negative space. It should read as a printer's mark or a typographic ornament.

[Style Block]
```

### 2.5 Wick's temperament — a portrait without a face

```
A still life that conveys dry competence and mild boredom without any character or face in
frame: a single lit wick standing beside a closed notebook, a mechanical pencil laid down
at a slight angle, and a cooling cup. Everything is matte, nothing is new, everything has
been used. The flame is small and steady. Shot from a low three-quarter angle, one window
light from the left. The mood is a technician waiting for a machine to finish.

[Style Block]
```

---

## 3. The idle screen, shot as an object

Do not ask for a UI screenshot. Ask for a photograph of a physical thing that has the
qualities the screen should have.

### 3.1 The trace, as a physical artefact

```
Macro photograph of a strip of bone-white paper with twenty short vertical hairlines
ruled across it at even intervals, each a slightly different height, like a hand-drawn bar
record or a seismograph strip. The lines are fine grey graphite except the rightmost,
which is slightly darker. No axis, no numbers, no labels. The strip is lying on a matte
warm charcoal surface, lit from the left. Shallow depth of field along the strip.

[Style Block]
```

### 3.2 The screen as a measuring device

```
A small matte instrument panel photographed straight on in a dim room: a dark clay faceplate
with a single thin burnt sienna vertical indicator on the left, a row of fine ruled
hairlines across the lower third, and one small line of tiny engraved text. The faceplate
is matte and slightly dusty. No screens, no pixels, no backlight, no glow — it is a
mechanical instrument, not a display. Soft light from a single lamp above and left.

[Style Block]
```

### 3.3 Correctness without red

```
A typographic study on matte dark clay ground: a single line of simple serifless letters
running left to right, where the left two-thirds are bright warm bone-white and the right
third is dim grey, with the transition happening at a precise point. Three of the dim
letters have a fine horizontal rule beneath them. No red anywhere, no green anywhere, no
highlight boxes, no cursors, no underline colour other than grey. Flat, even lighting.
The image should read as illumination advancing across text.

[Style Block]
```

---

## 4. The thing in situ

### 4.1 Over the shoulder, dark room

```
Over-the-shoulder photograph of a person sitting at a plain wooden desk in a dim room at
night, facing a laptop. We see the back of their head and shoulders in silhouette. The
laptop screen is mostly dark warm charcoal with one small burnt sienna point of light
visible. The screen does not illuminate the room dramatically — it is dim and warm. A
single desk lamp with a matte shade provides the only other light. Quiet, unhurried,
late-evening. No blue screen glow, no neon, no RGB keyboard, no multiple monitors.

[Style Block]
```

### 4.2 The desk, empty

```
A plain oiled-wood desk photographed from a low angle in soft morning light. On it: a
closed laptop, a machinist's rule, a mechanical pencil, and a small unlit wick standing
upright in a tiny brass holder. Nothing else. Generous empty surface. The composition
should feel like a workshop bench between two jobs.

[Style Block]
```

---

## 5. Motion studies (Veo)

Use Frames-to-Video with your kept still as the first frame. Keep every clip 6–8 seconds.
Motion in this product is almost nothing, so the brief to Veo is restraint, and you will
have to fight it for that.

### 5.1 The flame sway

```
Static locked-off macro shot. A single thin upright wick with a small burnt sienna flame
at its tip, on a matte warm charcoal ground. The flame sways almost imperceptibly — a
drift of one or two millimetres side to side, slow and irregular, never repeating. Nothing
else in frame moves. The camera does not move at all. No zoom, no push-in, no rack focus,
no dolly. No flicker, no sparks, no smoke, no dramatic gust. Eight seconds of near
stillness.

[Style Block]
```

### 5.2 The burn-down

```
Static locked-off macro shot, no camera movement. A thin upright wick with a small steady
flame slowly burns down over eight seconds, shortening smoothly and evenly, like a
measurement falling rather than a candle melting. No wax, no dripping, no pooling, no
smoke. The flame stays exactly the same size throughout. At the end it does not go out.
Warm charcoal ground, single soft light from the left.

[Style Block]
```

### 5.3 The flame going out

```
Static locked-off macro shot of a thin wick with a small flame. At four seconds the flame
goes out — not blown out, not snuffed, simply ceasing over about a fifth of a second. No
smoke plume, no ember glow, no spark. The remaining four seconds are a completely still,
dark, warm frame with the unlit wick standing in it. The absence should feel ordinary.

[Style Block]
```

### 5.4 Illumination advancing

```
Static locked-off shot of a line of simple letterforms on matte dark clay ground. Over six
seconds, the letters light from left to right, one at a time, going from dim grey to warm
bone-white. The change per letter is instant and small — no glow, no bloom, no pulse, no
scale change, no wave effect, no shimmer travelling ahead of it. Three letters in the
middle never light and instead take a thin grey rule beneath them. The camera does not
move.

[Style Block]
```

### 5.5 The hairline

```
Static locked-off macro shot. A single fine moss-green hairline draws itself from left to
right beneath a line of text, at a steady unhurried pace, over four seconds. At the fifth
second it retracts back to nothing over a third of a second. Nothing else moves. No glow,
no trail, no particles, no easing bounce. Flat and mechanical, like a plotter pen.

[Style Block]
```

---

## 6. Marketplace and README imagery

### 6.1 Icon study

```
A flat graphic icon on a matte dark clay square: a single vertical burnt sienna line with
a small solid flame form at the top, centred, generous margin. Flat colour, no gradient,
no glow, no bevel, no shadow, no outline, no rounded container, no badge. It should work
at sixteen pixels. Reference: a printer's ornament, a Swiss pictogram, a machinist's
punch mark.

[Style Block]
```

### 6.2 Hero image

```
A wide horizontal composition, mostly empty warm charcoal space, with a single small lit
wick standing in the lower left third and a faint strip of ruled hairlines in the lower
right. Extremely minimal. Room for a short line of text across the upper half, though no
text appears in the image. Soft directional light from the left, deep warm shadow, matte
throughout.

[Style Block]
```

---

## 7. Negative prompt — paste into Flow's negative field every time

```
purple, violet, indigo, blue, teal, cyan, neon, gradient, glow, bloom, lens flare, glass,
glassmorphism, frosted, translucent, holographic, futuristic, sci-fi, cyberpunk, circuit
board, data visualisation, floating orbs, particles, sparkles, confetti, bokeh, chat
bubble, speech bubble, robot, android, cute mascot, big eyes, cartoon character, 3D render,
octane render, unreal engine, chrome, metallic sheen, high gloss, studio softbox, rim
light, dramatic lighting, HDR, oversaturated, text, watermark, logo, UI screenshot,
dashboard, app interface, glossy plastic, RGB lighting, multiple monitors
```

---

## 8. Things to generate elsewhere, not in Flow

- **Type specimens.** Set iA Writer Quattro S and IBM Plex Mono at 19px and 13px in a
  browser and screenshot them. No image model renders a font you can evaluate.
- **Layout and spacing.** Build it in the harness against the 4px scale. A generated image
  of a layout is a suggestion you cannot measure.
- **The actual panel.** Screenshot the harness. That is what `docs/shots/` is for.
- **Sound.** Prototype the WebAudio synthesis directly; a video's audio track will not tell
  you whether 1600Hz with Q=6 sounds like felt on wood.
```
