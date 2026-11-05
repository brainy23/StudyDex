export const names = { 4: 'charmander', 5: 'charmeleon', 6: 'charizard' }
const node = id => ({ species: { name: names[id], url: `https://poke.test/pokemon-species/${id}/` }, evolves_to: id < 6 ? [node(id + 1)] : [] })
export const transition = { from: 'charmander', to: 'charmeleon', direction: 'evolve' }
export const originalPokemon = { name: 'Charmander', xp: 190, level: 1 }
export const finalPokemon = { name: 'Charmeleon', xp: 20, level: 2 }
export function pokemonFetch(url) {
  const text = String(url)
  if (text.includes('/evolution-chain/')) return Promise.resolve({ ok: true, json: async () => ({ chain: node(4) }) })
  const slug = text.split('/').filter(Boolean).pop()
  const id = Number(Object.keys(names).find(id => names[id] === slug) || slug)
  if (!names[id]) throw new Error(`Unexpected fixture request: ${url}`)
  const data = text.includes('/pokemon-species/')
    ? { id, name: names[id], evolution_chain: { url: 'https://poke.test/evolution-chain/2/' } }
    : { id, name: names[id], sprites: {
      front_default: `/${names[id]}-front.png`, back_default: `/${names[id]}-back.png`,
      versions: { 'generation-v': { 'black-white': { animated: {
        front_default: `/${names[id]}-front.gif`, back_default: `/${names[id]}-back.gif`,
      } } } },
    } }
  return Promise.resolve({ ok: true, json: async () => data })
}
