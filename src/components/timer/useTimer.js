import { computed, reactive, readonly, ref } from 'vue'

export const DAILY_LIMIT = 4
export const FOCUS_SECONDS = 25 * 60
export const BREAK_SECONDS = 5 * 60

export function singaporeDay(timestamp) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp))
}

// Local focus tracking never authorizes XP. Test clocks do not shorten real sessions.
export function createStudyTimer({
  now = () => Date.now(),
  storage,
  schedule = (callback) => setInterval(callback, 250),
  cancel = (id) => clearInterval(id),
  focusSeconds = FOCUS_SECONDS,
  breakSeconds = BREAK_SECONDS,
} = {}) {
  const fresh = () => ({
    phase: 'focus',
    status: 'idle',
    remainingMs: focusSeconds * 1000,
    deadlineAt: null,
    topicId: null,
    completions: [],
    notice: '',
  })
  const state = reactive(fresh())
  const recoveryAvailable = ref(Boolean(storage))
  const clock = ref(now())
  let userId = null
  let interval = null
  let lastStoredAt = 0
  const key = () => `studydex:focus:v1:${userId}`
  const secondsLeft = computed(() => Math.ceil(state.remainingMs / 1000))
  const display = computed(() => {
    const seconds = secondsLeft.value
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  })
  const dailyCompleted = computed(
    () =>
      state.completions.filter((timestamp) => singaporeDay(timestamp) === singaporeDay(clock.value))
        .length,
  )

  function save() {
    if (!userId || !storage) return
    try {
      storage.setItem(key(), JSON.stringify({ version: 1, ...state }))
      lastStoredAt = now()
    } catch {
      recoveryAvailable.value = false
      state.notice = 'Your browser could not save the timer. Keep this page open to continue.'
    }
  }

  function stopTicking() {
    if (interval !== null) cancel(interval)
    interval = null
  }

  function sync() {
    clock.value = now()
    if (state.status !== 'running') return
    state.remainingMs = Math.max(0, state.deadlineAt - clock.value)
    if (state.remainingMs === 0) {
      stopTicking()
      if (state.phase === 'focus') {
        state.completions.push(new Date(state.deadlineAt).toISOString())
        state.notice = 'Focus block complete! Take a five-minute break.'
      } else state.notice = 'Break complete. Start another focus block when you are ready.'
      state.status = 'complete'
      state.deadlineAt = null
      save()
    } else if (clock.value - lastStoredAt >= 10000) save()
  }

  function bindUser(id) {
    if (!id) throw new Error('Log in before starting a study timer.')
    if (id === userId) {
      sync()
      return
    }
    stopTicking()
    userId = id
    Object.assign(state, fresh())
    clock.value = now()
    try {
      const saved = JSON.parse(storage?.getItem(key()) || 'null')
      if (!saved || saved.version !== 1) return
      const duration = saved.phase === 'break' ? breakSeconds : focusSeconds
      if (
        !['focus', 'break'].includes(saved.phase) ||
        !['idle', 'running', 'paused', 'complete'].includes(saved.status) ||
        !Number.isFinite(saved.remainingMs) ||
        saved.remainingMs < 0 ||
        saved.remainingMs > duration * 1000
      )
        return
      state.phase = saved.phase
      state.status = saved.status
      state.topicId = saved.topicId || null
      state.remainingMs = saved.remainingMs
      state.completions = Array.isArray(saved.completions)
        ? saved.completions
            .filter(
              (date) =>
                typeof date === 'string' &&
                Number.isFinite(Date.parse(date)) &&
                Date.parse(date) <= now(),
            )
            .slice(-1000)
        : []
      if (saved.status === 'running') {
        const remaining = Number.isFinite(saved.deadlineAt) ? saved.deadlineAt - now() : 0
        // Recover paused: unobserved/offline time never earns a completion.
        state.remainingMs =
          remaining > 0 ? Math.min(remaining, saved.remainingMs) : saved.remainingMs
        state.status = 'paused'
        state.notice =
          'Your interrupted session was recovered and paused. Resume when you are ready.'
      } else if (saved.status === 'paused') {
        state.notice = 'Your saved session is paused. Resume when you are ready.'
      }
      if (state.status === 'paused' && state.remainingMs === 0) state.remainingMs = duration * 1000
      save()
    } catch {
      state.notice = 'The saved timer could not be recovered. You can start a new session.'
    }
  }

  function run() {
    if (!userId || state.status === 'running') return
    state.status = 'running'
    state.notice = ''
    state.deadlineAt = now() + state.remainingMs
    stopTicking()
    interval = schedule(sync)
    save()
  }

  function startSession(topicId = null) {
    if (!userId || state.status === 'running' || state.status === 'paused') return
    state.phase = 'focus'
    state.remainingMs = focusSeconds * 1000
    state.topicId = topicId
    run()
  }

  function startBreak() {
    if (state.phase !== 'focus' || state.status !== 'complete') return
    state.phase = 'break'
    state.remainingMs = breakSeconds * 1000
    run()
  }

  function pause(message = '') {
    sync()
    if (state.status !== 'running') return
    stopTicking()
    state.status = 'paused'
    state.deadlineAt = null
    state.notice = message
    save()
  }

  function resume() {
    if (state.status === 'paused') run()
  }

  function endSession() {
    sync()
    stopTicking()
    const completions = [...state.completions]
    Object.assign(state, fresh(), {
      completions,
      notice: 'Session ended. Your completed focus blocks are kept.',
    })
    save()
  }

  return {
    state: readonly(state),
    display,
    secondsLeft,
    dailyCompleted,
    recoveryAvailable: readonly(recoveryAvailable),
    DAILY_LIMIT,
    bindUser,
    startSession,
    startBreak,
    pause,
    resume,
    endSession,
    sync,
    dispose: stopTicking,
  }
}

let browserStorage
try {
  browserStorage = globalThis.localStorage
} catch {
  /* Timer works without recovery. */
}
const sharedTimer = createStudyTimer({ storage: browserStorage })
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () =>
    sharedTimer.pause('Your session was paused when you left the page.'),
  )
  window.addEventListener('focus', () => sharedTimer.sync())
}

export function useTimer() {
  return sharedTimer
}
