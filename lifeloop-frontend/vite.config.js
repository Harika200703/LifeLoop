
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      manifest: {
        name: 'LifeLoop',
        short_name: 'LifeLoop',
        description: 'Your personal memory and reminder assistant',
        theme_color: '#6D5A45',
        background_color: '#F8F5F0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],

        screenshots: [
          {
            src: '/lifeloop-desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'LifeLoop desktop dashboard',
          },
          {
            src: '/lifeloop-mobile.png',
            sizes: '390x844',
            type: 'image/png',
            label: 'LifeLoop mobile dashboard',
          },
        ],
      },
    }),
  ],
})
