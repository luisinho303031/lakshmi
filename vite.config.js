import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api-verdinha': {
        target: 'https://api.verdinha.wtf',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-verdinha/, '')
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
