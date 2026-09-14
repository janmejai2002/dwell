import fs from 'fs';
import { validateCorpusFile } from './validate-corpus.mjs';

const tiers = [1, 2, 3, 4, 5, 6];
const files = {
  1: 'packages/core/corpus/tier1-plain.json',
  2: 'packages/core/corpus/tier2-break.json',
  3: 'packages/core/corpus/tier3-rule.json',
  4: 'packages/core/corpus/tier4-frame.json',
  5: 'packages/core/corpus/tier5-recall.json',
  6: 'packages/core/corpus/tier6-cold.json',
};

const tierArg = process.argv[2] ? parseInt(process.argv[2], 10) : null;
const tiersToProcess = tierArg ? [tierArg] : tiers;

let anyError = false;

for (const t of tiersToProcess) {
  const filePath = files[t];
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf8');
  const items = JSON.parse(content);

  // Sync chars
  for (const item of items) {
    item.chars = item.text.length;
  }
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2) + '\n');

  const errors = validateCorpusFile(filePath, t);
  if (errors.length > 0) {
    console.error(`Tier ${t} (${filePath}) errors:`);
    for (const e of errors) console.error(`  - ${e}`);
    anyError = true;
  } else {
    console.log(`Tier ${t} (${filePath}) is 100% valid!`);
  }
}

if (anyError) process.exit(1);
