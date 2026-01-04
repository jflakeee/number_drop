import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Use /number_drop/ for GitHub Pages, / for local dev
const base = process.env.NODE_ENV === 'production' ? '/number_drop/' : '/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@game': path.resolve(__dirname, './src/game'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@store': path.resolve(__dirname, './src/store'),
      '@services': path.resolve(__dirname, './src/services'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
