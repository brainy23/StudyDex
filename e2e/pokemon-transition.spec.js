import { test, expect } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

async function openPreview(page) {
  await page.goto('/e2e/fixtures/pokemon-transition.html')
  await expect(page.getByRole('heading', { name: 'Transition preview' })).toBeVisible()
  await page.evaluate(() => {
    window.transitionFixture.hold = true
  })
}
async function finishLoad(page) {
  await expect
    .poll(() => page.evaluate(() => typeof window.transitionFixture.resolve))
    .toBe('function')
  await page.evaluate(() => window.transitionFixture.resolve())
}

test('waits for content and restores scrolling/focus after revealing it', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await openPreview(page)
  await page.getByRole('button', { name: 'Poké Arena', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('data-phase', 'loading')
  await expect(dialog.getByRole('heading')).toHaveText('A Challenge Awaits!')
  await expect(page.getByRole('button', { name: 'Skip animation' })).toBeFocused()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await finishLoad(page)
  await expect(dialog).toBeHidden()
  await expect(page.locator('#outcome')).toHaveText('Poké Arena ready')
  await expect(page.getByRole('heading', { name: 'Transition preview' })).toBeFocused()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
  expect(errors).toEqual([])
})

for (const [method, skip] of [
  ['button', (page) => page.getByRole('button', { name: 'Skip animation' }).click()],
  ['Escape', (page) => page.keyboard.press('Escape')],
]) {
  test(`${method} skips motion while preserving the pending load`, async ({ page }) => {
    await openPreview(page)
    await page.getByRole('button', { name: 'Poké Lab', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await skip(page)
    await expect(page.getByRole('button', { name: 'Loading…', exact: true })).toBeDisabled()
    await expect(page.getByRole('dialog')).toBeVisible()
    await finishLoad(page)
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.locator('#outcome')).toHaveText('Poké Lab ready')
  })
}

test('reduced motion uses a static, visible loader', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openPreview(page)
  await page.getByRole('button', { name: 'Trainer House', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toHaveClass(/is-static/)
  await expect(dialog.getByRole('heading')).toBeVisible()
  await expect
    .poll(() =>
      dialog.locator('.transition-ball').evaluate((el) => getComputedStyle(el).animationName),
    )
    .toBe('none')
  await finishLoad(page)
  await expect(dialog).toBeHidden()
  await expect(page.locator('#outcome')).toHaveText('Trainer House ready')
})

test('a failed task releases the modal and returns focus to its trigger', async ({ page }) => {
  await openPreview(page)
  const trigger = page.getByRole('button', { name: 'Poké Lab', exact: true })
  await trigger.click()
  await expect
    .poll(() => page.evaluate(() => typeof window.transitionFixture.reject))
    .toBe('function')
  await page.evaluate(() => window.transitionFixture.reject(new Error('Preview load failed')))
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('#outcome')).toHaveText('Preview load failed')
  await expect(trigger).toBeFocused()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
})

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
]) {
  test(`fits ${viewport.width}×${viewport.height} without overlapping controls`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await openPreview(page)
    await page.getByRole('button', { name: 'Trainer House', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toHaveAttribute('data-phase', 'loading')
    const card = await dialog.locator('.transition-card').boundingBox()
    const controls = await dialog.locator('.transition-controls').boundingBox()
    expect(card.x).toBeGreaterThanOrEqual(0)
    expect(card.x + card.width).toBeLessThanOrEqual(viewport.width)
    expect(card.y).toBeGreaterThanOrEqual(0)
    expect(card.y + card.height).toBeLessThanOrEqual(controls.y)
    expect(controls.y + controls.height).toBeLessThanOrEqual(viewport.height)
    await page.screenshot({
      path: join(tmpdir(), `studydex-transition-${viewport.width}.png`),
      animations: 'disabled',
    })
    await finishLoad(page)
    await expect(dialog).toBeHidden()
  })
}
