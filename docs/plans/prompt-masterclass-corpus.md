# Plan: Senior Prompt Engineering Masterclass Corpus (120 Drills)

## Overview
Transform all 120 prompt drills across `packages/core/corpus/` (20 unique drills per tier across Tiers 1–6) into an elite, publication-grade prompt engineering masterclass.
Every drill trains real, senior-level intuition and muscle memory for directing autonomous coding agents (Claude Code, Cursor Composer, Antigravity, Windsurf).

## Files to Touch
1. `packages/core/corpus/tier1-plain.json` (20 drills)
2. `packages/core/corpus/tier2-break.json` (20 drills)
3. `packages/core/corpus/tier3-rule.json` (20 drills)
4. `packages/core/corpus/tier4-frame.json` (20 drills)
5. `packages/core/corpus/tier5-recall.json` (20 drills)
6. `packages/core/corpus/tier6-cold.json` (20 drills)

## Pedagogical Requirements
- **Tier 1 (Plain)**: 1 line, 45–85 characters, no newlines. Atomic, imperative, surgical directives on idempotency, locks, migrations, retries, fixtures, leak isolation, tracing.
- **Tier 2 (Break)**: 3–5 lines, exactly one directive per line, separated by `\n`, no terminal punctuation. Multi-step atomic sequential decomposition.
- **Tier 3 (Rule)**: 2–3 blocks separated by a line containing exactly `---`. Quoted lines prefixed with `> `. Strict human instruction vs error/log/spec context demarcation.
- **Tier 4 (Frame)**: 4-part senior prompt architecture with bare headers: `Goal`, `Context`, `Constraints`, `Done`. Minimum 2 genuine negative constraints under `Constraints`. Falsifiable, checkable criteria under `Done`.
- **Tier 5 (Recall)**: Under 220 characters total so the frame can be held in working memory after 4 seconds. Must include `sections` array and `keyTerms` array in JSON schema.
- **Tier 6 (Cold)**: Exactly one sentence defining an engineering situation requiring unassisted prompt synthesis. Must include `coverage` array (`["Goal", "Context", "Constraints", "Done"]`).

## Strict Character Set & Formatting Contract
- Permitted characters: `^[a-zA-Z0-9 .,:\-'\n>]$`
- Forbidden characters: `()`, `[]`, `{}`, `""`, ```, `;`, `/\`, `*`, `@`, `#`, `&`, `!`, `?`, `$`, `%`, `+`, `=`, `^`, `|`, `<`, `~`.
- No trailing whitespace on any line; no trailing newline at the end of `text`.
- `chars === text.length` exactly.

## Verification & Build Gate Plan
1. Automated corpus linting via custom Node/Vitest test: `pnpm --filter @dwell/core test`.
2. Full repository test suite: `pnpm -r test` (asserting all 106 tests pass).
3. Performance benchmarks: `pnpm perf` (validating bundle size < 40KB gzipped and 60fps frame budget).
4. Full build across webview, extension, and harness: `pnpm -r build`.
5. VSIX package generation: `pnpm package`.
6. Playwright verification of the harness "Browse All 120 Drills" modal across all 6 tiers.
7. Git commit, push to main, and update GitHub release asset `dwell-0.1.0.vsix`.
