/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  // the version shown in Settings: the release number when built by the release workflow
  define: { __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || 'dev') },
  test: { include: ['src/**/*.test.ts'] },
});
