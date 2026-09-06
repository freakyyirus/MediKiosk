import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev proxy target. Override with VITE_DEV_PROXY_TARGET when the backend runs
// elsewhere (e.g. a Render/Railway URL), which fixes the classic
// "ECONNREFUSED proxy errors to /api/..." when localhost:8000 is down.
const DEV_PROXY_TARGET = (process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:8000').replace(/\/+$/, '')

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Split heavy third-party libraries into long-cacheable vendor chunks so a
    // single change doesn't invalidate the 800 kB entry and cold loads stay fast.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|zustand)[\\/]/, priority: 30 },
            { name: 'motion', test: /node_modules[\\/](framer-motion|motion|motion-dom)[\\/]/, priority: 30 },
            { name: 'animation', test: /node_modules[\\/](gsap|lenis)[\\/]/, priority: 30 },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/, priority: 30 },
            { name: 'http', test: /node_modules[\\/](axios|follow-redirects|proxy-from-env)[\\/]/, priority: 30 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: DEV_PROXY_TARGET,
        changeOrigin: true,
      },
      '/ws': {
        target: DEV_PROXY_TARGET.replace(/^http/, 'ws'),
        ws: true,
      },
    },
  },
})
