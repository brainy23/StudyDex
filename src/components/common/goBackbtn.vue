<script setup>
import { onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  // An explicit destination takes priority over browser history.
  to: { type: [String, Object], default: null },
})
const router = useRouter()

const navigating = ref(false)
const navigationError = ref('')
const removeAfterEach = router.afterEach(() => { navigating.value = false })
const removeError = router.onError(() => { navigating.value = false })
onUnmounted(() => { removeAfterEach(); removeError() })

async function goBack() {
  if (navigating.value) return
  navigating.value = true
  navigationError.value = ''
  let movingThroughHistory = false
  try {
    const history = router.options.history.state
    const previous = typeof history.back === 'string' ? router.resolve(history.back) : null
    if (props.to) {
      const destination = router.resolve(props.to)
      if (destination.fullPath === router.currentRoute.value.fullPath) return
      if (previous?.fullPath === destination.fullPath) {
        movingThroughHistory = true
        router.back()
      } else if (previous?.path === destination.path) {
        // The parent may have different/default query parameters. Pop Topics
        // first, then apply the requested flow on that existing parent entry.
        const returned = await new Promise(resolve => {
          const stop = router.afterEach((to, _from, failure) => {
            stop(); stopError()
            resolve(!failure && to.fullPath === previous.fullPath)
          })
          const stopError = router.onError(() => { stop(); stopError(); resolve(false) })
          router.back()
        })
        if (returned) await router.replace(props.to)
      } else {
        // A back button must not push another copy of the parent page.
        await router.replace(props.to)
      }
      return
    }
    const previousWasBoss = previous && (previous.name === 'surprise-boss' ||
      previous.query.battle === 'boss' || previous.query.mode === 'boss_battle')
    if (previousWasBoss) {
      // Jump over the battle without mounting it or restarting the encounter.
      if (typeof history.position === 'number' && history.position < 2) {
        await router.replace('/home')
      } else {
        movingThroughHistory = true
        router.go(-2)
      }
    } else if (history.back === null) {
      await router.replace('/home')
    } else {
      movingThroughHistory = true
      router.back()
    }
  } catch {
    movingThroughHistory = false
    navigationError.value = 'Could not go back. Please try again.'
  } finally {
    if (!movingThroughHistory) navigating.value = false
  }
}

</script>

<template>
  <button type="button" class="go-back-btn" :disabled="navigating" @click="goBack">
    <span aria-hidden="true">←</span>
    <slot>Go back</slot>
  </button>
  <span v-if="navigationError" class="go-back-error" role="alert">{{ navigationError }}</span>
</template>

<style scoped>
.go-back-btn[type='button'] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  max-width: 100%;
  margin: 0;
  padding: 10px 16px;
  border: 1px solid #d6cce0;
  border-radius: 14px;
  background: #fff;
  color: #303557;
  font: inherit;
  font-weight: 750;
  line-height: 1.4;
  text-align: center;
  cursor: pointer;
  touch-action: manipulation;
}
.go-back-error { color: #9a2f35; font-size: 14px; }
.go-back-btn:disabled { cursor: wait; opacity: .7; }
.go-back-btn:hover { background: #f7f3fb; border-color: #bda9d0; }
.go-back-btn:focus-visible { outline: 3px solid #8a56ac; outline-offset: 3px; }
</style>
