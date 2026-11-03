import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from '@playwright/test'
import base from './playwright.lab.config'

export default defineConfig({
  ...base,
  testMatch: 'math-selection.spec.js',
  outputDir: join(tmpdir(), 'studydex-math-e2e'),
  use: { ...base.use, baseURL: 'http://127.0.0.1:5176' },
  webServer: {
    ...base.webServer,
    command:
      'pnpm exec vite --config vite.fixture.config.js --configLoader runner --host 127.0.0.1 --port 5176 --strictPort',
    url: 'http://127.0.0.1:5176',
  },
})
