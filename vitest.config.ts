import { defineConfig } from 'vitest/config';

export default defineConfig({
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
