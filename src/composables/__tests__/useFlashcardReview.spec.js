import { expect, it } from 'vitest'
import { useFlashcardReview } from '../useFlashcardReview'

const cards = Array.from({ length: 5 }, (_, id) => ({
  id: String(id),
  front_text: `Q${id}`,
  back_text: `A${id}`,
}))

it('returns Again soon without resetting previously remembered cards', () => {
  const review = useFlashcardReview()
  review.start(cards)
  review.flipped.value = true
  review.rate('easy')
  review.flipped.value = true
  review.rate('again')
  expect(review.remembered.value).toEqual(['0'])
  expect(review.queue.value.map((card) => card.id)).toEqual(['2', '1', '3', '4'])
  expect(review.reviews.value).toBe(2)
})

it('places Hard later than Again without duplicating cards', () => {
  const review = useFlashcardReview()
  review.start(cards)
  review.flipped.value = true
  review.rate('hard')
  expect(review.queue.value.map((card) => card.id)).toEqual(['1', '2', '3', '0', '4'])
  expect(review.queue.value).toHaveLength(cards.length)
})

it('requires revealing an answer, completes after Easy ratings and supports a new revision', () => {
  const review = useFlashcardReview()
  review.start(cards)
  review.rate('easy')
  expect(review.remembered.value).toHaveLength(0)
  for (let i = 0; i < cards.length; i++) {
    review.flipped.value = true
    review.rate('easy')
  }
  expect(review.complete.value).toBe(true)
  expect(review.remembered.value).toHaveLength(5)
  review.start(cards)
  expect(review.complete.value).toBe(false)
  expect(review.remembered.value).toHaveLength(0)
})

it('handles an empty bank without claiming completion', () => {
  const review = useFlashcardReview()
  review.start([])
  expect(review.current.value).toBeNull()
  expect(review.complete.value).toBe(false)
})
