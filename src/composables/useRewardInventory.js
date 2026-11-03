import { computed, onMounted, onUnmounted, readonly, ref } from 'vue'
import { getRewardInventory, watchRewardAccount } from '../services/rewardsService'

const count = ref(null)
const packs = ref([])
const error = ref('')
const loading = ref(false)
const notice = ref('')
let owner = null
let sequence = 0
let consumers = 0
let interval
let accountRefresh
let subscription

function clearInventory() {
  sequence++
  count.value = null
  packs.value = []
  error.value = ''
  notice.value = ''
  loading.value = false
}

async function refresh() {
  const request = ++sequence
  loading.value = true
  try {
    const result = await getRewardInventory()
    if (request !== sequence || consumers === 0) return
    const previous = owner === result.userId ? count.value : null
    owner = result.userId
    count.value = result.count
    packs.value = result.packs
    notice.value = previous !== null && result.count > previous
      ? `You have ${result.count} unopened packs!` : ''
    error.value = ''
  } catch (failure) {
    if (request !== sequence || consumers === 0) return
    // An unavailable backend is unknown, never a fabricated zero or demo count.
    count.value = null
    packs.value = []
    notice.value = ''
    error.value = failure.message || 'Your packs could not be loaded.'
  } finally {
    if (request === sequence) loading.value = false
  }
}

function refreshVisible() {
  if (document.visibilityState !== 'hidden') void refresh()
}

function start() {
  try {
    subscription = watchRewardAccount((event, userId) => {
      if (event === 'SIGNED_OUT' || owner !== userId) {
        clearInventory()
        owner = userId
      }
      clearTimeout(accountRefresh)
      if (userId) accountRefresh = setTimeout(refreshVisible, 0)
    })
  } catch {
    // refresh() provides the friendly configuration/session error.
  }
  void refresh()
  window.addEventListener('focus', refreshVisible)
  window.addEventListener('studydex:rewards-changed', refreshVisible)
  document.addEventListener('visibilitychange', refreshVisible)
  // No publication/Realtime configuration changes are needed for this fallback.
  interval = setInterval(refreshVisible, 30000)
}

function stop() {
  clearInterval(interval)
  clearTimeout(accountRefresh)
  subscription?.unsubscribe()
  subscription = null
  window.removeEventListener('focus', refreshVisible)
  window.removeEventListener('studydex:rewards-changed', refreshVisible)
  document.removeEventListener('visibilitychange', refreshVisible)
  owner = null
  clearInventory()
}

export function useRewardInventory() {
  onMounted(() => { if (++consumers === 1) start() })
  onUnmounted(() => { if (--consumers === 0) stop() })
  return {
    count: readonly(count), packs: readonly(packs), error: readonly(error),
    loading: readonly(loading), notice: readonly(notice),
    label: computed(() => count.value === null ? '' : count.value > 99 ? '99+' : String(count.value)),
    refresh,
  }
}
