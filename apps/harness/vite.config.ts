import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname),
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [resolve(__dirname, '../..')],
    },
  },
  resolve: {
    alias: {
      '@dwell/core': resolve(__dirname, '../../packages/core/src'),
      '@dwell/webview': resolve(__dirname, '../../packages/webview/src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});

