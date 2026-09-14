import fs from 'fs';
import path from 'path';

const ALLOWED_CHARS = /^[a-zA-Z0-9 .,:\-'\n>]$/;
const FORBIDDEN_CHARS = /[[\]{}()@#$%!?;"`~\\/=+*&^|<]/;

export function validateCorpusFile(filePath, expectedTier) {
  const content = fs.readFileSync(filePath, 'utf8');
  const items = JSON.parse(content);
  const errors = [];

  if (items.length !== 20) {
    errors.push(`Expected 20 items, got ${items.length}`);
  }

  const seenIds = new Set();
  const seenOpenings = new Set();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const id = item.id;
    const expectedId = `t${expectedTier}-${String(i + 1).padStart(3, '0')}`;
    if (id !== expectedId) {
      errors.push(`Item ${i}: expected id ${expectedId}, got ${id}`);
    }
    if (seenIds.has(id)) {
      errors.push(`Duplicate id: ${id}`);
    }
    seenIds.add(id);

    if (item.tier !== expectedTier) {
      errors.push(`${id}: expected tier ${expectedTier}, got ${item.tier}`);
    }

    if (typeof item.text !== 'string' || item.text.length === 0) {
      errors.push(`${id}: text must be non-empty string`);
      continue;
    }

    if (item.chars !== item.text.length) {
      errors.push(`${id}: chars (${item.chars}) != text.length (${item.text.length})`);
    }

    // Trailing newline at end of text
    if (item.text.endsWith('\n')) {
      errors.push(`${id}: text ends with trailing newline`);
    }

    // Lines check
    const lines = item.text.split('\n');
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      if (line !== line.trimEnd()) {
        errors.push(`${id}: line ${li + 1} has trailing whitespace`);
      }
      if (line.length === 0 && expectedTier !== 3) {
        errors.push(`${id}: line ${li + 1} is empty`);
      }
    }

    // Allowed chars check
    for (let c = 0; c < item.text.length; c++) {
      const ch = item.text[c];
      if (!ALLOWED_CHARS.test(ch)) {
        errors.push(`${id}: forbidden character '${ch}' (code ${ch.charCodeAt(0)}) at index ${c}`);
      }
      if (FORBIDDEN_CHARS.test(ch)) {
        errors.push(`${id}: explicitly forbidden character '${ch}' at index ${c}`);
      }
    }

    // Opening 6 words duplication check
    const words = item.text.trim().split(/\s+/).slice(0, 6).join(' ');
    if (seenOpenings.has(words)) {
      errors.push(`${id}: duplicate opening words: "${words}"`);
    }
    seenOpenings.add(words);

    // Tier-specific checks
    if (expectedTier === 1) {
      if (lines.length !== 1) {
        errors.push(`${id}: Tier 1 must be 1 line, got ${lines.length}`);
      }
      if (item.text.length < 45 || item.text.length > 85) {
        errors.push(`${id}: Tier 1 length must be 45-85, got ${item.text.length}`);
      }
    } else if (expectedTier === 2) {
      if (lines.length < 3 || lines.length > 5) {
        errors.push(`${id}: Tier 2 lines must be 3-5, got ${lines.length}`);
      }
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        if (/[.,:;]$/.test(line)) {
          errors.push(`${id}: line ${li + 1} has terminal punctuation: "${line}"`);
        }
      }
    } else if (expectedTier === 3) {
      // Tier 3: 2-3 blocks separated by '---' on its own line. Quoted lines begin with '> '
      const hasDivider = lines.some(l => l === '---');
      if (!hasDivider) {
        errors.push(`${id}: Tier 3 missing '---' divider`);
      }
      const hasQuote = lines.some(l => l.startsWith('> '));
      if (!hasQuote) {
        errors.push(`${id}: Tier 3 missing '> ' quote`);
      }
    } else if (expectedTier === 4) {
      // Must contain Goal, Context, Constraints, Done headers
      const expectedHeaders = ['Goal', 'Context', 'Constraints', 'Done'];
      let headerIdx = 0;
      for (const line of lines) {
        if (line === expectedHeaders[headerIdx]) {
          headerIdx++;
        }
      }
      if (headerIdx !== 4) {
        errors.push(`${id}: Tier 4 headers missing or out of order`);
      }
    } else if (expectedTier === 5) {
      if (item.text.length >= 220) {
        errors.push(`${id}: Tier 5 length must be under 220, got ${item.text.length}`);
      }
      if (!Array.isArray(item.sections) || item.sections.length !== 4) {
        errors.push(`${id}: Tier 5 sections must be array of 4`);
      }
      if (!Array.isArray(item.keyTerms) || item.keyTerms.length < 3 || item.keyTerms.length > 6) {
        errors.push(`${id}: Tier 5 keyTerms must have 3-6 items, got ${item.keyTerms?.length}`);
      }
    } else if (expectedTier === 6) {
      if (lines.length !== 1) {
        errors.push(`${id}: Tier 6 must be 1 sentence (1 line), got ${lines.length}`);
      }
      if (!Array.isArray(item.coverage) || item.coverage.length !== 4) {
        errors.push(`${id}: Tier 6 coverage must be array of 4`);
      }
    }
  }

  return errors;
}

import { fileURLToPath } from 'url';

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const filePath = process.argv[2];
  const tier = parseInt(process.argv[3], 10);
  const errors = validateCorpusFile(filePath, tier);
  if (errors.length > 0) {
    console.error('Validation errors found:');
    for (const err of errors) console.error('  -', err);
    process.exit(1);
  } else {
    console.log(`Validation passed cleanly for Tier ${tier} (${filePath})!`);
  }
}
