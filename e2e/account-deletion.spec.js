import { test, expect } from '@playwright/test'
import { mockOnboarding } from './onboarding-fixture'

async function setup(page) {
  const fixture = await mockOnboarding(page, {
    avatarConfirmed: true,
    starterClaimed: true,
    seedAuthOnce: true,
  })
  const calls = []
  let fail = false
  await page.route(
    'https://studydex-fixture.invalid/functions/v1/delete-account',
    async (route) => {
      if (route.request().method() === 'OPTIONS')
        return route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': 'POST, OPTIONS',
          },
        })
      calls.push({
        method: route.request().method(),
        body: route.request().postDataJSON(),
        authorization: route.request().headers().authorization,
      })
      return route.fulfill({
        status: fail ? 409 : 200,
        headers: { 'access-control-allow-origin': '*' },
        json: fail
          ? { code: 'deletion_not_completed' }
          : { code: 'account_deleted', deleted: true },
      })
    },
  )
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible()
  return {
    ...fixture,
    calls,
    fail(value) {
      fail = value
    },
  }
}
async function confirm(dialog) {
  await dialog.getByLabel('Confirm your current password').fill('synthetic-password')
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE')
}

test('opening/cancelling deletion does not delete anything or retain a password', async ({
  page,
}) => {
  const fixture = await setup(page)
  await page.getByRole('button', { name: 'Delete my account', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Confirm your current password')).toBeFocused()
  await expect(dialog.getByRole('button', { name: 'Permanently delete my account' })).toBeDisabled()
  await confirm(dialog)
  await dialog.getByRole('button', { name: 'Keep my account' }).click()
  await expect(dialog).toBeHidden()
  await page.getByRole('button', { name: 'Delete my account', exact: true }).click()
  await expect(dialog.getByLabel('Confirm your current password')).toHaveValue('')
  expect(fixture.calls).toEqual([])
  expect(fixture.liveRequests).toEqual([])
  expect(fixture.errors).toEqual([])
})

test('confirmed deletion uses a fresh authenticated request, clears only own progress and returns to public landing', async ({
  page,
}) => {
  const fixture = await setup(page)
  const ownKey = 'studydex:focus:v1:11111111-1111-4111-8111-111111111111'
  await page.evaluate((key) => {
    localStorage.setItem(key, 'own')
    localStorage.setItem('studydex:focus:v1:other-student', 'keep')
  }, ownKey)
  await page.getByRole('button', { name: 'Delete my account', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await confirm(dialog)
  await dialog.getByRole('button', { name: 'Permanently delete my account' }).click()
  await expect(page).toHaveURL(/\/landing-info$/)
  expect(fixture.calls).toHaveLength(1)
  expect(fixture.calls[0].body).toEqual({ confirmation: 'DELETE' })
  expect(fixture.calls[0].method).toBe('POST')
  expect(fixture.calls[0].authorization).toMatch(/^Bearer /)
  expect(await page.evaluate((key) => localStorage.getItem(key), ownKey)).toBe(null)
  expect(await page.evaluate(() => localStorage.getItem('studydex:focus:v1:other-student'))).toBe(
    'keep',
  )
  expect(await page.evaluate(() => localStorage.getItem('sb-studydex-fixture-auth-token'))).toBe(
    null,
  )
  expect(fixture.liveRequests).toEqual([])
  expect(fixture.errors).toEqual([])
})

test('blocked/uncertain deletion preserves progress, requires a fresh password and permits retry', async ({
  page,
}) => {
  const fixture = await setup(page)
  fixture.fail(true)
  const ownKey = 'studydex:focus:v1:11111111-1111-4111-8111-111111111111'
  await page.evaluate((key) => localStorage.setItem(key, 'own'), ownKey)
  await page.getByRole('button', { name: 'Delete my account', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await confirm(dialog)
  await dialog.getByRole('button', { name: 'Permanently delete my account' }).click()
  await expect(dialog.getByRole('alert')).toContainText('couldn’t confirm deletion')
  await expect(dialog.getByLabel('Confirm your current password')).toHaveValue('')
  await expect(dialog.getByRole('button', { name: 'Permanently delete my account' })).toBeDisabled()
  expect(await page.evaluate((key) => localStorage.getItem(key), ownKey)).toBe('own')
  fixture.fail(false)
  await confirm(dialog)
  await dialog.getByRole('button', { name: 'Permanently delete my account' }).click()
  await expect(page).toHaveURL(/\/landing-info$/)
  expect(fixture.calls).toHaveLength(2)
  expect(fixture.liveRequests).toEqual([])
  expect(fixture.errors).toEqual([])
})
