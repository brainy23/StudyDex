import { defineConfig } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import base from './playwright.content.config.js'

export default defineConfig({
  ...base,
  testMatch: ['pokemon-transition.spec.js', 'town-entry.spec.js', 'boss-entry.spec.js'],
  outputDir: join(tmpdir(), 'studydex-transition-browser-results'),
})
