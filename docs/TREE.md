# Dwell — Starter folder tree

```
dwell/
├── AGENTS.md                               Root agent brief: what this is, hard rules, how to work here.
├── README.md                               Human-facing: what Dwell is, install, one screenshot.
├── package.json                            pnpm workspace root; scripts: build, test, perf, package, publish.
├── pnpm-workspace.yaml                     Declares packages/* and apps/*.
├── tsconfig.base.json                      Shared strict TS config; every package extends it.
├── .editorconfig                           2-space, LF, final newline. Non-negotiable across hosts.
├── .vscodeignore                           Keeps sources, tests and harness out of the shipped VSIX.
├── CHANGELOG.md                            Semver history; release notes are written here first.
│
├── .agents/
│   ├── rules/
│   │   ├── 00-product.md                   always_on — the loop, Wick's behaviour, non-goals. The "what".
│   │   ├── 10-visual-language.md           always_on — tokens, type, motion, sound, the forbidden list.
│   │   ├── 20-architecture.md              always_on — package boundaries, message protocol, persistence.
│   │   ├── 30-performance.md               glob: packages/webview/** — the hot-path rules and the budget.
│   │   ├── 40-host-detection.md            glob: packages/extension/** — signals, priorities, offer governor.
│   │   └── 50-verification.md              always_on — what "done" means; no green-build-equals-success.
│   └── skills/
│       ├── drill-authoring/SKILL.md        How to write a corpus item for a given tier without breaking constraints.
│       └── verify-in-browser/SKILL.md      How to run the harness and check a visual change like a person would.
│
├── packages/
│   ├── core/
│   │   ├── package.json                    No dependencies. This is enforced, not aspirational.
│   │   ├── src/engine.ts                   Drill state machine: cursor, glyph states, keystroke reducer.
│   │   ├── src/scoring.ts                  uWPM, latency, longest-clean-run. Pure functions, heavily tested.
│   │   ├── src/tiers.ts                    Tier definitions, targets, the three-consecutive unlock rule.
│   │   ├── src/offer-governor.ts           Every interruption rule as a pure function of clock + history.
│   │   ├── src/types.ts                    Shared types including the host⇄webview message union.
│   │   ├── corpus/tier1-plain.json         ~80 single-line prompt sentences, prompt-weighted vocabulary.
│   │   ├── corpus/tier2-break.json         ~70 multi-line prompts where Enter carries structure.
│   │   ├── corpus/tier3-rule.json          ~70 items using --- and > as delimiters.
│   │   ├── corpus/tier4-frame.json         ~70 full Goal/Context/Constraints/Done prompts.
│   │   ├── corpus/tier5-recall.json        ~60 items tagged with their required structural sections.
│   │   ├── corpus/tier6-cold.json          ~50 one-sentence task descriptions with no target text.
│   │   └── test/                           vitest specs mirroring src/ one-to-one.
│   │
│   ├── webview/
│   │   ├── src/main.ts                     Boot, message handling, the single rAF loop, keystroke queue.
│   │   ├── src/render/glyphs.ts            Builds the span track once per drill; caches glyph offsets.
│   │   ├── src/render/caret.ts             The only element with will-change; transform-only movement.
│   │   ├── src/render/wick.ts              Flame geometry, the three-sine sway, burn-down from elapsed time.
│   │   ├── src/render/trace.ts             The 20-hairline history strip on the idle screen.
│   │   ├── src/audio/keys.ts               WebAudio synthesis: noise burst + body, inverse-velocity gain.
│   │   ├── src/styles/tokens.css           The palette, spacing scale and type stack as custom properties.
│   │   ├── src/styles/panel.css            Layout only. No colour literals outside tokens.css.
│   │   ├── assets/fonts/                   iA Writer Quattro S + IBM Plex Mono, woff2, OFL licences included.
│   │   └── index.html                      CSP'd shell with nonce placeholders the host substitutes.
│   │
│   ├── extension/
│   │   ├── src/extension.ts                activate(): preload webview, start signals, register commands.
│   │   ├── src/panel.ts                    WebviewViewProvider; reveal/hide; the sub-100ms path.
│   │   ├── src/detect/index.ts             AgentActivityMonitor: merges signals by priority.
│   │   ├── src/detect/claudeHook.ts        IPC server for hook.cjs frames. Priority 100.
│   │   ├── src/detect/claudeTranscript.ts  Watches ~/.claude/projects/**/*.jsonl appends. Priority 80.
│   │   ├── src/detect/terminalShell.ts     onDidStart/EndTerminalShellExecution. Priority 60.
│   │   ├── src/detect/taskApi.ts           tasks.onDidStartTask / onDidEndTask. Priority 50.
│   │   ├── src/detect/docBurst.ts          The multi-file multi-line change heuristic. Priority 30.
│   │   ├── src/detect/hostProbe.ts         Feature-detects host-specific agent APIs at activation.
│   │   ├── src/hook-installer.ts           Merge-not-clobber write of ~/.claude/settings.json, with backup.
│   │   ├── src/storage.ts                  globalState + atomic runs.json; debounced flush.
│   │   └── test/                           @vscode/test-electron integration tests.
│   │
│   └── hook/
│       ├── hook.cjs                        Single zero-dependency file. Reads stdin, writes one socket frame, exits 0.
│       └── test/hook.spec.ts               Asserts: always exit 0, always silent, under 50ms, no-listener path.
│
├── apps/
│   └── harness/
│       ├── index.html                      Mounts packages/webview outside VS Code for visual verification.
│       ├── src/mock-host.ts                Fakes the host message protocol: reveal, agent:start, agent:end.
│       └── vite.config.ts                  Dev server on a fixed port so agents and CI can rely on the URL.
│
├── tests/
│   ├── perf/typing.spec.ts                 Playwright: 600 synthetic keystrokes, 4x CPU throttle, frame budget.
│   └── visual/idle.spec.ts                 Screenshot diff of the idle screen, light and dark.
│
└── .github/workflows/ci.yml                Build, unit, integration, perf and visual gates. All blocking.
```
