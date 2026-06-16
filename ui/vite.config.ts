import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const appBase = process.env.VITE_APP_BASE ?? '/'
const apiTarget = process.env.API_TARGET ?? 'http://localhost:8080'
const arroyoTarget = process.env.ARROYO_TARGET ?? 'ws://localhost:8765'

// https://vite.dev/config/
export default defineConfig({
  base: appBase,
  plugins: [react()],
  server: {
    proxy: {
      '/api/v1': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1/, ''),
      },
      '/ws': {
        target: arroyoTarget,
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/ws/, ''),
      },
    },
  },
})
