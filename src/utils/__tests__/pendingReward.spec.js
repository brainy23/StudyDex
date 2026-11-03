import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { rememberPendingReward, readPendingReward, clearPendingReward } from '../pendingReward'
const pack = '11111111-1111-4111-8111-111111111111'
beforeEach(() => sessionStorage.clear())
afterEach(() => vi.restoreAllMocks())
it('keeps pending receipt identifiers isolated by account', () => {
  rememberPendingReward('first', pack)
  expect(readPendingReward('first')).toBe(pack)
  expect(readPendingReward('second')).toBe(null)
  clearPendingReward('first', 'another-pack')
  expect(readPendingReward('first')).toBe(pack)
  clearPendingReward('first', pack)
  expect(readPendingReward('first')).toBe(null)
})
it('does not trust a malformed cached identifier', () => {
  sessionStorage.setItem('studydex:pending-pack:v1:first', '<bad-id>')
  expect(readPendingReward('first')).toBe(null)
})
it('keeps current-page retry available when browser storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  rememberPendingReward('blocked', pack)
  expect(readPendingReward('blocked')).toBe(pack)
  clearPendingReward('blocked', pack)
  expect(readPendingReward('blocked')).toBe(null)
})
