import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import DeleteAccountPanel from '../DeleteAccountPanel.vue'
import { deleteOwnAccount } from '../../../services/accountDeletionService'

vi.mock('../../../services/accountDeletionService', () => ({ deleteOwnAccount: vi.fn() }))
let wrapper
beforeEach(() => {
  vi.resetAllMocks()
  deleteOwnAccount.mockResolvedValue({ deleted: true })
})
afterEach(() => wrapper?.unmount())
async function open() {
  wrapper = mount(DeleteAccountPanel, {
    props: { userId: 'student-a', email: 'fixture@example.invalid' },
  })
  await wrapper.get('.delete-account-card > button').trigger('click')
  await flushPromises()
}
it('requires both a password and typed confirmation; cancellation performs no deletion', async () => {
  await open()
  expect(wrapper.get('dialog').attributes('open')).toBeDefined()
  expect(wrapper.get('button[type="submit"]').element.disabled).toBe(true)
  await wrapper.get('#delete-password').setValue('synthetic-password')
  await wrapper.get('#delete-confirmation').setValue('delete')
  expect(wrapper.get('button[type="submit"]').element.disabled).toBe(true)
  await wrapper.get('.delete-actions button[type="button"]').trigger('click')
  expect(wrapper.get('dialog').attributes('open')).toBeUndefined()
  expect(wrapper.get('#delete-password').element.value).toBe('')
  expect(deleteOwnAccount).not.toHaveBeenCalled()
})
it('passes the displayed owner identity and clears the password during deletion', async () => {
  await open()
  await wrapper.get('#delete-password').setValue('synthetic-password')
  await wrapper.get('#delete-confirmation').setValue('DELETE')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(deleteOwnAccount).toHaveBeenCalledWith({
    password: 'synthetic-password',
    confirmation: 'DELETE',
    expectedUserId: 'student-a',
    requestMfaCode: expect.any(Function),
  })
  expect(wrapper.get('#delete-password').element.value).toBe('')
  expect(wrapper.emitted('deleted')).toEqual([[{ deleted: true }]])
})
it('prevents double submission and cancellation while deletion is in progress', async () => {
  let finish
  deleteOwnAccount.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  await open()
  await wrapper.get('#delete-password').setValue('synthetic-password')
  await wrapper.get('#delete-confirmation').setValue('DELETE')
  await wrapper.get('form').trigger('submit')
  await wrapper.get('form').trigger('submit')
  expect(deleteOwnAccount).toHaveBeenCalledTimes(1)
  expect(wrapper.get('.delete-actions button[type="button"]').element.disabled).toBe(true)
  const event = new Event('cancel', { cancelable: true })
  wrapper.get('dialog').element.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(true)
  finish({ deleted: true })
  await flushPromises()
})
it('shows failure with a fresh password required for retry', async () => {
  deleteOwnAccount.mockRejectedValue(new Error('Deletion was not confirmed'))
  await open()
  await wrapper.get('#delete-password').setValue('synthetic-password')
  await wrapper.get('#delete-confirmation').setValue('DELETE')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('not confirmed')
  expect(wrapper.get('#delete-password').element.value).toBe('')
  expect(wrapper.get('button[type="submit"]').element.disabled).toBe(true)
  expect(wrapper.emitted('deleted')).toBeUndefined()
})
it('collects an MFA code during the password-confirmed deletion flow', async () => {
  let code
  deleteOwnAccount.mockImplementation(async ({ requestMfaCode }) => {
    code = await requestMfaCode({ type:'totp', name:'Authenticator' })
    return { deleted:true }
  })
  await open()
  await wrapper.get('#delete-password').setValue('synthetic-password')
  await wrapper.get('#delete-confirmation').setValue('DELETE')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  await wrapper.get('#delete-mfa-code').setValue('123456')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(code).toBe('123456')
  expect(wrapper.emitted('deleted')).toEqual([[{ deleted:true }]])
})
