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
    if (!current.value || !flipped.value || !['practise', 'remembered'].includes(rating)) return
    const card = queue.value.shift()
    if (rating === 'remembered') remembered.value.push(card.id)
    else queue.value.splice(Math.min(1, queue.value.length), 0, card)
    reviews.value++
    flipped.value = false
  }

  return { cards, queue, remembered, reviews, flipped, current, complete, start, rate }
}
