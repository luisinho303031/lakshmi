import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api-tenrai': {
        target: 'https://api.verdinha.wtf',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-tenrai/, '')
      },
      '/cdn-tenrai': {
        target: 'https://api.verdinha.wtf/cdn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cdn-tenrai/, '')
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
