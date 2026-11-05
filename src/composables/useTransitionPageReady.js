import { nextTick, onUnmounted, watch } from 'vue'
import { usePokemonTransition } from './usePokemonTransition'

export function useTransitionPageReady(key, isReady) {
  const transition = usePokemonTransition()
  const sequence = transition.state.sequence
  let alive = true
  watch(isReady, async ready => {
    if (!ready) return
    await nextTick()
    if (alive && isReady()) transition.pageReady(key, sequence)
  }, { immediate: true, flush: 'post' })
  onUnmounted(() => {
    alive = false
    transition.pageLeft(key, sequence)
  })
}
