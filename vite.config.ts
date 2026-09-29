import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Renova OS',
        short_name: 'Renova OS',
        description: 'Logiciel de gestion pour la rénovation énergétique',
        theme_color: '#1B4332',
        background_color: '#F6F8F7',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        id: '/',
        orientation: 'any',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // On ne met en cache que les fichiers statiques (JS/CSS/images).
        // Les appels Supabase (API/data) ne sont jamais mis en cache : on veut
        // toujours des données fraîches, jamais une version périmée des dossiers clients.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
