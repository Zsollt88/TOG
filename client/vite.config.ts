import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Every server route lives under /api, so this one rule forwards all of them in dev.
const apiTarget = 'http://localhost:5000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
