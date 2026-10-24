import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import StudyFlashcards from '../StudyFlashcards.vue'

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

it('requires a flip and keeps remembered cards when Again is used, then shows a completion summary', async () => {
  const wrapper = mount(StudyFlashcards, {
    props: { resource: { loading: false, error: null, data: cards } },
  })
  expect(button(wrapper, 'Easy').attributes('disabled')).toBeDefined()
  await wrapper.get('.study-flip-card').trigger('click')
  await button(wrapper, 'Easy').trigger('click')
  expect(wrapper.get('.study-review-progress').text()).toContain('1 / 2 remembered')
  expect(wrapper.get('.study-card-front').text()).toContain('Question B')
  await wrapper.get('.study-flip-card').trigger('click')
  await button(wrapper, 'Again').trigger('click')
  expect(wrapper.get('.study-review-progress').text()).toContain('1 / 2 remembered')
  await wrapper.get('.study-flip-card').trigger('click')
  await button(wrapper, 'Easy').trigger('click')
  expect(wrapper.get('.study-completion').text()).toContain('2 cards after 3 reviews')
  await button(wrapper, 'Start new revision').trigger('click')
  expect(wrapper.get('.study-review-progress').text()).toContain('0 / 2 remembered')
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
