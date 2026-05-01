import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/__tests__/**',
        'src/**/*.d.ts',
        'src/components/**',
        'src/app/**/page.tsx',
        'src/app/**/layout.tsx',
        'src/app/**/error.tsx',
        'src/app/**/not-found.tsx',
      ],
      thresholds: {
        statements: 7,
        branches: 8,
        functions: 12,
        lines: 7,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
