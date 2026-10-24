import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createStudyTimer, singaporeDay } from '../useTimer'

let timers
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-23T02:00:00Z'))
  localStorage.clear()
  timers = []
})
afterEach(() => {
  timers.forEach((timer) => timer.dispose())
  vi.useRealTimers()
})
function makeTimer(options = {}) {
  const timer = createStudyTimer({ storage: localStorage, ...options })
  timers.push(timer)
  timer.bindUser('ash')
  return timer
}

it('does not auto-start, pauses/resumes without resetting, and ends without awarding completion', () => {
  const timer = makeTimer()
  expect(timer.display.value).toBe('25:00')
  vi.advanceTimersByTime(60000)
  expect(timer.display.value).toBe('25:00')
  timer.startSession('topic-1')
  vi.advanceTimersByTime(10000)
  timer.pause()
  expect(timer.display.value).toBe('24:50')
  vi.advanceTimersByTime(60000)
  expect(timer.display.value).toBe('24:50')
  timer.resume()
  vi.advanceTimersByTime(5000)
  expect(timer.display.value).toBe('24:45')
  timer.endSession()
  expect(timer.state.status).toBe('idle')
  expect(timer.dailyCompleted.value).toBe(0)
})

it('uses a deadline even if interval callbacks are throttled, and offers a manual five-minute break', () => {
  const timer = makeTimer({ schedule: () => 1, cancel: () => {} })
  timer.startSession()
  vi.setSystemTime(new Date(Date.now() + 25 * 60000))
  timer.sync()
  timer.sync()
  expect(timer.dailyCompleted.value).toBe(1)
  expect(timer.state.status).toBe('complete')
  timer.startBreak()
  expect(timer.display.value).toBe('05:00')
  vi.setSystemTime(new Date(Date.now() + 5 * 60000))
  timer.sync()
  expect(timer.dailyCompleted.value).toBe(1)
  expect(timer.state.phase).toBe('break')
})

it('recovers interrupted sessions paused after refresh without crediting offline completion', () => {
  const original = makeTimer()
  original.startSession('topic-1')
  vi.advanceTimersByTime(10000)
  original.dispose()
  vi.setSystemTime(new Date(Date.now() + 30 * 60000))
  const recovered = makeTimer()
  expect(recovered.state.status).toBe('paused')
  expect(recovered.state.notice).toContain('recovered')
  expect(recovered.dailyCompleted.value).toBe(0)
  expect(recovered.secondsLeft.value).toBeGreaterThan(0)
})

it('keeps recovery and completion counts separate for different users', () => {
  const timer = makeTimer()
  timer.startSession()
  vi.advanceTimersByTime(10000)
  timer.pause()
  timer.bindUser('misty')
  expect(timer.state.status).toBe('idle')
  expect(timer.display.value).toBe('25:00')
  timer.bindUser('ash')
  expect(timer.state.status).toBe('paused')
  expect(timer.display.value).toBe('24:50')
})

it('counts the completion date in Singapore even if the next tick occurs after midnight', () => {
  vi.setSystemTime(new Date('2026-10-23T15:34:00Z'))
  const timer = makeTimer({ schedule: () => 1, cancel: () => {} })
  timer.startSession()
  vi.setSystemTime(new Date('2026-10-23T16:01:00Z'))
  timer.sync()
  expect(singaporeDay(timer.state.completions[0])).toBe('2026-10-23')
  expect(timer.dailyCompleted.value).toBe(0)
})

it('does not prevent studying beyond four local blocks or create XP data', () => {
  const timer = makeTimer({ focusSeconds: 1 })
  for (let i = 0; i < 5; i++) {
    timer.startSession()
    vi.advanceTimersByTime(1000)
    timer.endSession()
  }
  expect(timer.dailyCompleted.value).toBe(5)
  expect(timer.state).not.toHaveProperty('xp')
})

it('handles corrupted recovery data and unavailable browser storage', () => {
  localStorage.setItem('studydex:focus:v1:ash', '{broken')
  const timer = makeTimer()
  expect(timer.state.status).toBe('idle')
  expect(timer.state.notice).toContain('could not be recovered')
  const unavailable = makeTimer({
    storage: {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked')
      },
    },
  })
  unavailable.startSession()
  expect(unavailable.state.status).toBe('running')
  expect(unavailable.state.notice).toContain('could not save')
})
