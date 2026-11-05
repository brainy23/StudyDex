import { defineConfig } from '@playwright/test'
import base from './playwright.content.config.js'
export default defineConfig({ ...base, testMatch:'connected-learning.spec.js', workers:1 })
