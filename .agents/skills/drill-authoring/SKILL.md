---
name: drill-authoring
description: Write or review a corpus item for one of Dwell's six tiers without violating the character-set constraint or the curriculum's argument.
---

# Drill authoring

Use this when adding to or reviewing anything under `packages/core/corpus/`.

## The hard constraint

The permitted character set across every tier is: **letters, digits, space, newline,
period, comma, hyphen, apostrophe, `---` on its own line, and `>` at the start of a line.**

Nothing else. No parentheses, braces, brackets, slashes, backticks, colons inside prose,
asterisks, at-signs, or ampersands. If a drill item needs a bracket, rewrite the sentence.
This is the product's whole differentiating claim and it is not negotiable for convenience.

Sections in Tier 4/5 frames are written as bare words on their own line — `Goal`, `Context`,
`Constraints`, `Done` — not as `## Goal` and not as `Goal:`.

## Voice

Every item must be a prompt a competent person might actually send to a coding agent. Not a
pangram, not filler, not a sentence about typing. Read it aloud; if it sounds like a typing
test rather than like work, cut it.

Prefer the vocabulary that prompt writing actually uses: refactor, endpoint, repro,
idempotent, schema, flaky, revert, migration, assert, stub, throughput, backfill, cache
invalidation, race, timeout, retry, fixture, coverage, regression.

Avoid: company names, real people, anything dated (model names, version numbers, years),
profanity, and anything that would read oddly to someone in a different country.

## Per-tier requirements

**Tier 1 — Plain.** One line, 40–90 characters, no newline. A single instruction.
> `move the retry logic out of the request handler and into a small helper`

**Tier 2 — Break.** 3–6 lines, one instruction per line, no terminal punctuation. Each line
must stand alone — if two lines could be joined with "and", merge them.

**Tier 3 — Rule.** Two or three blocks separated by a line containing exactly `---`. At
least one block is quoted context, every line of it prefixed `> `. Quoted context should
look like real pasted material: a log line, an error message in prose, a requirement.

**Tier 4 — Frame.** All four sections, in order, each with 1–4 lines under it. Constraints
must contain at least two genuine constraints. Done must be checkable — "the flaky test
passes ten times in a row", not "it works".

**Tier 5 — Recall.** Same shape as Tier 4, plus a `sections` array in the JSON naming what
structural recall requires, and a `keyTerms` array of the 3–6 words whose presence is
scored. Keep these items shorter than Tier 4's — under 220 characters — because they must
be holdable in memory after four seconds.

**Tier 6 — Cold.** One sentence describing a task, and nothing else. No target text exists.
Include a `coverage` array naming the sections a good answer would have. The item must be
answerable in 30–60 seconds of typing by someone who knows the domain.

## Item schema

```json
{
  "id": "t3-017",
  "tier": 3,
  "text": "…",
  "chars": 184,
  "sections": ["Goal", "Constraints"],
  "keyTerms": ["idempotent", "retry"],
  "coverage": ["Goal", "Constraints", "Done"]
}
```

`text` is the exact string to type, newlines as `\n`. `chars` is precomputed. `sections`,
`keyTerms` and `coverage` are tier-dependent and omitted where they do not apply.

## Checks before committing

1. Run the corpus linter — it must reject any character outside the permitted set.
2. Character count matches `chars`.
3. No trailing whitespace on any line; no trailing newline at the end of `text`.
4. The item does not duplicate an existing one's opening six words.
5. Read it aloud. If it sounds like filler, it is filler.
