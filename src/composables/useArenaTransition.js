import { nextTick, reactive, readonly } from 'vue'

export const ARENA_ANTICIPATION_MS = 350
export const ARENA_BATTLE_MS = 1150
export const ARENA_REVEAL_MS = 500
export const ARENA_ENTRANCE_MS = ARENA_ANTICIPATION_MS + ARENA_BATTLE_MS + ARENA_REVEAL_MS
export const ARENA_NAVIGATION_TIMEOUT_MS = 8000
export const ARENA_PRESENTATION_TIMEOUT_MS = 2000

// The app owns this controller, rather than the Lab's component lifecycle.
export function createArenaTransition({
  anticipationMs = ARENA_ANTICIPATION_MS,
  battleMs = ARENA_BATTLE_MS,
  revealMs = ARENA_REVEAL_MS,
  navigationTimeoutMs = ARENA_NAVIGATION_TIMEOUT_MS,
  presentationTimeoutMs = ARENA_PRESENTATION_TIMEOUT_MS,
} = {}) {
  const state = reactive({
    active: false,
    navigating: false,
    phase: 'idle',
    sequence: 0,
    reducedMotion: false,
    topicName: '',
    error: '',
    arrivalPath: '',
  })
  let attempt = null

  function focusDestination() {
    nextTick(() =>
      requestAnimationFrame(() => {
        if (state.active) return
        const heading = document.querySelector('main h1, h1')
        if (!heading) return
        const destination = document.querySelector('main') || heading
        destination.scrollIntoView?.({ block: 'start', behavior: 'instant' })
        heading.setAttribute('tabindex', '-1')
        heading.focus({ preventScroll: true })
      }),
    )
  }

  function clearPlayback(current) {
    for (const key of ['presentationTimer', 'battleTimer', 'entranceTimer', 'revealTimer']) {
      clearTimeout(current[key])
    }
  }

  function settle(current, { error = '', focusRoute = false } = {}) {
    if (current !== attempt) return
    clearPlayback(current)
    clearTimeout(current.watchdog)
    current.stopWatching?.()
    attempt = null
    state.active = false
    state.navigating = false
    state.phase = 'idle'
    state.error = error
    if (focusRoute && current.router.currentRoute.value.name === 'quiz') {
      // The Arena consumes this once its centred loading panel has its final layout.
      state.arrivalPath = current.router.currentRoute.value.fullPath
      return
    }
    nextTick(() => {
      if (state.active) return
      if (error && current.trigger?.isConnected) current.trigger.focus({ preventScroll: true })
      else if (focusRoute) focusDestination()
    })
  }

  async function handoff(current) {
    if (!current || current !== attempt || state.navigating) return
    clearPlayback(current)
    state.navigating = true
    // Keep the battle screen covered while guards resolve. Reveal only the new route.
    current.watchdog = setTimeout(
      () =>
        settle(current, {
          error:
            'Poké Arena is taking too long to open. Please try again. Your study timer is paused.',
        }),
      navigationTimeoutMs,
    )
    try {
      const failure = await current.router.push(current.location)
      if (current !== attempt) return
      clearTimeout(current.watchdog)
      if (failure) {
        settle(current, {
          error: 'Poké Arena could not open. Please try again. Your study timer is paused.',
        })
        return
      }
      await nextTick()
      if (current !== attempt) return
      if (current.instant) settle(current, { focusRoute: true })
      else {
        current.destination = current.router.currentRoute.value.fullPath
        state.phase = 'reveal'
        // A timer, independent of animation events, also guarantees overlay cleanup.
        current.revealTimer = setTimeout(() => settle(current, { focusRoute: true }), revealMs)
      }
    } catch {
      settle(current, {
        error: 'Poké Arena could not open. Please try again. Your study timer is paused.',
      })
    }
  }

  function presented(sequence) {
    const current = attempt
    if (!current || current.sequence !== sequence || current.presented || current.instant)
      return false
    current.presented = true
    clearTimeout(current.presentationTimer)
    current.battleTimer = setTimeout(() => {
      if (current === attempt) state.phase = 'battle'
    }, anticipationMs)
    current.entranceTimer = setTimeout(() => handoff(current), anticipationMs + battleMs)
    return true
  }

  function start({ router, location, topicName = '', onStart, reducedMotion = false }) {
    if (state.active) return false
    const current = {
      router,
      location,
      sequence: ++state.sequence,
      instant: reducedMotion,
      trigger: document.activeElement,
      source: router.currentRoute.value.fullPath,
    }
    attempt = current
    state.active = true
    state.navigating = false
    state.phase = 'anticipation'
    state.reducedMotion = reducedMotion
    state.topicName = topicName
    state.error = ''
    state.arrivalPath = ''
    try {
      onStart?.()
    } catch {
      settle(current, { error: 'Poké Arena could not open. Please try again.' })
      return false
    }
    current.stopWatching = router.afterEach((to, from, failure) => {
      if (failure) return
      if (state.phase === 'reveal' && to.fullPath !== current.destination) {
        settle(current, { focusRoute: true })
      } else if (!state.navigating && to.fullPath !== current.source) {
        settle(current, { focusRoute: true })
      }
    })
    if (reducedMotion) current.entranceTimer = setTimeout(() => handoff(current), 0)
    else {
      // Normal playback starts after the host acknowledges a painted overlay.
      current.presentationTimer = setTimeout(
        () =>
          settle(current, {
            error:
              'The Arena entrance could not be displayed. Please try again. Your study timer is paused.',
          }),
        presentationTimeoutMs,
      )
    }
    return true
  }

  function skip() {
    const current = attempt
    if (!current) return
    current.instant = true
    if (state.phase === 'reveal') settle(current, { focusRoute: true })
    else return handoff(current)
  }

  return {
    state: readonly(state),
    start,
    presented,
    skip,
    reduceMotion: () => {
      state.reducedMotion = true
      return skip()
    },
    focusArrival: (path) => {
      if (!state.arrivalPath) return
      const matches = state.arrivalPath === path
      state.arrivalPath = ''
      if (matches) focusDestination()
    },
    clearArrival: () => {
      state.arrivalPath = ''
    },
    cancel: () => {
      if (attempt) settle(attempt)
      state.arrivalPath = ''
    },
  }
}

const arenaTransition = createArenaTransition()
export function useArenaTransition() {
  return arenaTransition
}
