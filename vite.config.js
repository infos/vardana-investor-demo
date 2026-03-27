// Vite configuration for Vardana investor demo (CHF post-discharge)
// Deployed on Vercel at vardana.ai
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    open: false,
    // Proxy API calls to local dev server during development
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      }
    }
  }
})
