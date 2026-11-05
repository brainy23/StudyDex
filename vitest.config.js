import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.js'

// Unit tests import the server-side deletion handler directly. The development
// HTTP file restrictions belong to Vite's public server, not the test runner.
const unitViteConfig = { ...viteConfig }
delete unitViteConfig.server

export default mergeConfig(
  unitViteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
