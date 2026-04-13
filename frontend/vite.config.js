import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    middlewareMode: false,
    proxy: {
      // Forward all /app requests to Django backend
      '/app': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
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
