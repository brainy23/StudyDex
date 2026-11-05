import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPokemonTransition } from '../usePokemonTransition'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

describe('reusable Pokémon loading transition', () => {
  let transition
  beforeEach(() => {
    vi.useFakeTimers()
    transition = createPokemonTransition({ prefersReducedMotion: () => false })
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('runs ordinary navigation without activating the animated overlay', async () => {
    const task = vi.fn().mockResolvedValue('subjects')
    await expect(transition.run({ task })).resolves.toBe('subjects')
    expect(task).toHaveBeenCalledExactlyOnceWith(expect.any(AbortSignal))
    expect(transition.state.active).toBe(false)
    expect(transition.state.phase).toBe('idle')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('waits for a painted host, runs the task once, and preserves its result', async () => {
    const task = vi.fn().mockResolvedValue('loaded')
    const result = transition.run({ animate: true, task, destination: 'Poké Lab' })
    expect(task).not.toHaveBeenCalled()
    expect(transition.state.phase).toBe('cover')
    expect(transition.presented(transition.state.sequence)).toBe(true)
    expect(transition.presented(transition.state.sequence)).toBe(false)
    await vi.advanceTimersByTimeAsync(350)
    expect(task).toHaveBeenCalledExactlyOnceWith(expect.any(AbortSignal))
    expect(transition.state.phase).toBe('loading')
    await vi.advanceTimersByTimeAsync(1150)
    expect(transition.state.phase).toBe('reveal')
    await vi.advanceTimersByTimeAsync(500)
    await expect(result).resolves.toBe('loaded')
    expect(transition.state.active).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps slow content covered after the minimum animation duration', async () => {
    const load = deferred()
    const result = transition.run({ animate: true, task: () => load.promise })
    transition.presented(transition.state.sequence)
    await vi.advanceTimersByTimeAsync(2500)
    expect(transition.state.phase).toBe('loading')
    load.resolve('ready')
    await vi.advanceTimersByTimeAsync(0)
    expect(transition.state.phase).toBe('reveal')
    await vi.advanceTimersByTimeAsync(500)
    await expect(result).resolves.toBe('ready')
  })

  it('runs a 2.5-second transition without changing the next default two-second transition', async () => {
    const longer = transition.run({ animate: true, task: async () => 'Lab', durationMs: 2500 })
    transition.presented(transition.state.sequence)
    expect(transition.state.durationScale).toBe(1.25)
    await vi.advanceTimersByTimeAsync(436)
    expect(transition.state.phase).toBe('cover')
    await vi.advanceTimersByTimeAsync(2)
    expect(transition.state.phase).toBe('loading')
    await vi.advanceTimersByTimeAsync(1437)
    expect(transition.state.phase).toBe('reveal')
    await vi.advanceTimersByTimeAsync(624)
    expect(transition.state.active).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    await expect(longer).resolves.toBe('Lab')

    const normal = transition.run({ animate: true, task: async () => 'Arena' })
    transition.presented(transition.state.sequence)
    expect(transition.state.durationScale).toBe(1)
    await vi.advanceTimersByTimeAsync(1999)
    expect(transition.state.active).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    await expect(normal).resolves.toBe('Arena')
  })

  it('skips animation while continuing to wait for the actual load', async () => {
    const load = deferred()
    const result = transition.run({ animate: true, task: () => load.promise })
    transition.presented(transition.state.sequence)
    transition.skipAnimation()
    await vi.advanceTimersByTimeAsync(2000)
    expect(transition.state.active).toBe(true)
    expect(transition.state.skipping).toBe(true)
    load.resolve()
    await vi.advanceTimersByTimeAsync(0)
    await result
    expect(transition.state.active).toBe(false)
  })

  it('can skip before presentation without starting the task early', async () => {
    const task = vi.fn().mockResolvedValue()
    const result = transition.run({ animate: true, task })
    transition.skipAnimation()
    expect(task).not.toHaveBeenCalled()
    transition.presented(transition.state.sequence)
    await vi.advanceTimersByTimeAsync(0)
    await result
    expect(transition.state.outcome).toBe('completed')
  })

  it('uses a static loader with no artificial delay for reduced motion', async () => {
    transition = createPokemonTransition({ prefersReducedMotion: () => true })
    const load = deferred()
    const result = transition.run({ animate: true, task: () => load.promise })
    transition.presented(transition.state.sequence)
    await vi.advanceTimersByTimeAsync(0)
    expect(transition.state.reducedMotion).toBe(true)
    expect(transition.state.active).toBe(true)
    load.resolve()
    await vi.advanceTimersByTimeAsync(0)
    await result
    expect(transition.state.active).toBe(false)
  })

  it('honours a motion preference change during the entrance', async () => {
    const result = transition.run({ animate: true, task: async () => 'ready' })
    transition.presented(transition.state.sequence)
    await vi.advanceTimersByTimeAsync(400)
    transition.reduceMotion()
    await expect(result).resolves.toBe('ready')
    expect(transition.state.reducedMotion).toBe(true)
  })

  it('propagates task failures, aborts its signal, and allows another attempt', async () => {
    let signal
    const error = new Error('Offline')
    const result = transition.run({ animate: true,
      task: (value) => {
        signal = value
        throw error
      },
    })
    const rejection = result.catch((error) => error)
    transition.presented(transition.state.sequence)
    await vi.advanceTimersByTimeAsync(0)
    expect(await rejection).toBe(error)
    expect(signal.aborted).toBe(true)
    expect(transition.state.active).toBe(false)
    expect(transition.state.error).toBe('Offline')
    const retry = transition.run({ animate: true, task: async () => 'retry' })
    transition.presented(transition.state.sequence)
    transition.skipAnimation()
    await vi.advanceTimersByTimeAsync(0)
    await expect(retry).resolves.toBe('retry')
  })

  it('refuses to run a task if no host acknowledges presentation', async () => {
    const task = vi.fn()
    const result = transition.run({ animate: true, task })
    const rejection = result.catch((error) => error)
    await vi.advanceTimersByTimeAsync(2000)
    expect(await rejection).toMatchObject({
      message: expect.stringContaining('loading screen could not open'),
    })
    expect(task).not.toHaveBeenCalled()
    expect(transition.state.active).toBe(false)
  })

  it('times out stuck loads and ignores late completion during a new attempt', async () => {
    const load = deferred()
    let signal
    const result = transition.run({ animate: true,
      task: (value) => {
        signal = value
        return load.promise
      },
    })
    const oldSequence = transition.state.sequence
    const rejection = result.catch((error) => error)
    transition.presented(oldSequence)
    await vi.advanceTimersByTimeAsync(15000)
    expect(await rejection).toMatchObject({ message: expect.stringContaining('taking too long') })
    expect(signal.aborted).toBe(true)
    const nextLoad = deferred()
    const next = transition.run({ animate: true, task: () => nextLoad.promise })
    expect(transition.presented(oldSequence)).toBe(false)
    transition.presented(transition.state.sequence)
    load.resolve('stale')
    await vi.advanceTimersByTimeAsync(0)
    expect(transition.state.active).toBe(true)
    nextLoad.resolve('current')
    transition.skipAnimation()
    await vi.advanceTimersByTimeAsync(0)
    await expect(next).resolves.toBe('current')
  })

  it('does not mistake the final reveal for a loading timeout', async () => {
    const load = deferred()
    const result = transition.run({ animate: true, task: () => load.promise })
    transition.presented(transition.state.sequence)
    await vi.advanceTimersByTimeAsync(14900)
    load.resolve()
    await vi.advanceTimersByTimeAsync(500)
    await expect(result).resolves.toBeUndefined()
    expect(transition.state.outcome).toBe('completed')
  })

  it('deduplicates rapid requests and cancels without running a second task', async () => {
    const load = deferred()
    const first = transition.run({ animate: true, task: () => load.promise, destination: 'Poké Lab' })
    const secondTask = vi.fn()
    const second = transition.run({ animate: true, task: secondTask, destination: 'Trainer House' })
    expect(second).toBe(first)
    expect(transition.state.destination).toBe('Poké Lab')
    const rejection = first.catch((error) => error)
    transition.cancel()
    expect(await rejection).toMatchObject({ name: 'AbortError' })
    expect(secondTask).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('requires a loading task', async () => {
    await expect(transition.run()).rejects.toThrow('loading task is required')
    expect(transition.state.active).toBe(false)
  })

  it('waits for rendered destination data after navigation completes, even when skipped', async () => {
    const result = transition.run({ animate: true, task: async () => 'navigated', waitFor: 'subjects' })
    const sequence = transition.state.sequence
    transition.presented(sequence)
    transition.skipAnimation()
    await vi.advanceTimersByTimeAsync(2000)
    expect(transition.state.active).toBe(true)
    transition.pageReady('other-page', sequence)
    transition.pageReady('subjects', sequence - 1)
    expect(transition.state.active).toBe(true)
    transition.pageReady('subjects', sequence)
    await expect(result).resolves.toBe('navigated')
  })

  it('accepts page readiness before the navigation promise settles', async () => {
    const navigation = deferred()
    const result = transition.run({ animate: true, task: () => navigation.promise, waitFor: 'subjects' })
    const sequence = transition.state.sequence
    transition.presented(sequence)
    transition.pageReady('subjects', sequence)
    transition.skipAnimation()
    expect(transition.state.active).toBe(true)
    navigation.resolve('navigated')
    await vi.advanceTimersByTimeAsync(0)
    await expect(result).resolves.toBe('navigated')
  })

  it('times out destination loading even when navigation succeeded', async () => {
    const result = transition.run({ animate: true, task: async () => {}, waitFor: 'subjects' })
    const rejection = result.catch((error) => error)
    transition.presented(transition.state.sequence)
    await vi.advanceTimersByTimeAsync(15000)
    expect(await rejection).toMatchObject({ message: expect.stringContaining('taking too long') })
    expect(transition.state.active).toBe(false)
  })

  it('releases the overlay when the destination is left during loading', async () => {
    const result = transition.run({ animate: true, task: async () => {}, waitFor: 'subjects' })
    const rejection = result.catch((error) => error)
    const sequence = transition.state.sequence
    transition.presented(sequence)
    transition.pageLeft('other-page', sequence)
    transition.pageLeft('subjects', sequence - 1)
    expect(transition.state.active).toBe(true)
    transition.pageLeft('subjects', sequence)
    expect(await rejection).toMatchObject({ name: 'AbortError' })
    expect(transition.state.active).toBe(false)
  })
})
