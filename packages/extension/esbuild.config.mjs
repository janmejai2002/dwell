import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const config = {
  entryPoints: [resolve(__dirname, 'src/extension.ts')],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: resolve(__dirname, 'dist/extension.js'),
  external: ['vscode'],
  minify: !watch,
  sourcemap: watch,
  target: 'es2022',
  logLevel: 'info',
};

import * as fs from 'fs';

function copyAssets() {
  const distDir = resolve(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy hook.cjs
  const hookSrc = resolve(__dirname, '../hook/hook.cjs');
  if (fs.existsSync(hookSrc)) {
    fs.copyFileSync(hookSrc, resolve(distDir, 'hook.cjs'));
  }

  // Copy webview build artifacts (including fonts)
  const webviewDist = resolve(__dirname, '../webview/dist');
  if (fs.existsSync(webviewDist)) {
    fs.cpSync(webviewDist, distDir, { recursive: true });
  }

  // Copy webview index.html template
  const webviewIndex = resolve(__dirname, '../webview/index.html');
  if (fs.existsSync(webviewIndex)) {
    fs.copyFileSync(webviewIndex, resolve(distDir, 'index.html'));
  }
}

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('watching…');
} else {
  await esbuild.build(config);
  copyAssets();
}

