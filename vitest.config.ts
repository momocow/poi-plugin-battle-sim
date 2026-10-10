import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// poi's `views/*` modules only exist inside poi's renderer. Tests resolve them
// to small stand-ins under test/stubs so the modules that import them load.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: [
      {
        find: /^views\/(.*)$/,
        replacement: resolve(__dirname, 'test/stubs/views/$1.ts'),
      },
    ],
  },
})
