import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/ycsalescrm/',
  plugins: [react()],
  server: {
    // อนุญาตให้เข้าถึงจาก IP ภายนอกในเครือข่ายเดียวกันได้
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/ycsalescrm/api': {
        target: 'http://localhost:3015',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ycsalescrm\/api/, '/api')
      },
      '/ycsalescrm/images': {
        target: 'http://localhost:3015',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ycsalescrm/, '')
      }
    }
  }
})