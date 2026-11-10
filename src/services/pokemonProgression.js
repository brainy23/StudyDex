// Shared frontend progression rules used by PokeSprite and saved activity rewards.
const API = (import.meta.env?.VITE_POKE_API_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '')
const evolutionCache = new Map()

export function normaliseName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/♀/g, '-f')
    .replace(/♂/g, '-m')
    .replace(/[.'’]/g, '')
    .replace(/\s+/g, '-')
}

export function capitalise(value) {
  return String(value ?? '')
    .split('-')
    .map(part =>
      part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(' ')
}

function getSpeciesId(url) {
  return Number(
    url.split('/').filter(Boolean).pop()
  )
}

async function requestJson(url, signal) {
  const response = await fetch(url, { signal })

  if (!response.ok) {
    throw new Error(
      `PokéAPI request failed (${response.status}).`
    )
  }

  return response.json()
}

export async function getEvolutionOptions(name) {
  const slug = normaliseName(name)

  if (evolutionCache.has(slug)) {
    return evolutionCache.get(slug)
  }

  const species = await requestJson(
    `${API}/pokemon-species/${encodeURIComponent(slug)}/`
  )

  if (!species.evolution_chain?.url) {
    return {
      currentId: species.id,
      previous: null,
      next: []
    }
  }

  const evolution = await requestJson(
    species.evolution_chain.url
  )

  function find(node, previous = null) {
    if (node.species.name === species.name) {
      return {
        currentId: species.id,

        previous: previous && getSpeciesId(previous.url) <= 151
          ? {
              name: previous.name,
              id: getSpeciesId(previous.url)
            }
          : null,

        // Preserve the original Gen 1 restriction.
        next: node.evolves_to
          .map(child => ({
            name: child.species.name,
            id: getSpeciesId(child.species.url)
          }))
          .filter(child =>
            child.id >= 1 && child.id <= 151
          )
      }
    }

    for (const child of node.evolves_to) {
      const result = find(child, node.species)

      if (result) return result
    }

    return null
  }

  const result = find(evolution.chain)

  if (!result) {
    throw new Error(
      'Evolution information unavailable.'
    )
  }

  evolutionCache.set(slug, result)

  return result
}

export async function planPokemonXp(pokemon, options = {}, maxXp = 200) {
  const input = typeof options === 'number'
    ? { delta: options }
    : options

  if (!pokemon) {
    throw new Error('No active Pokémon.')
  }

  const originalName = normaliseName(pokemon.name || pokemon.pokemon?.name)

  if (!originalName) {
    throw new Error('Pokémon name is missing.')
  }

  const initialXP = Number(
    input.xp ?? pokemon.xp ?? 0
  )

  const initialLevel = Number(
    input.level ?? pokemon.level ?? 1
  )

  const delta = Number(input.delta ?? 0)

  if (
    !Number.isSafeInteger(initialXP) ||
    !Number.isSafeInteger(initialLevel) ||
    !Number.isSafeInteger(delta) ||
    !Number.isSafeInteger(maxXp) ||
    initialXP < 0 ||
    initialLevel < 1 ||
    maxXp <= 0
  ) {
    throw new Error('Invalid Pokémon XP values.')
  }

  let currentName = originalName
  let remainingXP = initialXP + delta
  let level = initialLevel

  let stage = Math.max(
    level - 1,
    typeof pokemon.evolution_stage === 'number'
      ? pokemon.evolution_stage
      : 0
  )

  let isMaxEvolution = Boolean(
    input.isMaxEvolution ??
    pokemon.is_max_evolution ??
    pokemon.isMaxEvolution ??
    (pokemon.evolution_stage === 'MAX')
  )

  let isDefeated = Boolean(
    input.isDefeated ??
    pokemon.is_defeated ??
    pokemon.isDefeated ??
    false
  )

  let overflowXP = 0
  let reachedMaxEvolution = false

  const evolutions = []

  if (delta > 0) {
    isDefeated = false
  }

  // Already MAX: further positive XP becomes overflow.
  if (isMaxEvolution && remainingXP >= maxXp) {
    overflowXP = remainingXP - maxXp
    remainingXP = maxXp
  } else {
    if (remainingXP < maxXp) {
      isMaxEvolution = false
    }

    // ======================================
    // EVOLUTION
    // ======================================

    let steps = 0

    while (remainingXP >= maxXp) {
      if (++steps > 20) {
        throw new Error('Evolution chain too long.')
      }

      const options =
        await getEvolutionOptions(currentName)

      if (!options.next.length) {
        // No supported next form.
        overflowXP = remainingXP - maxXp
        remainingXP = maxXp

        reachedMaxEvolution = !isMaxEvolution
        isMaxEvolution = true

        break
      }

      // Preserve random branching evolution,
      // e.g. Eevee.
      const next =
        options.next[
          Math.floor(Math.random() * options.next.length)
        ]

      evolutions.push({
        from: currentName,
        to: next.name,
        direction: 'evolve',
        fromPokeapiId: options.currentId,
        toPokeapiId: next.id
      })

      currentName = next.name
      level += 1
      stage += 1
      remainingXP -= maxXp

      isMaxEvolution = false
    }

    // ======================================
    // DEVOLUTION
    // ======================================

    steps = 0

    while (remainingXP < 0) {
      if (++steps > 20) {
        throw new Error('Devolution chain too long.')
      }

      const options =
        await getEvolutionOptions(currentName)

      if (!options.previous) {
        remainingXP = 0
        isDefeated = true
        break
      }

      const previous = options.previous

      evolutions.push({
        from: currentName,
        to: previous.name,
        direction: 'devolve',
        fromPokeapiId: options.currentId,
        toPokeapiId: previous.id
      })

      currentName = previous.name
      level = Math.max(1, level - 1)
      stage = Math.max(0, stage - 1)
      remainingXP += maxXp

      isMaxEvolution = false
    }
  }

  // Fetch the final form's ID and front-facing
  // images for Trainer House.
  const finalPokemon = await requestJson(
    `${API}/pokemon/${encodeURIComponent(currentName)}/`
  )

  const staticImage =
    finalPokemon.sprites?.front_default || ''

  const animatedImage =
    finalPokemon.sprites?.versions
      ?.['generation-v']
      ?.['black-white']
      ?.animated
      ?.front_default ||
    staticImage

  const appliedDelta = delta >= 0
    ? delta - overflowXP
    : Math.max(
        delta,
        -((initialLevel - 1) * maxXp + initialXP)
      )

  const result = {
    ...pokemon,

    // PokeAPI species ID.
    // Supabase pokemon_id remains a UUID and must
    // be resolved separately when saving.
    id: finalPokemon.id,
    pokeapiId: finalPokemon.id,

    name: capitalise(finalPokemon.name),
    xp: remainingXP,
    level,

    evolution_stage: isMaxEvolution ? 'MAX' : stage,
    stageBeforeMax: isMaxEvolution ? stage : undefined,

    isDefeated,
    is_defeated: isDefeated,

    isMaxEvolution,
    is_max_evolution: isMaxEvolution,

    static_img: staticImage,
    animated_img: animatedImage
  }

  return {
    ...result,
    result,

    evolutions,
    transitions: evolutions,

    delta,
    appliedDelta,

    overflow: overflowXP,
    overflowXP,

    reachedMaxEvolution,

    evolved: evolutions.some(
      item => item.direction === 'evolve'
    ),

    devolved: evolutions.some(
      item => item.direction === 'devolve'
    )
  }
}
