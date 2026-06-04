import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Pure unit tests run in Node. Workers/D1-backed integration tests can opt
    // into a Miniflare/workers pool separately when added.
    environment: 'node',
    // Test file patterns
    include: ['tests/**/*.test.ts'],
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts', 'utils/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/env.d.ts'],
    },
    // Globals for cleaner test syntax
    globals: true,
  },
})
