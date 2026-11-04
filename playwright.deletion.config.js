import { defineConfig } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import base from './playwright.content.config.js'

export default defineConfig({
  ...base,
  testMatch: 'account-deletion.spec.js',
  outputDir: join(tmpdir(), 'studydex-account-deletion-browser-results'),
})
