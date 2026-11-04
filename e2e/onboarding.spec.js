import { test, expect } from '@playwright/test'
import { mockOnboarding } from './onboarding-fixture'

async function finishTutorial(page) {
  await expect(page).toHaveURL(/\/tutorial$/)
  await expect(page.locator('.tutorial')).toBeVisible()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page).toHaveURL(/\/home$/)
}

test('signup uses four steps, saves a style/starter, then subsequent entry shows Start only', async ({
  page,
}) => {
  const { state, errors, liveRequests } = await mockOnboarding(page, { authenticated: false })
  await page.goto('/signup')
  await page.locator('#email-input').fill('fixture@example.invalid')
  await page.locator('button[type="submit"]').click()
  await page.locator('#username-input').fill('New Trainer')
  await page.locator('button[type="submit"]').click()
  await page.locator('#level-selector').selectOption('p1')
  await page.locator('button[type="submit"]').click()
  await expect(page.getByText('Step 4 of 4')).toBeVisible()
  await expect(page.locator('input[name="avatar"]')).toHaveCount(0)
  await page.locator('#password-input').fill('Password123')
  await page.locator('#confirm-password-input').fill('Password123')
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/landing$/)
  expect(state.signupCalls[0].data).toEqual({ display_name: 'New Trainer', school_level_number: 1 })
  await page.getByRole('link', { name: 'Start your journey', exact: true }).click()
  await expect(page.locator('.pick')).toHaveCount(10)
  await page.getByRole('button', { name: 'Explorer boy', exact: true }).press('Enter')
  await page.locator('.start-btn').click()
  await expect(page).toHaveURL(/\/starter$/)
  await page.getByRole('button', { name: 'bulbasaur', exact: true }).click()
  await page.getByRole('button', { name: 'I Choose You!', exact: true }).click()
  await finishTutorial(page)
  await expect(page.locator('.trainer-avatar')).toHaveAttribute('src', '/avatars/boy_1.png')
  await page.goto('/landing')
  await page.reload()
  await expect(page.getByRole('link', { name: 'Start', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Start your journey', exact: true })).toHaveCount(0)
  await expect(page.locator('.profile-avatar')).toHaveAttribute('src', '/avatars/boy_1.png')
  expect(state.avatarCalls).toEqual([{ p_avatar_choice: 'male-1' }])
  expect(state.claimCalls).toEqual([{ p_pokeapi_id: 1 }])
  expect(state.starter).toBe(1)
  expect(errors).toEqual([])
  expect(liveRequests).toEqual([])
})

test('legacy starter is preserved while the mobile room saves a new style', async ({ page }) => {
  const { state, errors } = await mockOnboarding(page, { starterClaimed: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/landing')
  await page.getByRole('link', { name: 'Start your journey' }).click()
  await page.getByRole('button', { name: 'Artist girl', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Artist girl', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(
    await page.locator('.choose-panel').evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true)
  await page.screenshot({ path: '/private/tmp/studydex-onboarding-avatar-mobile.png' })
  await page.locator('.start-btn').click()
  await finishTutorial(page)
  expect(state.starter).toBe(4)
  expect(state.claimCalls).toEqual([])
  await page.goto('/starter')
  await expect(page).toHaveURL(/\/landing$/)
  await expect(page.getByRole('link', { name: 'Start', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('failed avatar save retains the chosen style and resumes after a successful retry', async ({
  page,
}) => {
  const { state, errors } = await mockOnboarding(page)
  state.failAvatar = true
  await page.goto('/characterdesign')
  await page.getByRole('button', { name: 'Scholar boy', exact: true }).click()
  await page.locator('.start-btn').click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/characterdesign$/)
  await expect(page.getByRole('button', { name: 'Scholar boy', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(await page.evaluate(() => localStorage.getItem('studydex-trainer-profile'))).toBeNull()
  await page.locator('.start-btn').click()
  await expect(page).toHaveURL(/\/starter$/)
  await page.reload()
  await expect(page.getByRole('button', { name: 'charmander', exact: true })).toBeVisible()
  await page.goto('/landing')
  await expect(page.getByRole('link', { name: 'Start your journey' })).toHaveAttribute(
    'href',
    '/starter',
  )
  expect(state.avatarCalls).toEqual([{ p_avatar_choice: 'male-3' }, { p_avatar_choice: 'male-3' }])
  expect(errors).toEqual([])
})

test('a lost starter response is recovered from persisted status without a second claim', async ({
  page,
}) => {
  const { state, errors } = await mockOnboarding(page, { avatarConfirmed: true })
  state.dropClaim = true
  await page.goto('/starter')
  await page.getByRole('button', { name: 'squirtle', exact: true }).click()
  await page.getByRole('button', { name: 'I Choose You!', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Check again', exact: true }).click()
  await finishTutorial(page)
  await page.goto('/starter')
  await expect(page).toHaveURL(/\/landing$/)
  expect(state.claimCalls).toEqual([{ p_pokeapi_id: 7 }])
  expect(state.starter).toBe(7)
  expect(errors).toEqual([])
})

test('direct Town entry cannot bypass onboarding and visitors must log in for the room', async ({
  page,
  browser,
}) => {
  await mockOnboarding(page)
  await page.goto('/home')
  await expect(page).toHaveURL(/\/landing$/)
  await expect(page.getByRole('link', { name: 'Start your journey' })).toBeVisible()
  const context = await browser.newContext()
  const visitor = await context.newPage()
  await mockOnboarding(visitor, { authenticated: false })
  await visitor.goto('http://127.0.0.1:5178/characterdesign')
  await expect(visitor).toHaveURL(/\/login$/)
  await context.close()
})

test('confirmed-email signup returns to the saved first-time journey', async ({ page }) => {
  const { session, errors } = await mockOnboarding(page, {
    authenticated: false,
    confirmationRequired: true,
  })
  await page.goto('/signup')
  await page.locator('#email-input').fill('fixture@example.invalid')
  await page.locator('#nextButton').click()
  await page.locator('#username-input').fill('Confirmed Trainer')
  await page.locator('#nextButton').click()
  await page.locator('#level-selector').selectOption('p2')
  await page.locator('#nextButton').click()
  await page.locator('#password-input').fill('Password123')
  await page.locator('#confirm-password-input').fill('Password123')
  await page.locator('#nextButton').click()
  await expect(page.getByRole('status').filter({ hasText: 'Check your email' })).toBeVisible()
  const callback = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: '3600',
    token_type: 'bearer',
    type: 'signup',
  })
  await page.goto(`/register#${callback}`)
  await expect(page).toHaveURL(/\/landing$/)
  await expect(page.getByRole('link', { name: 'Start your journey', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Start your journey', exact: true }).click()
  await expect(page).toHaveURL(/\/characterdesign$/)
  expect(errors).toEqual([])
})

test('a subsequent login displays Start only with the saved new style', async ({ page }) => {
  const { state, errors } = await mockOnboarding(page, {
    authenticated: false,
    avatarConfirmed: true,
    starterClaimed: true,
  })
  await page.goto('/login')
  await page.locator('#username-input').fill('fixture@example.invalid')
  await page.locator('#password-input').fill('Password123')
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/landing$/)
  await expect(page.getByRole('link', { name: 'Start', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Start your journey', exact: true })).toHaveCount(0)
  await expect(page.locator('.profile-avatar')).toHaveAttribute('src', '/avatars/boy_1.png')
  await page.getByRole('link', { name: 'Start', exact: true }).click()
  await expect(page).toHaveURL(/\/home$/)
  expect(state.avatarCalls).toEqual([])
  expect(state.claimCalls).toEqual([])
  expect(errors).toEqual([])
})
