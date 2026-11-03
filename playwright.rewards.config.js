import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from '@playwright/test'
import base from './playwright.math.config'
export default defineConfig({
  ...base,
  testMatch: 'rewards-flow.spec.js',
  outputDir: join(tmpdir(), 'studydex-rewards-e2e'),
  use: { ...base.use, baseURL: 'http://127.0.0.1:5177' },
  webServer: {
    ...base.webServer,
    command: 'pnpm exec vite --config vite.fixture.config.js --configLoader runner --host 127.0.0.1 --port 5177 --strictPort',
    url: 'http://127.0.0.1:5177',
  },
})
