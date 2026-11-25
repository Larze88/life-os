import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineProject } from 'vitest/config';

export default defineProject({
  define: { __APP_VERSION__: JSON.stringify('test') },
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    name: 'frontend',
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
