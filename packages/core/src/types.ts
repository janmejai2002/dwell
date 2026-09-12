// ── Glyph & Drill primitives ────────────────────────────────────────

/** Visual state of a single character in the drill. */
export type GlyphState = 'pending' | 'struck' | 'missed' | 'corrected';

/** Tier difficulty levels 1–6. */
export type TierLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Human-readable tier names. */
export type TierName = 'plain' | 'break' | 'rule' | 'frame' | 'recall' | 'cold';

/** A single drill item loaded from the corpus. */
export interface DrillItem {
  id: string;
  tier: TierLevel;
  text: string;
  sections?: string[];
  keyTerms?: string[];
}

/** Runtime info for a single character position. */
export interface GlyphInfo {
  char: string;
  state: GlyphState;
  index: number;
}

// ── Run results ─────────────────────────────────────────────────────

export interface RunResult {
  tier: TierLevel;
  /** Unbroken words per minute; null if no clean stretch ≥ 5 chars. */
  uWPM: number | null;
  /** Ms from prompt-visible to first keystroke; null if abandoned. */
  latencyMs: number | null;
  /** Longest consecutive-correct keystroke count. */
  longestClean: number;
  errors: number;
  durationMs: number;
  ts: number;
}

// ── Message protocol (v1) ───────────────────────────────────────────

interface MessageBase {
  v: 1;
}

// Host → Webview ─────────────────────────────────────────────────────

export interface AgentStartMessage extends MessageBase {
  type: 'agent:start';
  estimateMs?: number;
}

export interface AgentEndMessage extends MessageBase {
  type: 'agent:end';
}

export interface RevealMessage extends MessageBase {
  type: 'reveal';
  item: DrillItem;
}

export interface HideMessage extends MessageBase {
  type: 'hide';
}

export interface StateRestoreMessage extends MessageBase {
  type: 'state:restore';
  progress: TierProgress[];
}

export interface ThemeMessage extends MessageBase {
  type: 'theme';
  kind: 'dark' | 'light' | 'high-contrast' | 'high-contrast-light';
}

export type HostMessage =
  | AgentStartMessage
  | AgentEndMessage
  | RevealMessage
  | HideMessage
  | StateRestoreMessage
  | ThemeMessage;

// Webview → Host ─────────────────────────────────────────────────────

export interface ReadyMessage extends MessageBase {
  type: 'ready';
}

export interface RunCompleteMessage extends MessageBase {
  type: 'run:complete';
  result: RunResult;
}

export interface RunAbandonMessage extends MessageBase {
  type: 'run:abandon';
}

export interface PrefSetMessage extends MessageBase {
  type: 'pref:set';
  key: string;
  value: unknown;
}

export interface HookInstallMessage extends MessageBase {
  type: 'hook:install';
}

export type WebviewMessage =
  | ReadyMessage
  | RunCompleteMessage
  | RunAbandonMessage
  | PrefSetMessage
  | HookInstallMessage;

/** All messages across the channel. */
export type Message = HostMessage | WebviewMessage;

// ── Agent events ────────────────────────────────────────────────────

export interface AgentEvent {
  type: 'start' | 'end';
  ts: number;
  estimateMs?: number;
}

// ── Offer governor state ────────────────────────────────────────────

export interface OfferState {
  lastOfferTs: number;
  offersToday: number;
  consecutiveIgnores: number;
  lastCompletedRunTs: number;
  lastDrillEndTs: number;
  sessionHadCompletedDrill: boolean;
}

// ── Tier progress ───────────────────────────────────────────────────

export interface TierProgress {
  level: TierLevel;
  consecutivePasses: number;
  unlocked: boolean;
  bestUWPM: number | null;
}
