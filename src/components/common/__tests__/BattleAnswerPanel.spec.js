import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import BattleAnswerPanel from '../BattleAnswerPanel.vue'

const options = [{ id: 'a', text: 'First' }, { id: 'b', text: 'Second' }]
it('preserves single-choice locking by default for boss battles', async () => {
  const wrapper = mount(BattleAnswerPanel, { props: { options, selectedId: 'a' } })
  await wrapper.findAll('button')[1].trigger('click')
  expect(wrapper.findAll('button').every(button => button.attributes('disabled') !== undefined)).toBe(true)
  expect(wrapper.emitted('select')).toBeUndefined()
  wrapper.unmount()
})
it('allows quiz answer changes until disabled or graded', async () => {
  const wrapper = mount(BattleAnswerPanel, { props: { options, selectedId: 'a', allowAnswerChange: true } })
  await wrapper.findAll('button')[1].trigger('click')
  expect(wrapper.emitted('select')).toEqual([['b']])
  await wrapper.setProps({ disabled: true })
  await wrapper.findAll('button')[0].trigger('click')
  expect(wrapper.emitted('select')).toHaveLength(1)
  await wrapper.setProps({ disabled: false, graded: true })
  await wrapper.findAll('button')[1].trigger('click')
  expect(wrapper.emitted('select')).toHaveLength(1)
  wrapper.unmount()
})
