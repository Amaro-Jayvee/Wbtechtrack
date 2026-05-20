import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  define: {
    'import.meta.env.VITE_BACKEND_URL': JSON.stringify('https://techtrack-backend-pynh.onrender.com')
  },
  plugins: [react()],
  server: {
    port: 5174,
    middlewareMode: false,
  },
  preview: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'frontend-services-production-ab60.up.railway.app',
      '*.railway.app',
    ],
  },
  build: {
    // Increase chunk size warning limit temporarily
    chunkSizeWarningLimit: 1000,
    // Enable code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    },
    // Faster builds during dev
    sourcemap: false,
    minify: 'terser',
  },
  // Optimize deps for faster startup
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})
