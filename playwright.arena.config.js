import { defineConfig } from '@playwright/test'
import labConfig from './playwright.lab.config'

export default defineConfig({
  ...labConfig,
  testMatch: 'arena-transition.spec.js',
  outputDir: './test-results/arena',
  use: { ...labConfig.use, reducedMotion: 'no-preference' },
})
