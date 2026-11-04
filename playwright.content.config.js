import { defineConfig } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'content.spec.js',
  timeout: 30000,
  workers: 2,
  reporter: 'list',
  outputDir: join(tmpdir(), 'studydex-content-browser-results'),
  use: {
    baseURL: 'http://127.0.0.1:5178',
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    timezoneId: 'Asia/Singapore',
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'pnpm exec vite --config vite.onboarding.fixture.config.js --configLoader runner --host 127.0.0.1 --port 5178 --strictPort',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: false,
  },
})
