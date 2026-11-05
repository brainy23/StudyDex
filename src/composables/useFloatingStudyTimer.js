import { computed, inject, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useFocusTimer } from './useFocusTimer'
import { useStudySession } from './useStudySession'
import { useExperiencePrompt } from './useExperiencePrompt'
import { getRewardedTimerCount, newExperienceId } from '../services/experienceService'
import { isBuddySleepTime } from '../utils/buddySleep'
import { getCurrentProfile } from '../services/profileService'

const timerKey = Symbol('floating-study-timer')

export function createFloatingStudyTimer() {
  const profile = ref(null)
  const topic = ref(null)
  const timer = useFocusTimer()
  // Keep timer blocks separate from finishing a lesson or a flashcard round.
  // Same server RPC, block duration, heartbeats, XP limits and completion rules.
  const session = useStudySession(profile, topic, 'flashcards')
  const notice = ref('')
  const rewardedToday = ref(0)
  const rewardSequence = ref(0)
  const savedReward = useExperiencePrompt(ref(null), refreshDailyRewards)
  let processing = false
  let version = 0
  let alive = true
  let dailyRefresh
  const contextKey = id => `studydex:focus-context:${id}`

  async function refreshDailyRewards() {
    const id = profile.value?.id
    if (!id) return
    try {
      const count = await getRewardedTimerCount(id)
      if (alive && profile.value?.id === id) rewardedToday.value = count
    } catch { /* XP saving errors are reported by the existing session service. */ }
  }
  function attach(student, selectedTopic) {
    if (!student?.id || !selectedTopic?.id) return
    if (profile.value?.id === student.id && topic.value?.id === selectedTopic.id) return
    // A block keeps the topic it started with, even while reading another topic.
    if (profile.value?.id === student.id &&
        (timer.running.value || timer.seconds.value < 1500 || timer.pendingRewards.value.length)) return
    version++
    profile.value = student
    topic.value = selectedTopic
    timer.bind(student.id)
    notice.value = ''
    void refreshDailyRewards()
    try { sessionStorage.setItem(contextKey(student.id), JSON.stringify(selectedTopic)) } catch { /* optional recovery */ }
  }
  async function restore(userId) {
    if (!userId || profile.value) return
    const request = version
    try {
      const raw = sessionStorage.getItem(contextKey(userId))
      if (!raw) return
      const selectedTopic = JSON.parse(raw)
      const student = await getCurrentProfile()
      if (alive && request === version && student.id === userId) attach(student, selectedTopic)
    } catch { /* A verified learning page can attach the timer instead. */ }
  }
  function clear() {
    version++
    profile.value = null
    topic.value = null
    timer.bind(null)
    notice.value = ''
    savedReward.clear()
    rewardedToday.value = 0
  }
  async function start() {
    if (isBuddySleepTime() || !session.ready.value || session.busy.value || timer.running.value) return
    const request = version
    try {
      const block = session.state.value?.block
      if (session.state.value?.session.status !== 'in_progress' ||
          (block?.focus_completed_at && block.block_number >= 4)) await session.restart()
      const current = session.state.value?.block
      const result = await session.action(current && !current.focus_completed_at ? 'resume' : 'start', newExperienceId())
      if (!alive || request !== version || !result?.block) return
      timer.seconds.value = Math.max(0, Math.ceil((1500000 - result.block.active_ms) / 1000))
      timer.start()
      notice.value = ''
    } catch { /* session.error provides retry */ }
  }
  async function pause() {
    timer.pause()
    if (session.state.value?.block?.running_since) {
      try { await session.action('pause') } catch { /* session.error provides retry */ }
    }
  }
  async function reset() {
    if (processing) return
    await pause()
    try {
      if (session.ready.value) await session.action('reset')
      timer.reset()
      notice.value = ''
    } catch { /* Keep the last confirmed timer state on save failure. */ }
  }
  async function completePending() {
    if (processing || !session.ready.value || !timer.pendingRewards.value.length) return
    processing = true
    const request = version
    const ids = [...timer.pendingRewards.value]
    try {
      const result = await session.action('complete_block')
      if (!alive || request !== version) return
      if (!result?.block?.focus_completed_at) {
        // A local countdown is not proof of server-confirmed study time.
        // Keep the pending reward until the same block really completes.
        timer.pause()
        timer.seconds.value = Math.max(0, Math.ceil((1500000 - (result?.block?.active_ms || 0)) / 1000))
        timer.finished.value = false
        notice.value = 'Some focus time was not saved. Resume to finish this block.'
        return
      }
      ids.forEach(timer.consumeReward)
      rewardSequence.value++
      await savedReward.showSaved(result.xp, 'Focus session complete!')
      notice.value = 'Focus block saved. Take a break!'
    } catch { /* Leave pending IDs intact so saving can be retried. */ }
    finally { processing = false }
  }
  watch([timer.pendingRewards, session.ready], completePending, { deep: true })
  watch(() => session.state.value?.block, block => {
    if (block && timer.running.value && !block.running_since && !block.focus_completed_at) {
      timer.pause()
      timer.seconds.value = Math.max(0, Math.ceil((1500000 - block.active_ms) / 1000))
      notice.value = 'Focus timer paused. Resume when you are ready.'
    }
  })
  async function retry() {
    if (timer.pendingRewards.value.length) await completePending()
    else await session.retry().catch(() => {})
  }
  function visibility() { if (document.hidden) void pause() }
  onMounted(() => {
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('focus', refreshDailyRewards)
    dailyRefresh = setInterval(refreshDailyRewards, 30000)
  })
  onUnmounted(() => {
    alive = false
    version++
    timer.pause()
    document.removeEventListener('visibilitychange', visibility)
    window.removeEventListener('focus', refreshDailyRewards)
    clearInterval(dailyRefresh)
  })
  return { profile, topic, timer, session, notice, savedReward, rewardedToday, rewardSequence, attach, restore, clear,
    start, pause, reset, retry, completePending, visible: computed(() => !!profile.value && !!topic.value) }
}

export function provideFloatingStudyTimer() {
  const controller = createFloatingStudyTimer()
  provide(timerKey, controller)
  return controller
}
export function useFloatingStudyTimer() {
  // Standalone views (including previews) can still own a local timer.
  return inject(timerKey, null) || createFloatingStudyTimer()
}
