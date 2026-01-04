import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing';
import { resolve } from 'path';

export default defineConfig({
  plugins: [WxtVitest()],
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    mockReset: true,
  },
});
