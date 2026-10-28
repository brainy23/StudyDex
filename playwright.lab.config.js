import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

// Isolated frontend checks: every Supabase response is intercepted with fixtures.
// This server never uses a real project URL, key, account or database.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'lab-redesign.spec.js',
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.STUDYDEX_E2E_BROWSER_CHANNEL
          ? { channel: process.env.STUDYDEX_E2E_BROWSER_CHANNEL }
          : {}),
      },
    },
  ],
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    env: {
      VITE_SUPABASE_URL: 'https://studydex-fixture.invalid',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture-publishable-key',
    },
    reuseExistingServer: false,
  },
})
