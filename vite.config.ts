import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages: site suzunn.github.io/dinokart/ altında yayınlanır
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/dinokart/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // kayıt src/main.tsx'te: yeni sürüm gelince sayfa kendiliğinden yenilensin
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Dinokart',
        short_name: 'Dinokart',
        description: 'İngilizce, Almanca ve Fransızca kelime kartları.',
        lang: 'tr',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#DCE6D5',
        background_color: '#DCE6D5',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Yeni sürüm beklemeden devreye girsin: ana ekrandaki uygulama hiç tam kapanmayabiliyor
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
}))
