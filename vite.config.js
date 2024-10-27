import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: './internal/server/frontend-dist', // 修改输出目录
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})