import { test, expect } from '@playwright/test'
import { mockLab } from './fixtures/lab'

test('public landing has valid illustrations and reaches signup on mobile', async ({ page }) => {
  const { errors } = await mockLab(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const images = page.locator('img.screen')
  await expect(images).toHaveCount(7)
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded()
    await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('link', { name: 'Sign up now' }).click()
  await expect(page).toHaveURL(/\/signup$/)
  expect(errors).toEqual([])
})

test('avatar preview retains all ten styles without writing a profile or local choice', async ({ page }) => {
  const { requests, errors } = await mockLab(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/landing')
  await page.getByRole('link', { name: 'Start', exact: true }).click()
  await expect(page).toHaveURL(/\/characterdesign$/)
  await expect(page.getByRole('note')).toContainText('not saved')
  await expect(page.locator('.pick')).toHaveCount(10)
  await page.getByRole('button', { name: 'Preview male-4', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Preview male-4', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => localStorage.getItem('studydex-trainer-profile'))).toBeNull()
  expect(requests.filter(request => request.method === 'PATCH')).toEqual([])
  await page.screenshot({ path: '/private/tmp/studydex-avatar-preview.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  const panel = page.locator('.choose-panel')
  expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await page.getByRole('button', { name: 'Continue to tutorial' }).click()
  await expect(page).toHaveURL(/\/tutorial$/)
  await expect(page.getByRole('dialog', { name: 'StudyDex Town Tutorial' })).toBeVisible()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page).toHaveURL(/\/home$/)
  expect(errors).toEqual([])
})

test('admin pages are labelled local demos and make no student or content writes', async ({ page }) => {
  const { requests, errors } = await mockLab(page)
  for (const path of ['/admin-home', '/admin-users', '/admin-education', '/admin-adddeck', '/admin-education/1', '/admin-quiz', '/admin-addquiz']) {
    await page.goto(path)
    await expect(page.getByRole('note')).toContainText('Local demo only')
    await expect(page.locator('main')).toBeVisible()
  }
  await page.goto('/admin-quiz')
  await page.getByRole('button', { name: 'View', exact: true }).first().click()
  await expect(page).toHaveURL(/\/admin-quiz\//)
  await expect(page.getByRole('note')).toContainText('Local demo only')
  expect(requests.filter(request => !['GET', 'OPTIONS'].includes(request.method))).toEqual([])
  expect(errors).toEqual([])
})
