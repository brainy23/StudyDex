import { flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  createArenaTransition,
  ARENA_ENTRANCE_MS,
  ARENA_ANTICIPATION_MS,
  ARENA_BATTLE_MS,
  ARENA_REVEAL_MS,
  ARENA_PRESENTATION_TIMEOUT_MS,
  ARENA_NAVIGATION_TIMEOUT_MS,
} from '../useArenaTransition'
import { arenaLocation } from '../../utils/studyNavigation'

let transition
let router
const location = arenaLocation({ id: 'water-topic', subject_id: 'science' })
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  transition = createArenaTransition()
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/study-decks', name: 'study-decks', component: {} },
      { path: '/quiz', name: 'quiz', component: {} },
      { path: '/home', name: 'home', component: {} },
      { path: '/login', name: 'login', component: {} },
    ],
  })
  await router.push('/study-decks?subject=science&topic_id=water-topic')
  await router.isReady()
})
afterEach(() => {
  transition.cancel()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('plays anticipation, battle and reveal for two seconds after painting, preserving context and Back', async () => {
  const onStart = vi.fn()
  const push = vi.spyOn(router, 'push')
  expect(transition.start({ router, location, onStart })).toBe(true)
  expect(onStart).toHaveBeenCalledTimes(1)
  expect(transition.start({ router, location, onStart })).toBe(false)
  expect(transition.presented(transition.state.sequence)).toBe(true)
  expect(transition.presented(transition.state.sequence)).toBe(false)
  await vi.advanceTimersByTimeAsync(ARENA_ANTICIPATION_MS - 1)
  expect(transition.state.phase).toBe('anticipation')
  await vi.advanceTimersByTimeAsync(1)
  expect(transition.state.phase).toBe('battle')
  await vi.advanceTimersByTimeAsync(ARENA_BATTLE_MS - 1)
  expect(router.currentRoute.value.name).toBe('study-decks')
  await vi.advanceTimersByTimeAsync(1)
  expect(push).toHaveBeenCalledTimes(1)
  expect(router.currentRoute.value.query).toEqual({ subject: 'science', topic_id: 'water-topic' })
  expect(transition.state.active).toBe(true)
  expect(transition.state.phase).toBe('reveal')
  await vi.advanceTimersByTimeAsync(ARENA_REVEAL_MS - 1)
  expect(transition.state.active).toBe(true)
  await vi.advanceTimersByTimeAsync(1)
  expect(transition.state.active).toBe(false)
  expect(transition.state.phase).toBe('idle')
  router.back()
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('study-decks')
  expect(transition.state.active).toBe(false)
})

it('does not run playback before the overlay paints and releases a missing host safely', async () => {
  const push = vi.spyOn(router, 'push')
  transition.start({ router, location })
  const staleSequence = transition.state.sequence
  await vi.advanceTimersByTimeAsync(ARENA_PRESENTATION_TIMEOUT_MS - 1)
  expect(push).not.toHaveBeenCalled()
  expect(transition.state.phase).toBe('anticipation')
  await vi.advanceTimersByTimeAsync(1)
  expect(transition.state.active).toBe(false)
  expect(transition.state.error).toContain('could not be displayed')
  transition.start({ router, location })
  expect(transition.presented(staleSequence)).toBe(false)
  expect(transition.presented(transition.state.sequence)).toBe(true)
})

it('keeps the overlay covering a delayed route and reveals only after navigation succeeds', async () => {
  let releaseGuard
  router.beforeEach(
    () =>
      new Promise((resolve) => {
        releaseGuard = resolve
      }),
  )
  transition.start({ router, location })
  transition.presented(transition.state.sequence)
  await vi.advanceTimersByTimeAsync(ARENA_ANTICIPATION_MS + ARENA_BATTLE_MS + 1000)
  expect(transition.state.active).toBe(true)
  expect(transition.state.phase).toBe('battle')
  expect(router.currentRoute.value.name).toBe('study-decks')
  releaseGuard(true)
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('quiz')
  expect(transition.state.phase).toBe('reveal')
  await vi.advanceTimersByTimeAsync(ARENA_REVEAL_MS)
  expect(transition.state.active).toBe(false)
})

it('can skip the reveal without issuing another navigation', async () => {
  const push = vi.spyOn(router, 'push')
  transition.start({ router, location })
  transition.presented(transition.state.sequence)
  await vi.advanceTimersByTimeAsync(ARENA_ANTICIPATION_MS + ARENA_BATTLE_MS)
  expect(transition.state.phase).toBe('reveal')
  await transition.skip()
  expect(transition.state.active).toBe(false)
  await vi.advanceTimersByTimeAsync(ARENA_REVEAL_MS)
  expect(push).toHaveBeenCalledTimes(1)
})

it('cleans up when Back is used during the reveal', async () => {
  transition.start({ router, location })
  transition.presented(transition.state.sequence)
  await vi.advanceTimersByTimeAsync(ARENA_ANTICIPATION_MS + ARENA_BATTLE_MS)
  router.back()
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('study-decks')
  expect(transition.state.active).toBe(false)
  await vi.advanceTimersByTimeAsync(ARENA_REVEAL_MS)
  expect(transition.state.active).toBe(false)
})

it('honors a reduced-motion preference enabled during playback', async () => {
  transition.start({ router, location })
  transition.presented(transition.state.sequence)
  await vi.advanceTimersByTimeAsync(ARENA_ANTICIPATION_MS)
  await transition.reduceMotion()
  expect(router.currentRoute.value.name).toBe('quiz')
  expect(transition.state.reducedMotion).toBe(true)
  expect(transition.state.active).toBe(false)
})

it('supports skipping and ignores repeated clicks and the original entrance timer', async () => {
  const push = vi.spyOn(router, 'push')
  transition.start({ router, location })
  await Promise.all([transition.skip(), transition.skip(), transition.skip()])
  await vi.advanceTimersByTimeAsync(ARENA_ENTRANCE_MS + ARENA_NAVIGATION_TIMEOUT_MS)
  expect(push).toHaveBeenCalledTimes(1)
  expect(router.currentRoute.value.name).toBe('quiz')
  expect(transition.state.active).toBe(false)
})

it('hands off immediately with reduced motion and stays idle on direct Arena entry', async () => {
  await router.push(location)
  expect(transition.state.active).toBe(false)
  await router.push('/study-decks')
  transition.start({ router, location, reducedMotion: true })
  await vi.advanceTimersByTimeAsync(0)
  expect(router.currentRoute.value.name).toBe('quiz')
  expect(transition.state.active).toBe(false)
})

it('cancels a pending effect when browser navigation leaves the source route', async () => {
  transition.start({ router, location })
  await router.push('/home')
  await vi.advanceTimersByTimeAsync(ARENA_ENTRANCE_MS)
  expect(router.currentRoute.value.name).toBe('home')
  expect(transition.state.active).toBe(false)
})

it('recovers from an aborted navigation and permits an explicit retry', async () => {
  const removeGuard = router.beforeEach(() => false)
  transition.start({ router, location })
  await transition.skip()
  expect(transition.state.active).toBe(false)
  expect(transition.state.error).toContain('could not open')
  expect(router.currentRoute.value.name).toBe('study-decks')
  removeGuard()
  transition.start({ router, location })
  expect(transition.state.error).toBe('')
  await transition.skip()
  expect(router.currentRoute.value.name).toBe('quiz')
})

it('clears a thrown navigation error and a stalled router without a stuck overlay', async () => {
  const push = vi.spyOn(router, 'push').mockRejectedValueOnce(new Error('offline'))
  transition.start({ router, location })
  await transition.skip()
  expect(transition.state.error).toContain('could not open')
  expect(transition.state.active).toBe(false)
  let resolvePush
  push.mockReturnValueOnce(
    new Promise((resolve) => {
      resolvePush = resolve
    }),
  )
  transition.start({ router, location })
  const navigation = transition.skip()
  await vi.advanceTimersByTimeAsync(ARENA_NAVIGATION_TIMEOUT_MS)
  expect(transition.state.active).toBe(false)
  expect(transition.state.error).toContain('taking too long')
  resolvePush()
  await navigation
  expect(transition.state.error).toContain('taking too long')
})

it('closes cleanly if an expired session redirects the handoff to login', async () => {
  router.beforeEach((to) => (to.name === 'quiz' ? { name: 'login' } : true))
  transition.start({ router, location })
  await transition.skip()
  expect(router.currentRoute.value.name).toBe('login')
  expect(transition.state.active).toBe(false)
  expect(transition.state.error).toBe('')
})
