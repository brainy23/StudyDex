import { reactive, readonly } from 'vue'

export const POKEMON_COVER_MS = 350
export const POKEMON_ENTRANCE_MS = 1150
export const POKEMON_REVEAL_MS = 500

// Destination-independent: the caller's promise represents the actual page/load.
// One root-mounted PokemonTransition host survives destination navigation.
export function createPokemonTransition({
  coverMs = POKEMON_COVER_MS,
  entranceMs = POKEMON_ENTRANCE_MS,
  revealMs = POKEMON_REVEAL_MS,
  presentationTimeoutMs = 2000,
  loadingTimeoutMs = 15000,
  prefersReducedMotion = () =>
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
} = {}) {
  const state = reactive({
    active: false,
    phase: 'idle',
    sequence: 0,
    reducedMotion: false,
    skipping: false,
    error: '',
    outcome: '',
    title: '',
    description: '',
    source: '',
    destination: '',
    durationScale: 1,
  })
  let current = null

  function finish(attempt, error) {
    if (current !== attempt) return
    for (const timer of attempt.timers) clearTimeout(timer)
    current = null
    state.active = false
    state.phase = 'idle'
    state.outcome = error ? (error.name === 'AbortError' ? 'cancelled' : 'failed') : 'completed'
    state.error = error?.message || ''
    if (error) {
      attempt.abort.abort(error)
      attempt.reject(error)
    } else attempt.resolve(attempt.value)
  }
  function timer(attempt, callback, delay) {
    const id = setTimeout(() => {
      if (current === attempt) callback()
    }, delay)
    attempt.timers.add(id)
    return id
  }
  function revealIfReady(attempt) {
    if (
      current !== attempt ||
      !attempt.ready ||
      !attempt.minimumElapsed ||
      state.phase === 'reveal'
    )
      return
    state.phase = 'reveal'
    if (state.reducedMotion || state.skipping) finish(attempt)
    else timer(attempt, () => finish(attempt), revealMs * attempt.durationScale)
  }
  function completeLoading(attempt) {
    if (current !== attempt || !attempt.taskDone || !attempt.pageDone) return
    clearTimeout(attempt.loadingTimer)
    attempt.ready = true
    revealIfReady(attempt)
  }
  // The destination acknowledges its rendered loading/error/empty state. Matching
  // the sequence prevents a late request from completing a newer transition.
  function pageReady(key, sequence) {
    const attempt = current
    if (!attempt || !attempt.started || attempt.waitFor !== key || state.sequence !== sequence)
      return
    attempt.pageDone = true
    completeLoading(attempt)
  }
  function pageLeft(key, sequence) {
    if (current?.waitFor === key && state.sequence === sequence) cancel()
  }
  function presented(sequence) {
    const attempt = current
    if (!attempt || sequence !== state.sequence || attempt.started) return false
    attempt.started = true
    clearTimeout(attempt.presentationTimer)
    if (state.reducedMotion || state.skipping) {
      state.phase = 'loading'
      attempt.minimumElapsed = true
    } else {
      timer(
        attempt,
        () => {
          state.phase = 'loading'
        },
        coverMs * attempt.durationScale,
      )
      timer(
        attempt,
        () => {
          attempt.minimumElapsed = true
          revealIfReady(attempt)
        },
        (coverMs + entranceMs) * attempt.durationScale,
      )
    }
    attempt.loadingTimer = timer(
      attempt,
      () => finish(attempt, new Error('This page is taking too long to load. Please try again.')),
      loadingTimeoutMs,
    )
    Promise.resolve()
      .then(() => {
        if (current !== attempt) return
        return attempt.task(attempt.abort.signal)
      })
      .then((value) => {
        if (current !== attempt) return
        attempt.value = value
        attempt.taskDone = true
        completeLoading(attempt)
      })
      .catch((error) =>
        finish(
          attempt,
          error instanceof Error ? error : new Error('This page could not load. Please try again.'),
        ),
      )
    return true
  }
  function run({
    task,
    title = 'A new adventure awaits!',
    description = '',
    source = '',
    destination = '',
    waitFor = '',
    durationMs = coverMs + entranceMs + revealMs,
  } = {}) {
    if (current) return current.promise
    if (typeof task !== 'function') return Promise.reject(new Error('A loading task is required.'))
    if (!Number.isFinite(durationMs) || durationMs <= 0)
      return Promise.reject(new Error('Animation duration must be a positive number.'))
    const attempt = {
      task,
      durationScale: durationMs / (coverMs + entranceMs + revealMs),
      abort: new AbortController(),
      timers: new Set(),
      ready: false,
      waitFor,
      taskDone: false,
      pageDone: !waitFor,
      minimumElapsed: false,
      started: false,
    }
    attempt.promise = new Promise((resolve, reject) => {
      attempt.resolve = resolve
      attempt.reject = reject
    })
    current = attempt
    Object.assign(state, {
      active: true,
      phase: 'cover',
      sequence: state.sequence + 1,
      reducedMotion: !!prefersReducedMotion(),
      skipping: false,
      error: '',
      outcome: '',
      title: String(title),
      description: String(description),
      source: String(source),
      destination: String(destination),
      durationScale: attempt.durationScale,
    })
    attempt.presentationTimer = timer(
      attempt,
      () => finish(attempt, new Error('The loading screen could not open. Please try again.')),
      presentationTimeoutMs,
    )
    return attempt.promise
  }
  function skipAnimation() {
    if (!current) return
    state.skipping = true
    current.minimumElapsed = true
    if (state.phase === 'reveal') finish(current)
    else {
      state.phase = 'loading'
      revealIfReady(current)
    }
  }
  function reduceMotion() {
    state.reducedMotion = true
    skipAnimation()
  }
  function cancel() {
    if (!current) return
    const error = new Error('Loading was cancelled.')
    error.name = 'AbortError'
    finish(current, error)
  }
  return {
    state: readonly(state),
    run,
    presented,
    pageReady,
    pageLeft,
    skipAnimation,
    reduceMotion,
    cancel,
  }
}

const transition = createPokemonTransition()
export function usePokemonTransition() {
  return transition
}
