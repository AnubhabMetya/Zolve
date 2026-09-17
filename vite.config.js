import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Zolve — Cooperative Gig Services Platform',
        short_name: 'Zolve',
        description: 'Cooperative gig-services platform connecting verified workers with households & communities. SIH26089.',
        theme_color: '#0f172a',
        background_color: '#F8FAFC',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        lang: 'en',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          { urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i, handler: 'CacheFirst', options: { cacheName: 'osm-tiles', expiration: { maxEntries: 200, maxAgeSeconds: 86400 } } },
          { urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i, handler: 'NetworkFirst', options: { cacheName: 'nominatim', expiration: { maxEntries: 50, maxAgeSeconds: 3600 } } },
          { urlPattern: /\/data\/.*\.json$/i, handler: 'NetworkFirst', options: { cacheName: 'zolve-data', expiration: { maxEntries: 20, maxAgeSeconds: 3600 } } }
        ]
      }
    })
  ],
  envDir: '.',
  envPrefix: 'VITE_',
})
