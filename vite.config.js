import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const BASE_PATH = '/Atlas-Attack-2.0/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Atlas Attack',
        short_name: 'AtlasAttack',
        description: 'Personal travel tracker with offline support and interactive maps.',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: BASE_PATH,
        start_url: BASE_PATH,
        icons: [
          {
            src: `${BASE_PATH}icons/pwa-icon.svg`,
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: `${BASE_PATH}icons/pwa-icon.svg`,
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: BASE_PATH
      }
    })
  ],
  server: {
    port: 4173
  }
});
