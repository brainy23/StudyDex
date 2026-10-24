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
    cards.value = [...source]
    queue.value = [...source]
    remembered.value = []
    reviews.value = 0
    flipped.value = false
  }

  function rate(rating) {
    if (!current.value || !flipped.value || !['again', 'hard', 'easy'].includes(rating)) return
    const card = queue.value.shift()
    if (rating === 'easy') remembered.value.push(card.id)
    else queue.value.splice(Math.min(rating === 'again' ? 1 : 3, queue.value.length), 0, card)
    reviews.value++
    flipped.value = false
  }

  return { cards, queue, remembered, reviews, flipped, current, complete, start, rate }
}
