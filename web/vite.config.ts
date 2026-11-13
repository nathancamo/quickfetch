import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: resolve(__dirname),
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: resolve(__dirname, '../dist/web'),
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'src/test/setup.ts')],
    include: [resolve(__dirname, '../tests/**/*.test.ts'), resolve(__dirname, 'src/**/*.test.tsx')],
  },
});
