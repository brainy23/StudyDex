import { defineConfig } from '@playwright/test'
import base from './playwright.rewards.config'
export default defineConfig({ ...base, testMatch: 'branch-merge.spec.js' })
