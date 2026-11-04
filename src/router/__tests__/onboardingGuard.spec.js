import { beforeEach, expect, it, vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createAppRouter } from '../index'
const { getSession, getOnboardingStatus } = vi.hoisted(() => ({
  getSession: vi.fn(),
  getOnboardingStatus: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ auth: { getSession } }) }))
vi.mock('../../services/onboardingService', () => ({ getOnboardingStatus }))
beforeEach(() => {
  getSession.mockResolvedValue({ data: { session: { access_token: 'fixture' } }, error: null })
  getOnboardingStatus.mockResolvedValue({ onboarding_complete: false })
})
it.each(['/home', '/trainer', '/study-decks', '/tutorial'])(
  'blocks direct %s entry before setup completion',
  async (path) => {
    const router = createAppRouter(createMemoryHistory())
    await router.push(path)
    expect(router.currentRoute.value.name).toBe('landing')
  },
)
it.each(['/landing', '/characterdesign', '/starter', '/account'])(
  'leaves %s available for setup/recovery',
  async (path) => {
    const router = createAppRouter(createMemoryHistory())
    await router.push(path)
    expect(router.currentRoute.value.path).toBe(path)
  },
)
it('allows completed accounts into Town', async () => {
  getOnboardingStatus.mockResolvedValue({ onboarding_complete: true })
  const router = createAppRouter(createMemoryHistory())
  await router.push('/home')
  expect(router.currentRoute.value.name).toBe('home')
})
it('uses Landing retry when the backend cannot verify completion', async () => {
  getOnboardingStatus.mockRejectedValueOnce(new Error('Fixture network error'))
  const router = createAppRouter(createMemoryHistory())
  await router.push('/home')
  expect(router.currentRoute.value.name).toBe('landing')
})
it('requires login for the avatar room even with the old development bypass flag', async () => {
  vi.stubEnv('VITE_SKIP_AUTH', 'true')
  getSession.mockResolvedValue({ data: { session: null }, error: null })
  try {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/characterdesign')
    expect(router.currentRoute.value.name).toBe('login')
  } finally {
    vi.unstubAllEnvs()
  }
})
