// ── Types ───────────────────────────────────────────────────────────
export type {
  GlyphState,
  TierLevel,
  TierName,
  DrillItem,
  GlyphInfo,
  RunResult,
  HostMessage,
  WebviewMessage,
  Message,
  AgentStartMessage,
  AgentEndMessage,
  RevealMessage,
  HideMessage,
  StateRestoreMessage,
  ThemeMessage,
  ReadyMessage,
  RunCompleteMessage,
  RunAbandonMessage,
  PrefSetMessage,
  HookInstallMessage,
  AgentEvent,
  OfferState,
  TierProgress,
} from './types.js';

// ── Engine ──────────────────────────────────────────────────────────
export type { DrillState, KeystrokeEvent } from './engine.js';
export { loadDrill, processKeystroke, processBackspace, isDrillComplete } from './engine.js';

// ── Scoring ─────────────────────────────────────────────────────────
export {
  computeUWPM,
  computeLatency,
  computeLongestClean,
  computeRunResult,
} from './scoring.js';

// ── Tiers ───────────────────────────────────────────────────────────
export type { TierDef } from './tiers.js';
export { TIERS, getTier, checkPass, initTierProgress, updateProgress } from './tiers.js';

// ── Offer Governor ──────────────────────────────────────────────────
export type { OfferContext, OfferDecision } from './offer-governor.js';
export {
  canOffer,
  recordOffer,
  recordIgnore,
  recordComplete,
  createOfferState,
} from './offer-governor.js';

// ── Corpus ──────────────────────────────────────────────────────────
export {
  ALLOWED_CHARS,
  loadCorpus,
  registerCorpus,
  clearCorpusCache,
  lintCorpusItem,
  lintCorpus,
} from './corpus.js';
