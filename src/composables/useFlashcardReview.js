import { computed, ref } from 'vue'

export function useFlashcardReview() {
  const cards = ref([])
  const queue = ref([])
  const remembered = ref([])
  const reviews = ref(0)
  const flipped = ref(false)
  const current = computed(() => queue.value[0] || null)
  const complete = computed(() => cards.value.length > 0 && queue.value.length === 0)

  function start(source) {
    cards.value = [...new Map(source.map((card) => [card.id, card])).values()]
    queue.value = [...cards.value]
    remembered.value = []
    reviews.value = 0
    flipped.value = false
  }

  function rate(rating) {
    if (!current.value || !flipped.value || !['practise', 'remembered', 'hard'].includes(rating)) return
    const card = queue.value.shift()
    if (rating === 'remembered') remembered.value.push(card.id)
    else queue.value.splice(Math.min(rating === 'hard' ? 3 : 1, queue.value.length), 0, card)
    reviews.value++
    flipped.value = false
  }

  function snapshot() {
    return {
      cardIds: cards.value.map(card => card.id),
      queue: queue.value.map(card => card.id),
      remembered: [...remembered.value],
      reviews: reviews.value,
      flipped: flipped.value,
    }
  }

  function restore(saved) {
    if (!saved || JSON.stringify(saved.cardIds) !== JSON.stringify(cards.value.map(card => card.id))) return false
    if (!Array.isArray(saved.queue) || !Array.isArray(saved.remembered)) return false
    const ids = [...saved.queue, ...saved.remembered]
    if (ids.length !== cards.value.length || new Set(ids).size !== ids.length ||
        !cards.value.every(card => ids.includes(card.id)) ||
        !Number.isSafeInteger(saved.reviews) || saved.reviews < saved.remembered.length) return false
    const byId = new Map(cards.value.map(card => [card.id, card]))
    queue.value = saved.queue.map(id => byId.get(id))
    remembered.value = [...saved.remembered]
    reviews.value = saved.reviews
    flipped.value = Boolean(saved.flipped)
    return true
  }

  return { cards, queue, remembered, reviews, flipped, current, complete, start, rate, snapshot, restore }
}
