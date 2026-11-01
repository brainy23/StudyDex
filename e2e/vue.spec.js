import { test, expect } from '@playwright/test'

test('opens the public StudyDex landing page from the app root', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/landing-info$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Study a little, play a lot!')
})
