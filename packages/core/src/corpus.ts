import type { DrillItem, TierLevel } from './types.js';

// ── Allowed characters ──────────────────────────────────────────────

/**
 * Characters permitted in drill text.
 * Letters, digits, space, period, comma, colon, apostrophe, hyphen,
 * newline, '>', and '---' (horizontal rule pattern).
 *
 * The regex matches any single allowed character.
 */
export const ALLOWED_CHARS = /^[a-zA-Z0-9 .,:\-'\n>]$/;

/**
 * Full-string validation: every character in the text must be allowed.
 */
function isAllowedText(text: string): boolean {
  for (const ch of text) {
    if (!ALLOWED_CHARS.test(ch)) return false;
  }
  return true;
}

// ── Corpus loading ──────────────────────────────────────────────────

/** In-memory corpus cache, keyed by tier. */
const cache = new Map<TierLevel, DrillItem[]>();

/**
 * Load corpus items for a given tier.
 *
 * In a bundled environment, the corpus JSON files are imported at build time.
 * This function expects the corpus data to have been registered via
 * `registerCorpus` before calling `loadCorpus`.
 *
 * Returns the array of drill items for the requested tier.
 */
export function loadCorpus(tier: TierLevel): DrillItem[] {
  const items = cache.get(tier);
  if (!items) {
    throw new Error(
      `Corpus for tier ${tier} not loaded. Call registerCorpus() first.`,
    );
  }
  return items;
}

/**
 * Register corpus data for a tier. Called at startup with the parsed JSON.
 */
export function registerCorpus(tier: TierLevel, items: DrillItem[]): void {
  cache.set(tier, items);
}

/** Clear all cached corpus data. Useful for testing. */
export function clearCorpusCache(): void {
  cache.clear();
}

// ── Corpus linting ──────────────────────────────────────────────────

/**
 * Lint a single corpus item for violations.
 * Returns an array of violation messages (empty = valid).
 */
export function lintCorpusItem(item: DrillItem): string[] {
  const violations: string[] = [];

  // id must be non-empty
  if (!item.id || item.id.trim().length === 0) {
    violations.push(`Item has empty id`);
  }

  // tier must be 1-6
  if (item.tier < 1 || item.tier > 6) {
    violations.push(`${item.id}: tier ${item.tier} is out of range [1-6]`);
  }

  // text must be non-empty
  if (!item.text || item.text.trim().length === 0) {
    violations.push(`${item.id}: text is empty`);
  }

  // text must contain only allowed characters
  if (item.text && !isAllowedText(item.text)) {
    // Find the specific offending characters
    for (let i = 0; i < item.text.length; i++) {
      const ch = item.text[i];
      if (!ALLOWED_CHARS.test(ch)) {
        violations.push(
          `${item.id}: forbidden character '${ch}' (U+${ch.charCodeAt(0).toString(16).padStart(4, '0')}) at position ${i}`,
        );
      }
    }
  }

  // text should not be excessively short (< 5 chars makes scoring impossible)
  if (item.text && item.text.trim().length < 5) {
    violations.push(`${item.id}: text is shorter than 5 characters`);
  }

  return violations;
}

/**
 * Lint all registered corpus data across all tiers.
 * Returns { valid, errors } where valid is true if no errors found.
 */
export function lintCorpus(): { valid: boolean; errors: string[] } {
  const allErrors: string[] = [];

  for (const tier of [1, 2, 3, 4, 5, 6] as TierLevel[]) {
    const items = cache.get(tier);
    if (!items) {
      allErrors.push(`Tier ${tier}: no corpus data registered`);
      continue;
    }

    if (items.length === 0) {
      allErrors.push(`Tier ${tier}: corpus is empty`);
      continue;
    }

    // Check for duplicate IDs within the tier
    const ids = new Set<string>();
    for (const item of items) {
      if (ids.has(item.id)) {
        allErrors.push(`Tier ${tier}: duplicate id '${item.id}'`);
      }
      ids.add(item.id);

      const itemErrors = lintCorpusItem(item);
      allErrors.push(...itemErrors);
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
