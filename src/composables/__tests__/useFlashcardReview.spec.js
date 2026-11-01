import { expect, it } from 'vitest'
import { useFlashcardReview } from '../useFlashcardReview'
import { revisionCards } from '../../test/studyFixtures'

const cards = Array.from({ length: 5 }, (_, id) => ({
  id: String(id),
  front_text: `Q${id}`,
  back_text: `A${id}`,
}))

it('returns Practise Again soon without resetting previously remembered cards', () => {
  const review = useFlashcardReview()
  review.start(cards)
  review.flipped.value = true
  review.rate('remembered')
  review.flipped.value = true
  review.rate('practise')
  expect(review.remembered.value).toEqual(['0'])
  expect(review.queue.value.map((card) => card.id)).toEqual(['2', '1', '3', '4'])
  expect(review.reviews.value).toBe(2)
})

it('keeps duplicate source records out of the revision queue', () => {
  const review = useFlashcardReview()
  review.start([...cards, cards[0]])
  expect(review.queue.value).toHaveLength(cards.length)
  expect(review.cards.value).toHaveLength(cards.length)
  for (let index = 0; index < cards.length; index++) {
    review.flipped.value = true
    review.rate('remembered')
  }
  expect(review.remembered.value).toEqual(cards.map((card) => card.id))
  expect(review.complete.value).toBe(true)
})

it('requires revealing an answer, completes after remembering every card and supports a new revision', () => {
  const review = useFlashcardReview()
  review.start(cards)
  review.rate('remembered')
  expect(review.remembered.value).toHaveLength(0)
  for (let i = 0; i < cards.length; i++) {
    review.flipped.value = true
    review.rate('remembered')
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

function checkDeck(review, source = revisionCards) {
  const queued = review.queue.value.map((card) => card.id)
  const remembered = review.remembered.value
  expect(new Set(queued).size).toBe(queued.length)
  expect(new Set(remembered).size).toBe(remembered.length)
  expect([...queued, ...remembered].sort()).toEqual(source.map((card) => card.id).sort())
  expect(remembered.length).toBeLessThanOrEqual(source.length)
}

function rate(review, rating) {
  review.flipped.value = true
  review.rate(rating)
  checkDeck(review)
  expect(review.flipped.value).toBe(false)
}

it.each(['practise', 'remembered'])('handles %s on the first of 15 cards', (rating) => {
  const review = useFlashcardReview()
  review.start(revisionCards)
  rate(review, rating)
  expect(review.current.value.id).toBe(revisionCards[1].id)
  expect(review.remembered.value.length).toBe(rating === 'remembered' ? 1 : 0)
})

it.each(['practise'])('can rate the same card %s repeatedly without losing or duplicating it', (rating) => {
  const review = useFlashcardReview()
  review.start(revisionCards)
  const firstId = revisionCards[0].id
  for (let attempt = 0; attempt < 20; attempt++) {
    expect(review.current.value.id).toBe(firstId)
    rate(review, rating)
    while (review.current.value.id !== firstId) rate(review, 'remembered')
    expect(review.remembered.value).not.toContain(firstId)
  }
  expect(review.complete.value).toBe(false)
  expect(review.queue.value.map((card) => card.id)).toEqual([firstId])
  rate(review, 'remembered')
  expect(review.complete.value).toBe(true)
  expect(review.remembered.value).toHaveLength(15)
  expect(review.reviews.value).toBeGreaterThan(15)
})

it('preserves all 15 unique cards through mixed ratings, completes, and restarts in database order', () => {
  const review = useFlashcardReview()
  const original = structuredClone(revisionCards)
  review.start(revisionCards)
  const ratings = ['practise', 'remembered', 'practise', 'remembered']
  for (let index = 0; index < 120 && review.current.value; index++) {
    rate(review, ratings[index % ratings.length])
  }
  while (review.current.value) rate(review, 'remembered')
  expect(review.complete.value).toBe(true)
  expect(review.remembered.value).toHaveLength(15)
  const reviews = review.reviews.value
  review.rate('remembered')
  expect(review.reviews.value).toBe(reviews)
  review.start(review.cards.value)
  expect(review.queue.value).toEqual(original)
  expect(review.remembered.value).toEqual([])
  expect(review.reviews.value).toBe(0)
  expect(review.flipped.value).toBe(false)
  expect(review.complete.value).toBe(false)
  expect(revisionCards).toEqual(original)
})

it('ignores ratings until revealed and ignores unknown ratings', () => {
  const review = useFlashcardReview()
  review.start(revisionCards)
  for (const rating of ['practise', 'remembered']) review.rate(rating)
  review.flipped.value = true
  for (const rating of ['unknown', 'again', 'easy']) review.rate(rating)
  expect(review.reviews.value).toBe(0)
  expect(review.queue.value).toEqual(revisionCards)
  expect(review.remembered.value).toEqual([])
})
