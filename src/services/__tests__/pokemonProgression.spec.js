import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { planPokemonXp } from '../pokemonProgression'
import { pokemonFetch, originalPokemon } from '../../test/pokemonFixtures'

beforeEach(() => vi.stubGlobal('fetch', vi.fn(pokemonFetch)))
afterEach(() => vi.unstubAllGlobals())

it('evolves at 200 XP, carries the remainder, and leaves the original unchanged', async () => {
  const buddy = { ...originalPokemon, ownedId: 'owned-uuid' }
  const plan = await planPokemonXp(buddy, { delta: 30 })
  expect(plan.result).toMatchObject({ name: 'Charmeleon', id: 5, ownedId: 'owned-uuid', xp: 20, level: 2 })
  expect(plan.evolutions).toMatchObject([{ from: 'charmander', to: 'charmeleon', direction: 'evolve' }])
  expect(buddy).toEqual({ ...originalPokemon, ownedId: 'owned-uuid' })
})

it('devolves before clamping a negative XP balance', async () => {
  const plan = await planPokemonXp({ name: 'Charmeleon', xp: 5, level: 2 }, { delta: -10 })
  expect(plan.result).toMatchObject({ name: 'Charmander', xp: 195, level: 1 })
  expect(plan.devolved).toBe(true)
  expect(plan.appliedDelta).toBe(-10)
})

it('clamps deductions only at the base form and marks it defeated', async () => {
  const plan = await planPokemonXp({ name: 'Charmander', xp: 5, level: 1 }, -10)
  expect(plan.result).toMatchObject({ name: 'Charmander', xp: 0, level: 1, is_defeated: true })
  expect(plan.appliedDelta).toBe(-5)
  expect(plan.evolutions).toEqual([])
})

it('handles multiple evolutions and retains overflow at the final form', async () => {
  const plan = await planPokemonXp(originalPokemon, 430)
  expect(plan.result).toMatchObject({ name: 'Charizard', xp: 200, level: 3, evolution_stage: 'MAX' })
  expect(plan.evolutions).toHaveLength(2)
  expect(plan.overflowXP).toBe(20)
})

it('keeps the same form below the threshold', async () => {
  const plan = await planPokemonXp(originalPokemon, 5)
  expect(plan.result).toMatchObject({ name: 'Charmander', xp: 195, level: 1 })
  expect(plan.evolutions).toEqual([])
})

it('rejects invalid XP and propagates API failures before any save', async () => {
  await expect(planPokemonXp(originalPokemon, 1.5)).rejects.toThrow('Invalid Pokémon XP')
  fetch.mockResolvedValue({ ok: false, status: 503 })
  await expect(planPokemonXp(originalPokemon, 5)).rejects.toThrow('503')
})

it('keeps Gen 1 base forms from devolving into unsupported baby Pokémon', async () => {
  fetch.mockImplementation(async url => {
    if (String(url).includes('/pokemon-species/pikachu/')) return { ok: true, json: async () => ({
      id: 25, name: 'pikachu', evolution_chain: { url: 'https://poke.test/evolution-chain/10/' },
    }) }
    if (String(url).includes('/evolution-chain/10/')) return { ok: true, json: async () => ({ chain: {
      species: { name: 'pichu', url: 'https://poke.test/pokemon-species/172/' },
      evolves_to: [{ species: { name: 'pikachu', url: 'https://poke.test/pokemon-species/25/' }, evolves_to: [] }],
    } }) }
    if (String(url).includes('/pokemon/pikachu/')) return { ok: true, json: async () => ({
      id: 25, name: 'pikachu', sprites: { front_default: '/pikachu.png' },
    }) }
    throw new Error(`Unexpected fixture: ${url}`)
  })
  const plan = await planPokemonXp({ name: 'Pikachu', xp: 5, level: 1 }, -10)
  expect(plan.result).toMatchObject({ name: 'Pikachu', xp: 0, is_defeated: true })
  expect(plan.evolutions).toEqual([])
})
