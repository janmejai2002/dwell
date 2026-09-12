import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const config = {
  entryPoints: [resolve(__dirname, 'src/main.ts')],
  bundle: true,
  format: 'iife',
  outfile: resolve(__dirname, 'dist/webview.js'),
  minify: !watch,
  sourcemap: watch,
  loader: {
    '.css': 'css',
    '.woff2': 'file',
  },
  assetNames: 'fonts/[name]',
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('watching…');
} else {
  await esbuild.build(config);
}
