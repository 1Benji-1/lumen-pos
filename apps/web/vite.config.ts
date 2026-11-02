import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
      '/rest': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
      '/functions': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
      },
      '/realtime': {
        target: 'http://127.0.0.1:54321',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
