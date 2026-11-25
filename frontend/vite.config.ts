import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const rootPackage = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, '..', 'package.json'), 'utf8'),
) as { version: string };

const API_TARGET = process.env.LIFEOS_API_URL ?? 'http://127.0.0.1:8080';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(rootPackage.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered in src/main.tsx
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Life OS',
        short_name: 'Life OS',
        description: 'Persönliches Alltags-Tracking',
        lang: 'de',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f5f5f7',
        theme_color: '#f5f5f7',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell only — API responses are never cached by the service worker (ADR-010).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // A new version takes over immediately instead of waiting until every window of the
        // installed app is closed (Android keeps PWAs alive in the background). Must be set
        // explicitly because injectRegister is false (ADR-031, ADR-035).
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 5173,
    strictPort: true,
    // Allows testing the dev server via `tailscale serve` (*.ts.net) as well.
    allowedHosts: ['.ts.net'],
    proxy: {
      // Keeps the browser on one origin (cookies, origin check) during development.
      '/api': { target: API_TARGET, changeOrigin: false, xfwd: true },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
