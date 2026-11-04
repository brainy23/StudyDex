import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getOnboardingStatus, watchOnboardingAccount } from '../services/onboardingService'

// Page-scoped state: no previous student's setup is cached for another account.
export function useOnboarding(onReady = () => {}) {
  const router = useRouter()
  const status = ref(null)
  const loading = ref(true)
  const error = ref('')
  let active = true
  let generation = 0
  let unsubscribe
  let redirectTimer
  const isCurrent = (userId) => active && status.value?.user_id === userId

  async function refresh() {
    const request = ++generation
    loading.value = true
    error.value = ''
    try {
      const next = await getOnboardingStatus()
      if (!active || request !== generation) return
      status.value = next
      await onReady(next)
    } catch (cause) {
      if (active && request === generation) {
        status.value = null
        error.value = cause.message || 'Please try again.'
      }
    } finally {
      if (active && request === generation) loading.value = false
    }
  }

  onMounted(() => {
    try {
      unsubscribe = watchOnboardingAccount((userId) => {
        if (!status.value || userId === status.value.user_id) return
        generation++
        status.value = null
        error.value = 'Your account changed. Please sign in again.'
        // Auth callbacks must finish before navigation starts new SDK requests.
        redirectTimer = setTimeout(() => {
          if (!active) return
          if (userId && router.currentRoute.value.name === 'landing') void refresh()
          else void router.replace({ name: userId ? 'landing' : 'login' })
        }, 0)
      })
    } catch {
      /* The status request reports unavailable authentication/configuration. */
    }
    void refresh()
  })
  onUnmounted(() => {
    active = false
    generation++
    clearTimeout(redirectTimer)
    unsubscribe?.()
  })
  return { status, loading, error, refresh, isCurrent }
}
