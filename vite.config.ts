/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  test: { include: ['src/**/*.test.ts'] },
});
