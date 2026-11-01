import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import StudyFlashcards from '../StudyFlashcards.vue'
import { revisionCards } from '../../../test/studyFixtures'

const cards = [
  {
    id: 'a',
    front_text: 'Question A',
    back_text: 'Answer A',
    front_image_path: '/assets/male.png',
  },
  { id: 'b', front_text: 'Question B', back_text: 'Answer B' },
]
const button = (wrapper, text) => wrapper.findAll('button').find((item) => item.text() === text)

it('hides recall controls until revealed and keeps remembered cards when Practise Again is used', async () => {
  const wrapper = mount(StudyFlashcards, {
    props: { resource: { loading: false, error: null, data: cards } },
  })
  expect(wrapper.find('.study-ratings').exists()).toBe(false)
  await wrapper.get('.study-flip-card').trigger('click')
  expect(wrapper.get('.study-ratings').findAll('button').map((item) => item.text())).toEqual(['I Remembered', 'Practise Again', 'Hard'])
  await button(wrapper, 'I Remembered').trigger('click')
  expect(wrapper.get('.study-review-progress').text()).toContain('1 / 2 remembered')
  expect(wrapper.get('.study-card-front').text()).toContain('Question B')
  await wrapper.get('.study-flip-card').trigger('click')
  await button(wrapper, 'Practise Again').trigger('click')
  expect(wrapper.get('.study-review-progress').text()).toContain('1 / 2 remembered')
  await wrapper.get('.study-flip-card').trigger('click')
  await button(wrapper, 'I Remembered').trigger('click')
  expect(wrapper.get('.study-completion').text()).toContain('2 unique cards remembered · 3 total review attempts')
  await button(wrapper, 'Restart Deck').trigger('click')
  expect(wrapper.get('.study-review-progress').text()).toContain('0 / 2 remembered')
  wrapper.unmount()
})

it('flips matching front/back content both ways and resets the next card to its question', async () => {
  const wrapper = mount(StudyFlashcards, {
    props: { resource: { loading: false, error: null, data: revisionCards } },
  })
  expect(wrapper.get('.study-card-position').text()).toBe('Card 1 of 15')
  expect(wrapper.get('.study-card-front').attributes('aria-hidden')).toBe('false')
  expect(wrapper.get('.study-card-front .study-card-text').text()).toBe(revisionCards[0].front_text)
  expect(wrapper.get('.study-card-back .study-card-text').text()).toBe(revisionCards[0].back_text)
  expect(wrapper.get('.study-flip-card').element.tagName).toBe('BUTTON')
  await wrapper.get('.study-flip-card').trigger('click')
  expect(wrapper.get('.study-flip-card').attributes('aria-pressed')).toBe('true')
  expect(wrapper.get('.study-card-back').attributes('aria-hidden')).toBe('false')
  await wrapper.get('.study-flip-card').trigger('click')
  expect(wrapper.get('.study-flip-card').attributes('aria-pressed')).toBe('false')
  await wrapper.get('.study-flip-card').trigger('click')
  await button(wrapper, 'Practise Again').trigger('click')
  expect(wrapper.get('.study-card-position').text()).toBe('Card 2 of 15')
  expect(wrapper.get('.study-flip-card').attributes('aria-pressed')).toBe('false')
  expect(wrapper.get('.study-card-front .study-card-text').text()).toBe(revisionCards[1].front_text)
  expect(wrapper.find('.study-ratings').exists()).toBe(false)
  wrapper.unmount()
})

it('reviews 15 mapped cards, shows unique progress and completion, and restarts the complete deck', async () => {
  const wrapper = mount(StudyFlashcards, {
    props: { resource: { loading: false, error: null, data: revisionCards } },
  })
  for (let index = 0; index < 15; index++) {
    expect(wrapper.get('.study-review-progress').text()).toContain(`${index} / 15 remembered`)
    expect(wrapper.get('.study-review-progress').text()).toContain(`${15 - index} still to review`)
    expect(wrapper.get('.study-card-position').text()).toBe(`Card ${index + 1} of 15`)
    expect(wrapper.get('.study-card-front .study-card-text').text()).toBe(revisionCards[index].front_text)
    expect(wrapper.get('.study-card-back .study-card-text').text()).toBe(revisionCards[index].back_text)
    await wrapper.get('.study-flip-card').trigger('click')
    await button(wrapper, 'I Remembered').trigger('click')
  }
  expect(wrapper.get('.study-completion').text()).toContain('15 unique cards remembered · 15 total review attempts')
  expect(wrapper.get('.study-completion h3').text()).toBe('Flashcards Completed!')
  await button(wrapper, 'Revise Another Topic').trigger('click')
  expect(wrapper.emitted('topics')).toEqual([[]])
  await button(wrapper, 'Go to Poké Arena').trigger('click')
  expect(wrapper.emitted('arena')).toEqual([[]])
  expect(wrapper.find('.study-flip-card').exists()).toBe(false)
  await button(wrapper, 'Restart Deck').trigger('click')
  expect(wrapper.get('.study-review-progress').text()).toContain('0 / 15 remembered')
  expect(wrapper.get('.study-review-progress').text()).toContain('15 still to review')
  expect(wrapper.get('.study-card-position').text()).toBe('Card 1 of 15')
  expect(wrapper.get('.study-flip-card').attributes('aria-pressed')).toBe('false')
  wrapper.unmount()
})

it('shows loading, network error and retry states without displaying old cards', async () => {
  const wrapper = mount(StudyFlashcards, {
    props: { resource: { loading: true, error: null, data: revisionCards } },
  })
  expect(wrapper.get('[role="status"]').text()).toBe('Loading flashcards…')
  expect(wrapper.find('.study-flip-card').exists()).toBe(false)
  await wrapper.setProps({ resource: { loading: false, data: null, error: new Error('Network unavailable') } })
  expect(wrapper.get('[role="alert"]').text()).toContain('Network unavailable')
  expect(wrapper.find('.study-flip-card').exists()).toBe(false)
  await button(wrapper, 'Try again').trigger('click')
  expect(wrapper.emitted('retry')).toHaveLength(1)
  await wrapper.setProps({ resource: { loading: false, error: null, data: [] } })
  expect(wrapper.find('.study-empty').exists()).toBe(true)
  expect(wrapper.find('.study-completion').exists()).toBe(false)
  await button(wrapper, 'Back to Learn').trigger('click')
  expect(wrapper.emitted('mode')).toEqual([['learn']])
  wrapper.unmount()
})

it('supports separate front/back images, absent images, and image-load failures', async () => {
  const wrapper = mount(StudyFlashcards, {
    props: { resource: { loading: false, error: null, data: [{
      ...revisionCards[0],
      front_image_path: '/assets/question.png',
      back_image_path: 'https://example.com/answer.png',
    }, revisionCards[1]] } },
  })
  expect(wrapper.get('.study-card-front img').attributes('src')).toBe('/assets/question.png')
  expect(wrapper.get('.study-card-back img').attributes('src')).toBe('https://example.com/answer.png')
  await wrapper.get('.study-card-back img').trigger('error')
  expect(wrapper.get('.study-card-back').text()).toContain('This illustration is unavailable')
  await wrapper.get('.study-flip-card').trigger('click')
  await button(wrapper, 'I Remembered').trigger('click')
  expect(wrapper.findAll('.study-content-image')).toHaveLength(0)
  expect(wrapper.text()).not.toContain('This illustration is unavailable')
  wrapper.unmount()
})

it('displays optional images and explains unavailable illustrations', async () => {
  const wrapper = mount(StudyFlashcards, {
    props: { resource: { loading: false, error: null, data: cards } },
  })
  expect(wrapper.get('.study-content-image').attributes('src')).toBe('/assets/male.png')
  await wrapper.get('.study-content-image').trigger('error')
  expect(wrapper.text()).toContain('This illustration is unavailable')
  wrapper.unmount()
})

it('distinguishes an empty bank from a permission failure', async () => {
  const wrapper = mount(StudyFlashcards, {
    props: { resource: { loading: false, error: null, data: [] } },
  })
  expect(wrapper.text()).toContain('There are no flashcards for this topic yet')
  await wrapper.setProps({ resource: { loading: false, error: { code: '42501' }, data: null } })
  expect(wrapper.get('[role="alert"]').text()).toContain('does not have permission')
  expect(wrapper.find('.study-empty').exists()).toBe(false)
  wrapper.unmount()
})
