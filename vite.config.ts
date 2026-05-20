import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'push-sw.js'],
      manifest: {
        name: 'Promin Store',
        short_name: 'Promin Store',
        description: 'Робоче місце магазину ПРОМІНЬ',
        theme_color: '#0F3D2E',
        background_color: '#F5F6F4',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        importScripts: ['/push-sw.js'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
