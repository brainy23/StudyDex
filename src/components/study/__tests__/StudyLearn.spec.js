import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, expect, it } from 'vitest'
import StudyLearn from '../StudyLearn.vue'
import { studyCatalogue, studyLesson } from '../../../test/studyFixtures'

let wrapper
afterEach(() => wrapper?.unmount())
function open({ topic = studyCatalogue.topics[0], lesson = studyLesson } = {}) {
  wrapper = mount(StudyLearn, {
    props: { topic, resource: { data: structuredClone(lesson), loading: false, error: null } },
  })
  return wrapper
}
const button = (name) => wrapper.findAll('button').find((item) => item.text() === name)

it('puts the full ordered roadmap after the goals and before Start Learning', () => {
  const lesson = structuredClone(studyLesson)
  lesson.concepts.reverse()
  open({ lesson })
  expect(wrapper.find('.study-overview .study-roadmap').exists()).toBe(true)
  expect(
    wrapper
      .findAll('.study-roadmap-list .study-roadmap-label > span:first-child')
      .map((item) => item.text()),
  ).toEqual(studyLesson.concepts.map((item) => item.title))
  const goals = wrapper.get('.study-goals').element
  const roadmap = wrapper.get('.study-roadmap').element
  expect(goals.compareDocumentPosition(roadmap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(
    roadmap.compareDocumentPosition(button('Start Learning').element) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
  expect(wrapper.emitted('progress')).toBeUndefined()
})

it('shows one compact roadmap above the explanation and exposes all names on demand', async () => {
  open()
  await button('Start Learning').trigger('click')
  expect(wrapper.findAll('nav[aria-label="Concept roadmap"]')).toHaveLength(1)
  expect(wrapper.find('.study-concept progress').exists()).toBe(false)
  expect(wrapper.find('.study-concept .study-roadmap').exists()).toBe(false)
  expect(wrapper.findAll('.study-roadmap-steps button')).toHaveLength(7)
  expect(wrapper.findAll('.study-roadmap-list button')).toHaveLength(0)
  const trigger = button('Show concept names ⌄')
  expect(trigger.attributes('aria-expanded')).toBe('false')
  await trigger.trigger('click')
  await flushPromises()
  expect(trigger.attributes('aria-expanded')).toBe('true')
  expect(wrapper.findAll('.study-roadmap-list button')).toHaveLength(7)
  expect(wrapper.get('.study-roadmap-names').attributes('id')).toBe(
    trigger.attributes('aria-controls'),
  )
  await wrapper.findAll('.study-roadmap-list button')[3].trigger('click')
  expect(wrapper.get('.study-concept h2').text()).toBe('Concept 4')
  expect(wrapper.emitted('progress')).toBeUndefined()
  expect(
    wrapper.get('.study-roadmap-steps [aria-current="step"]').attributes('aria-label'),
  ).toContain('Not read yet')
  await button('Hide concept names ⌄').trigger('click')
  await flushPromises()
  expect(wrapper.findAll('.study-roadmap-list button')).toHaveLength(0)
})

it('counts only acknowledged unique concepts after jumps, previous navigation and completion', async () => {
  open()
  await wrapper.findAll('.study-roadmap-list button')[4].trigger('click')
  expect(wrapper.emitted('progress')).toBeUndefined()
  await button('Next Concept').trigger('click')
  expect(wrapper.emitted('progress').at(-1)[0]).toEqual({ read: 1, total: 7 })
  await button('Previous Concept').trigger('click')
  await button('Next Concept').trigger('click')
  expect(wrapper.emitted('progress').at(-1)[0]).toEqual({ read: 1, total: 7 })
  await wrapper.findAll('.study-roadmap-steps button')[6].trigger('click')
  await button('Finish Topic').trigger('click')
  expect(wrapper.get('.study-completion').text()).toContain('2 of 7 concepts read')
  expect(wrapper.emitted('complete')).toEqual([['topic-1']])
  expect(wrapper.find('.study-roadmap').exists()).toBe(false)
  await button('Revisit Concepts').trigger('click')
  expect(wrapper.findAll('.study-roadmap-list button.is-read')).toHaveLength(2)
})

it('preserves educational text and line breaks while inserting the optional demo before the example', async () => {
  const lesson = structuredClone(studyLesson)
  lesson.concepts[0] = {
    ...lesson.concepts[0],
    title: 'what living things need',
    explanation_text: 'Living things need water.\nThey also need air and food.',
    example_text: 'A plant is given water.\nObserve its leaves over time.',
  }
  open({
    topic: { ...studyCatalogue.topics[0], name: 'Diversity of Living and Non-Living Things' },
    lesson,
  })
  await button('Start Learning').trigger('click')
  expect(wrapper.get('.study-concept h2').text()).toBe('What Living Things Need')
  expect(wrapper.get('.study-explanation').element.textContent).toBe(
    lesson.concepts[0].explanation_text,
  )
  expect(wrapper.get('.study-example .study-copy').element.textContent).toBe(
    lesson.concepts[0].example_text,
  )
  const demonstration = wrapper.get('.study-interactive').element
  expect(
    wrapper.get('.study-explanation').element.compareDocumentPosition(demonstration) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
  expect(
    demonstration.compareDocumentPosition(wrapper.get('.study-example').element) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
  expect(wrapper.find('input').exists()).toBe(false)
  await button('Next Concept').trigger('click')
  expect(wrapper.find('.study-interactive').exists()).toBe(false)
})
