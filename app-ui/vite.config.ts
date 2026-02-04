import { defineConfig } from 'vite'
// Force reload timestamp: 123456789
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5001,
    strictPort: true,
    allowedHosts: true
  },
  resolve: {
    alias: {
      '@financial-sandbox/sim-core': '../sim-core/src'
    }
  }
})
