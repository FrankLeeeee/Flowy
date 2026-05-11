import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'flowy-shared': path.resolve(__dirname, 'shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'shared/tests/**/*.test.ts',
      'backend/tests/**/*.test.ts',
      'runner/tests/**/*.test.ts',
      'frontend/tests/**/*.test.ts',
    ],
  },
});
