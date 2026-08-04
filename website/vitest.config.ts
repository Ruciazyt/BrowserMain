import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Skip dnd-kit integration tests under jsdom — we test the underlying
    // reducer directly. Component tests exercise the keyboard reorder and
    // callback contract without driving a real drag.
    testTimeout: 10000,
  },
});
