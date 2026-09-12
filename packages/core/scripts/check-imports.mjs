import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = join(import.meta.dirname, '..', 'src');
const FORBIDDEN = [
  /from\s+['"]vscode['"]/,
  /import\s+['"]vscode['"]/,
  /require\(['"]vscode['"]\)/,
  /\bdocument\./,
  /\bwindow\./,
  /\bHTMLElement\b/,
  /\bDOM\b/,
];

let failed = false;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (!entry.endsWith('.ts')) continue;
    const content = readFileSync(full, 'utf8');
    for (const pat of FORBIDDEN) {
      const m = content.match(pat);
      if (m) {
        const rel = relative(SRC, full);
        console.error(`FAIL: ${rel} contains forbidden pattern: ${m[0]}`);
        failed = true;
      }
    }
  }
}

walk(SRC);
if (failed) process.exit(1);
console.log('OK: no forbidden imports in packages/core/src/');
