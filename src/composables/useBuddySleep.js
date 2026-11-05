import { computed, onMounted, onUnmounted, ref } from 'vue'
import { isBuddySleepTime } from '../utils/buddySleep'

export function useBuddySleep() {
  const now = ref(new Date())
  const isSleeping = computed(() => isBuddySleepTime(now.value))
  let clock
  const refresh = () => { now.value = new Date() }
  onMounted(() => {
    refresh()
    clock = setInterval(refresh, 1000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
  })
  onUnmounted(() => {
    clearInterval(clock)
    window.removeEventListener('focus', refresh)
    document.removeEventListener('visibilitychange', refresh)
  })
  return { isSleeping }
}
