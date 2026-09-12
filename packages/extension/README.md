# Dwell

Dwell is a VS Code extension that teaches prompt writing as a typing skill.

It detects when a coding agent is mid-task, and after 25 seconds offers a typing drill.
One keystroke (`Ctrl+Alt+Space`) opens it, the same keystroke closes it.

- Zero AI product tropes: no gradients, no glassmorphism, no glow, no red/green success/error colors.
- 60fps typing hot path: Float32Array cached glyph geometry, 2 DOM mutations per keystroke max.
- Works offline, zero telemetry, zero LLM calls.
