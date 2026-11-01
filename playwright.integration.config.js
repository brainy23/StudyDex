import { defineConfig } from '@playwright/test'
import labConfig from './playwright.lab.config'

export default defineConfig({
  ...labConfig,
  testMatch: ['vue.spec.js', 'lab-redesign.spec.js', 'arena-transition.spec.js', 'integration-merge.spec.js'],
  outputDir: './test-results/integration',
  use: { ...labConfig.use, reducedMotion: 'no-preference' },
})
