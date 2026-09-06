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
