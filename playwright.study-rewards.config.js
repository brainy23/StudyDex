import { defineConfig } from '@playwright/test'
import base from './playwright.content.config.js'
export default defineConfig({
  ...base,
  testMatch: 'study-pokemon-rewards.spec.js',
  workers: 1,
  use: { ...base.use, baseURL: 'http://127.0.0.1:5182' },
  webServer: {
    ...base.webServer,
    command: 'pnpm exec vite --config vite.onboarding.fixture.config.js --configLoader runner --host 127.0.0.1 --port 5182 --strictPort',
    url: 'http://127.0.0.1:5182',
  },
})
