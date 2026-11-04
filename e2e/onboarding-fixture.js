import { Buffer } from 'node:buffer'

// Everything here is synthetic. Requests never reach the shared Supabase project.
export async function mockOnboarding(
  page,
  {
    authenticated = true,
    avatarConfirmed = false,
    starterClaimed = false,
    confirmationRequired = false,
    seedAuthOnce = false,
  } = {},
) {
  const levels = Array.from({ length: 6 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    level_number: index + 1,
    name: `Primary ${index + 1}`,
  }))
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'fixture@example.invalid',
    app_metadata: {},
    user_metadata: {},
  }
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const exp = Math.floor(Date.now() / 1000) + 3600
  const session = {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', exp })}.fixture`,
    refresh_token: 'fixture-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    user,
  }
  const state = {
    authenticated,
    avatarConfirmed,
    starterClaimed,
    avatarChoice: avatarConfirmed ? 'male-1' : 'prefer_not_to_say',
    schoolLevel: levels[2],
    displayName: 'Fixture Trainer',
    avatarCalls: [],
    claimCalls: [],
    signupCalls: [],
    failAvatar: false,
    dropClaim: false,
    starter: starterClaimed ? 4 : null,
  }
  const errors = []
  const liveRequests = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(
    ({ session, authenticated, seedAuthOnce }) => {
      if (
        authenticated &&
        (!seedAuthOnce || !sessionStorage.getItem('studydex-fixture-auth-seeded'))
      ) {
        localStorage.setItem('sb-studydex-fixture-auth-token', JSON.stringify(session))
        if (seedAuthOnce) sessionStorage.setItem('studydex-fixture-auth-seeded', 'true')
      }
    },
    { session, authenticated, seedAuthOnce },
  )
  await page.route('https://*.supabase.co/**', (route) => {
    liveRequests.push(route.request().url())
    return route.abort()
  })
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="24" fill="orange"/></svg>'
  await page.route('https://raw.githubusercontent.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: svg,
      headers: { 'access-control-allow-origin': '*' },
    }),
  )
  await page.route('https://fixture.invalid/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: svg,
      headers: { 'access-control-allow-origin': '*' },
    }),
  )
  await page.route('https://pokeapi.co/**', (route) => {
    const url = route.request().url()
    if (url.includes('evolution-chain'))
      return route.fulfill({
        json: {
          chain: {
            species: { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
            evolves_to: [],
          },
        },
      })
    if (url.includes('pokemon-species'))
      return route.fulfill({
        json: {
          evolution_chain: { url: 'https://pokeapi.co/api/v2/evolution-chain/1/' },
          evolves_from_species: null,
        },
      })
    const value = url.split('/').filter(Boolean).at(-1)
    const id =
      Number(value) ||
      { pikachu: 25, charmander: 4, bulbasaur: 1, squirtle: 7, mewtwo: 150 }[value] ||
      1
    const sprite = 'https://fixture.invalid/sprite.svg'
    return route.fulfill({
      json: {
        id,
        name:
          { 4: 'charmander', 1: 'bulbasaur', 7: 'squirtle', 25: 'pikachu', 150: 'mewtwo' }[id] ||
          'fixture',
        types: [{ type: { name: 'grass' } }],
        sprites: {
          front_default: sprite,
          back_default: sprite,
          other: { 'official-artwork': { front_default: sprite } },
          versions: {
            'generation-v': {
              'black-white': {
                front_default: sprite,
                back_default: sprite,
                animated: { front_default: sprite, back_default: sprite },
              },
            },
          },
        },
      },
    })
  })
  await page.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: { current: { temperature_2m: 29, weather_code: 0, cloud_cover: 0, is_day: 1 } },
    }),
  )
  await page.route('https://api-open.data.gov.sg/**', (route) =>
    route.fulfill({ json: { data: { stations: [], readings: [] } } }),
  )
  await page.addLocatorHandler(
    page.getByRole('dialog', { name: 'Choose weather location' }),
    async (dialog) => {
      await dialog.getByRole('button', { name: 'Not Now', exact: true }).click()
    },
  )
  const status = () => {
    const step = !state.schoolLevel
      ? 'account'
      : !state.avatarConfirmed
        ? 'avatar'
        : !state.starterClaimed
          ? 'starter'
          : 'town'
    return {
      user_id: user.id,
      avatar_choice: state.avatarChoice,
      school_level_id: state.schoolLevel?.id || null,
      avatar_confirmed: state.avatarConfirmed,
      starter_claimed: state.starterClaimed,
      onboarding_complete: step === 'town',
      next_step: step,
    }
  }
  const profile = () => ({
    id: user.id,
    display_name: state.displayName,
    avatar_choice: state.avatarChoice,
    school_level_id: state.schoolLevel?.id || null,
    school_level: state.schoolLevel,
  })
  await page.route('https://studydex-fixture.invalid/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (url.pathname.endsWith('/signup')) {
      const body = request.postDataJSON()
      state.signupCalls.push(body)
      state.displayName = body.data.display_name
      state.schoolLevel = levels[body.data.school_level_number - 1]
      if (confirmationRequired) return route.fulfill({ headers, json: { ...user, identities: [] } })
      state.authenticated = true
      return route.fulfill({ headers, json: session })
    }
    if (url.pathname.endsWith('/user')) return route.fulfill({ headers, json: user })
    if (url.pathname.endsWith('/token')) {
      state.authenticated = true
      return route.fulfill({ headers, json: session })
    }
    if (url.pathname.includes('/rpc/')) {
      const name = url.pathname.split('/').at(-1)
      if (name === 'get_onboarding_status') return route.fulfill({ headers, json: status() })
      if (name === 'save_onboarding_avatar') {
        const args = request.postDataJSON()
        state.avatarCalls.push(args)
        if (state.failAvatar) {
          state.failAvatar = false
          return route.fulfill({
            status: 403,
            headers,
            json: { message: 'Synthetic save failure' },
          })
        }
        state.avatarChoice = args.p_avatar_choice
        state.avatarConfirmed = true
        return route.fulfill({ headers, json: status() })
      }
      if (name === 'claim_starter') {
        const args = request.postDataJSON()
        state.claimCalls.push(args)
        const already = state.starterClaimed
        if (!already) {
          state.starter = args.p_pokeapi_id
          state.starterClaimed = true
        }
        if (state.dropClaim) {
          state.dropClaim = false
          return route.abort()
        }
        return route.fulfill({
          headers,
          json: { user_id: user.id, claimed: true, already_claimed: already },
        })
      }
    }
    const table = url.pathname.split('/').at(-1)
    if (table === 'profiles') {
      if (request.method() === 'PATCH') {
        const body = request.postDataJSON()
        state.avatarChoice = body.avatar_choice || state.avatarChoice
        state.displayName = body.display_name || state.displayName
        state.schoolLevel =
          levels.find((level) => level.id === body.school_level_id) || state.schoolLevel
      }
      return route.fulfill({ headers, json: profile() })
    }
    if (table === 'levels') return route.fulfill({ headers, json: levels })
    return route.fulfill({ headers, json: [] })
  })
  return { state, errors, liveRequests, session }
}
