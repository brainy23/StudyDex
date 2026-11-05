import { onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePokemonTransition } from './usePokemonTransition'

const rooms = {
  'quiz-battle': { source: 'Poké Arena', destination: 'Quiz Room', title: 'Time for Battle!' },
  learn: { source: 'Poké Lab', destination: 'Learn Room', title: 'Learn with Professor Mewtwo!' },
  'study-decks': { source: 'Poké Lab', destination: 'Study Room', title: 'Time to study!' },
}
const roomKey = (name, topic) => `room:${name}:${topic}`

export async function enterRoom(router, name, query) {
  const transition = usePokemonTransition()
  if (transition.state.active) return
  const room = rooms[name]
  await transition.run({
    animate: true,
    ...room,
    description: `Your ${room.destination.toLowerCase()} is getting ready.`,
    waitFor: roomKey(name, query.topic),
    durationMs: 2500,
    task: async (signal) => {
      const failure = await router.push({ name, query })
      if (signal.aborted) throw signal.reason
      const target = router.currentRoute.value
      if (failure || target.name !== name || target.query.topic !== String(query.topic)) {
        throw new Error(`Could not open the ${room.destination.toLowerCase()}. Please try again.`)
      }
    },
  })
}

// A room acknowledges its rendered content/error state, including its selected
// lesson or flashcard request. Optional artwork does not block entry.
export function useRoomTransitionReady(name, ready, onTimeout) {
  const route = useRoute()
  const transition = usePokemonTransition()
  let key = roomKey(name, route.query.topic)
  let sequence = transition.state.sequence
  watch(() => route.query.topic, topic => {
    transition.pageLeft(key, sequence)
    key = roomKey(name, topic)
    sequence = transition.state.sequence
  })
  watch(ready, value => {
    if (value) transition.pageReady(key, sequence)
  }, { immediate: true, flush: 'post' })
  watch(() => transition.state.outcome, outcome => {
    if (outcome === 'failed' && transition.state.sequence === sequence && !ready()) {
      onTimeout(new Error(transition.state.error))
    }
  })
  onUnmounted(() => transition.pageLeft(key, sequence))
}
