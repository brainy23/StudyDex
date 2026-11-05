import { computed, onMounted, onUnmounted, ref, unref, watch } from 'vue'
import { studyAction } from '../services/learningService'

export function useStudySession(profile, topic, mode, storageNamespace = 'study-session') {
  const state = ref(null)
  const error = ref('')
  const busy = ref(false)
  let owner, topicId, sessionId, generation = 0, alive = true, heartbeat
  let pending = Promise.resolve()
  let failedAction = null
  const storageKey = () => `studydex:${storageNamespace}:${owner}:${mode}:${topicId}`
  async function perform(request, version) {
    if (!alive || version !== generation) return null
    if (!request.userId || !request.topicId || !request.sessionId) throw new Error('Your study session is still loading. Please retry.')
    const result = await studyAction(request)
    if (!alive || version !== generation) return null
    state.value = result
    error.value = ''
    return result
  }
  function action(name, blockId) {
    const version = generation
    const request = { sessionId, topicId, mode, action: name, blockId, userId: owner }
    // Serialize heartbeat/pause/completion so a late heartbeat cannot resume a
    // paused block or race a completion. Errors remain retryable.
    const next = pending.catch(() => {}).then(async () => {
      busy.value = true
      try { const result = await perform(request, version); failedAction = null; return result }
      catch (cause) { if (alive && version === generation) { error.value = cause.message; failedAction = { name, blockId } }; throw cause }
      finally { if (alive) busy.value = false }
    })
    pending = next
    return next
  }
  watch([() => unref(profile)?.id, () => unref(topic)?.id], async ([uid, id]) => {
    const version = ++generation
    owner = uid; topicId = id; state.value = null
    if (!owner || !topicId) return
    try {
      try { sessionId = sessionStorage.getItem(storageKey()) } catch { sessionId = null }
      sessionId ||= crypto.randomUUID()
      try { sessionStorage.setItem(storageKey(), sessionId) } catch { /* Server state still persists. */ }
      const result = await action('open')
      if (version !== generation || !result) return
      if (result.session.status !== 'in_progress') {
        sessionId = crypto.randomUUID()
        try { sessionStorage.setItem(storageKey(), sessionId) } catch { /* optional recovery */ }
        await action('open')
      }
    } catch { /* error is surfaced with a retry action */ }
  }, { immediate: true })
  function visibility() {
    if (document.hidden && state.value?.block?.running_since) void action('pause').catch(() => {})
  }
  onMounted(() => {
    heartbeat = setInterval(() => {
      if (!document.hidden && state.value?.block?.running_since) void action('heartbeat').catch(() => {})
    }, 10000)
    document.addEventListener('visibilitychange', visibility)
  })
  onUnmounted(() => {
    alive = false; generation++; clearInterval(heartbeat)
    document.removeEventListener('visibilitychange', visibility)
  })
  async function restart() {
    sessionId = crypto.randomUUID()
    try { sessionStorage.setItem(storageKey(), sessionId) } catch { /* optional recovery */ }
    return action('open')
  }
  const retry = () => action(failedAction?.name || 'open', failedAction?.blockId)
  return { state, error, busy, action, restart, retry, ready: computed(() => !!state.value) }
}
