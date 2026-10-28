import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, expect, it } from 'vitest'
import InteractiveConcept from '../InteractiveConcept.vue'

const topic = { id: 'any-topic-id', name: 'Diversity of Living and Non-Living Things' }
const concept = { id: 'any-concept-id', title: 'What Living Things Need' }
let wrapper
afterEach(() => wrapper?.unmount())

it('lets students repeatedly compare water conditions without submitting answers or marking reading progress', async () => {
  wrapper = mount(InteractiveConcept, { props: { topic, concept } })
  const [enough, dry] = wrapper.findAll('button')
  expect(enough.attributes('aria-pressed')).toBe('true')
  expect(wrapper.get('[role="status"]').text()).toContain('firm and upright')
  for (let index = 0; index < 3; index++) {
    await dry.trigger('click')
    expect(dry.attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('.study-water-scene').classes()).toContain('is-dry')
    expect(wrapper.get('[role="status"]').text()).toContain('over time')
    await dry.trigger('click')
    expect(dry.attributes('aria-pressed')).toBe('true')
    await enough.trigger('click')
    expect(wrapper.get('.study-water-scene').classes()).not.toContain('is-dry')
    expect(wrapper.get('svg').attributes('aria-label')).toContain('healthy plant')
  }
  expect(wrapper.emitted('progress')).toBeUndefined()
  expect(wrapper.emitted('complete')).toBeUndefined()
  expect(wrapper.find('input, form').exists()).toBe(false)
  expect(wrapper.text()).toContain('Changes happen over time')
})

it('matches semantic topic/concept names without UUIDs and renders nothing for other lessons', async () => {
  wrapper = mount(InteractiveConcept, {
    props: {
      topic: { name: ' diversity of living and non–living things ' },
      concept: { title: 'what living things need' },
    },
  })
  expect(wrapper.find('section').exists()).toBe(true)
  await wrapper.setProps({ concept: { title: 'What Living Things Do' } })
  expect(wrapper.find('section').exists()).toBe(false)
  await wrapper.setProps({ topic: { name: 'Another Topic' }, concept })
  await flushPromises()
  expect(wrapper.find('section').exists()).toBe(false)
  expect(wrapper.find('button, svg').exists()).toBe(false)
})
