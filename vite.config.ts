import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import webExtension from 'vite-plugin-web-extension';
import { fileURLToPath, URL } from 'node:url';
import { buildManifest } from './src/manifest';

const browser = process.env.BROWSER === 'firefox' ? 'firefox' : 'chrome';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    webExtension({
      disableAutoLaunch: true,
      browser,
      manifest: () => buildManifest(browser),
      htmlViteConfig: {
        build: {
          sourcemap: true,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: browser === 'firefox' ? 'dist/firefox' : 'dist/chrome',
    emptyOutDir: true,
    sourcemap: true,
  },
});
