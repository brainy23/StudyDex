import { expect, it } from 'vitest'
import { isBuddySleepTime, sleepRouteGuard } from '../buddySleep'

it.each([
  ['2026-11-05T15:59:59Z', false], // 23:59:59 SGT
  ['2026-11-05T16:00:00Z', true],  // midnight
  ['2026-11-05T22:59:59Z', true],  // 06:59:59
  ['2026-11-05T23:00:00Z', false], // 07:00
  ['2026-11-06T04:00:00Z', false], // noon
])('uses real Singapore time at %s (sleeping: %s)', (date, sleeping) => {
  expect(isBuddySleepTime(new Date(date))).toBe(sleeping)
})
it('keeps non-learning pages available', () => {
  for (const name of ['home', 'login', 'studentdashboard', 'account', 'trainer', 'collection']) {
    expect(sleepRouteGuard({ name })).toBe(true)
  }
})
