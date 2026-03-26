import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // This allows you to use '@' as a shortcut for your src folder
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // HMR is disabled in certain environments to prevent flickering
    hmr: process.env.DISABLE_HMR !== 'true',
    // Proxy for local development
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
