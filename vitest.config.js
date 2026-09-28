import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests in Node environment (no DOM needed)
    environment: 'node',
    // Test file patterns
    include: ['tests/**/*.test.{js,ts}'],
    // Reporter
    reporter: 'verbose',
    setupFiles: ['./tests/setup-redis-mock.js'],
    // Coverage (optional, run with: npx vitest run --coverage)
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/services/skills.db', 'src/services/memory.db']
    }
  }
});
