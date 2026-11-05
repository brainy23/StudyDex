<script setup>
import axios from 'axios'
import { computed, onBeforeUnmount, ref } from 'vue'
import playSound from '../../../scripts/soundEffect'


const props = defineProps({
  activePokemon: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'update-pokemon',
  'xp-overflow'
])

const API = 'https://pokeapi.co/api/v2'
const MAX_XP = 100

// Component state
const busy = ref(false)
const phase = ref('idle')
const isDevolving = ref(false)
const animatedPokemon = ref(null)
const message = ref('')
const error = ref('')
const xpFloat = ref(null)
let xpFloatId = 0

let disposed = false
let finishWait = null

// Cache requests while this component is mounted.
const requestCache = new Map()

const displayedPokemon = computed(() =>
  animatedPokemon.value || props.activePokemon
)

const sprite = computed(() =>
  displayedPokemon.value?.animated_img ||
  displayedPokemon.value?.static_img ||
  ''
)

const isAnimating = computed(() => phase.value !== 'idle')

const isMaxed = computed(() =>
  displayedPokemon.value?.evolution_stage === 'MAX'
)

// Keep stored level numeric; MAX is a presentation label only.
const displayedLevel = computed(() =>
  isMaxed.value ? 'MAX' : numericStage(displayedPokemon.value) + 1
)

const xpPercentage = computed(() =>
  Math.min(
    100,
    Math.max(
      0,
      (displayedPokemon.value?.xp ?? 0) / MAX_XP * 100
    )
  )
)

// =========================================
// HELPERS
// =========================================

function capitalise(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function numericStage(pokemon) {
  return pokemon.evolution_stage === 'MAX'
    ? (pokemon.stageBeforeMax ?? 0)
    : (pokemon.evolution_stage ?? 0)
}

function wait(milliseconds) {
  return new Promise(resolve => {
    const timer = setTimeout(finish, milliseconds)

    function finish() {
      clearTimeout(timer)
      finishWait = null
      resolve()
    }

    finishWait = finish
  })
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

async function request(url) {
  if (!requestCache.has(url)) {
    const promise = axios.get(url, { timeout: 15000 })
      .then(response => response.data)
      .catch(cause => {
        requestCache.delete(url)
        throw cause
      })

    requestCache.set(url, promise)
  }

  return requestCache.get(url)
}

// =========================================
// EVOLUTION INFORMATION
// =========================================

async function getEvolutionOptions(pokemonId) {
  const species = await request(
    `${API}/pokemon-species/${pokemonId}/`
  )

  if (!species.evolution_chain?.url) {
    return { previous: null, next: [] }
  }

  const evolution = await request(species.evolution_chain.url)

  function find(node, previous = null) {
    if (node.species.name === species.name) {
      return {
        previous,

        // Preserve your Gen 1 evolution restriction.
        next: node.evolves_to
          .filter(child => {
            const id = Number(
              child.species.url.split('/').filter(Boolean).pop()
            )

            return id >= 1 && id <= 151
          })
          .map(child => child.species.name)
      }
    }

    for (const child of node.evolves_to) {
      const result = find(child, node.species.name)

      if (result) return result
    }

    return null
  }

  const result = find(evolution.chain)

  if (!result) {
    throw new Error('Evolution information unavailable.')
  }

  return result
}

async function getNextForm(name, currentPokemon, direction) {
  const data = await request(
    `${API}/pokemon/${name.toLowerCase()}/`
  )

  const staticImage = data.sprites.front_default || ''

  return {
    ...currentPokemon,

    // Only the current form changes.
    // Original species and ownership fields are preserved.
    id: data.id,
    name: capitalise(data.name),
    evolution_stage: Math.max(
      0,
      numericStage(currentPokemon) + direction
    ),
    level: Math.max(0, numericStage(currentPokemon) + direction) + 1,
    stageBeforeMax: undefined,

    animated_img:
      data.sprites.versions?.['generation-v']?.['black-white']
        ?.animated?.front_default || staticImage,

    static_img: staticImage
  }
}

// =========================================
// PLAN THE XP CHANGE
// Fetch everything before changing user data.
// =========================================

async function prepareXPChange(pokemon, amount) {
  let result = { ...pokemon, level: numericStage(pokemon) + 1 }
  let remainingXP = result.xp + amount
  let overflow = 0

  const transitions = []

  if (amount > 0) {
    result.isDefeated = false

    // A previously verified MAX Pokémon needs no new API lookup.
    if (result.evolution_stage === 'MAX') {
      return {
        result: { ...result, xp: MAX_XP },
        transitions,
        overflow: amount
      }
    }

    while (remainingXP >= MAX_XP) {
      const options = await getEvolutionOptions(result.id)

      // Final form: fill its bar and preserve the excess.
      if (!options.next.length) {
        result.stageBeforeMax = numericStage(result)
        result.evolution_stage = 'MAX'

        overflow = remainingXP - MAX_XP
        remainingXP = MAX_XP
        break
      }

      const name = options.next[
        Math.floor(Math.random() * options.next.length)
      ]

      const nextForm = await getNextForm(name, result, 1)

      transitions.push({
        previous: { ...result, xp: MAX_XP },
        next: { ...nextForm, xp: 0 },
        direction: 1
      })

      result = nextForm
      remainingXP -= MAX_XP
    }
  } else {
    // Losing XP reopens a MAX Pokémon's progress bar.
    if (result.evolution_stage === 'MAX') {
      result.evolution_stage = numericStage(result)
    }

    while (remainingXP < 0) {
      const options = await getEvolutionOptions(result.id)

      if (!options.previous) {
        remainingXP = 0
        result.isDefeated = true
        break
      }

      const previousForm = await getNextForm(
        options.previous,
        result,
        -1
      )

      remainingXP += MAX_XP

      transitions.push({
        previous: { ...result, xp: 0 },
        next: {
          ...previousForm,
          xp: Math.max(0, remainingXP)
        },
        direction: -1
      })

      result = previousForm
    }
  }

  result.xp = remainingXP

  return { result, transitions, overflow }
}

// =========================================
// ANIMATION
// =========================================

async function playAnimation(transition) {
  const { previous, next, direction } = transition

  isDevolving.value = direction < 0
  animatedPokemon.value = previous

  message.value = direction < 0
    ? `${previous.name} is devolving…`
    : `${previous.name} is evolving…`

    if (direction >= 0){
      playSound('evolving')
    } else {
      playSound('devolving')
    }

  if (!prefersReducedMotion()) {
    phase.value = 'charging'
    await wait(900)
    if (direction >= 0) playSound('HURRAY')
    if (disposed) return

    phase.value = 'swapping'
    await wait(150)
    if (disposed) return

    animatedPokemon.value = next
    phase.value = 'revealing'

    await wait(650)
    if (disposed) return
  } else {
    animatedPokemon.value = next
  }

  phase.value = 'idle'

  message.value = direction < 0
    ? `${previous.name} devolved into ${next.name}!`
    : `${previous.name} evolved into ${next.name}! 🎉`
}

// =========================================
// PUBLIC XP METHODS
// =========================================

async function changeXP(amount) {
  if (disposed || busy.value) {
    return { accepted: false, reason: 'busy' }
  }

  const target = props.activePokemon

  if (!target) {
    return { accepted: false, reason: 'no-pokemon' }
  }

  if (!Number.isSafeInteger(amount) || amount === 0) {
    return { accepted: false, reason: 'invalid-amount' }
  }

  if (amount < 0 && target.isDefeated) {
    return { accepted: false, reason: 'defeated' }
  }

  busy.value = true
  error.value = ''
  message.value = ''

  try {
    const plan = await prepareXPChange(target, amount)

    if (disposed) {
      return { accepted: false, reason: 'unmounted' }
    }

    // Do not apply a reward to a buddy that was changed
    // while its evolution information was loading.
    if (props.activePokemon !== target) {
      return { accepted: false, reason: 'buddy-changed' }
    }

    // Hold the old appearance while the parent saves the new data.
    animatedPokemon.value = { ...target }

    // Visual feedback only; no additional XP or rewards are awarded here.
    const visibleDelta = amount > 0
      ? amount - plan.overflow
      : Math.max(amount, -(numericStage(target) * MAX_XP + target.xp))
    if (visibleDelta !== 0) {
      xpFloat.value = { id: ++xpFloatId, amount: visibleDelta }
    }

    emit('update-pokemon', {
      pokemon: target,
      changes: plan.result
    })

    if (plan.overflow > 0) {
      emit('xp-overflow', {
        pokemon: target,
        amount: plan.overflow
      })
    }

    // XP is already committed. Animation is visual only.
    // Leaving the page does not undo the accepted reward.
    for (const transition of plan.transitions) {
      if (disposed || props.activePokemon !== target) break
      await playAnimation(transition)
    }

    if (!disposed) {
      if (plan.result.isDefeated) {
        message.value = `${plan.result.name} has been defeated!`
      } else if (plan.overflow > 0) {
        message.value =
          `${plan.result.name} is MAX! ${plan.overflow} XP remains to transfer.`
      } else if (!plan.transitions.length) {
        message.value = amount > 0
          ? `+${amount} XP!`
          : `−${Math.abs(amount)} XP`
      }
    }

    return {
      accepted: true,
      overflow: plan.overflow
    }
  } catch (cause) {
    console.error('Unable to update Pokémon:', cause)

    error.value =
      'Unable to update XP. Please try again.'

    return {
      accepted: false,
      reason: 'request-failed'
    }
  } finally {
    busy.value = false
    phase.value = 'idle'
    animatedPokemon.value = null
  }
}

function addXP(amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return Promise.resolve({
      accepted: false,
      reason: 'invalid-amount'
    })
  }

  return changeXP(amount)
}

function subtractXP(amount = 10) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return Promise.resolve({
      accepted: false,
      reason: 'invalid-amount'
    })
  }

  return changeXP(-amount)
}

defineExpose({
  addXP,
  subtractXP,
  busy
})

onBeforeUnmount(() => {
  disposed = true
  finishWait?.()
})
</script>

<template>
  <section class="pokemon-buddy">
    <h2>Battle Buddy</h2>

    <template v-if="activePokemon">
      <div class="buddy-feedback" aria-live="polite" aria-atomic="true">
        <span v-if="isAnimating" class="buddy-evolution-note" :class="{ 'is-devolving': isDevolving }">
          {{ isDevolving ? 'Devolving…' : 'Evolving…' }}
        </span>
      </div>
      <span
        v-if="xpFloat"
        :key="xpFloat.id"
        class="buddy-xp-float"
        :class="{ 'is-loss': xpFloat.amount < 0 }"
        aria-hidden="true"
        @animationend="xpFloat = null"
      >{{ xpFloat.amount > 0 ? '+' : '−' }}{{ Math.abs(xpFloat.amount) }} XP</span>
      <div
        class="buddy-image-container"
        :class="{ devolving: isDevolving }"
        :aria-busy="busy"
      >
        <div
          v-if="isAnimating"
          class="evolution-glow"
          aria-hidden="true"
        ></div>

        <div
          v-if="isAnimating"
          class="sparkles"
          aria-hidden="true"
        >
          <span v-for="number in 6" :key="number">✦</span>
        </div>

        <div
          v-if="phase === 'swapping'"
          class="swap-flash"
          aria-hidden="true"
        ></div>

        <img
          v-if="sprite"
          :src="sprite"
          :alt="displayedPokemon.name"
          class="buddy-sprite"
          :class="{
            charging: phase === 'charging',
            swapping: phase === 'swapping',
            revealing: phase === 'revealing',
            defeated: displayedPokemon.isDefeated && !isAnimating
          }"
        />

        <p v-else class="buddy-placeholder">
          Pokémon image unavailable
        </p>
      </div>

      <h3>{{ displayedPokemon?.name }}</h3>
      <p class="buddy-level">
        {{ isMaxed ? 'Level MAX' : `Lv. ${displayedLevel}` }}
      </p>

      <p
        v-if="busy && !isAnimating"
        class="buddy-status"
        role="status"
      >
        Updating XP…
      </p>

      <p v-if="message" class="buddy-message" role="status">
        {{ message }}
      </p>

      <p v-if="error" class="buddy-error" role="alert">
        {{ error }}
      </p>

      <div class="buddy-xp">
        <p>
          {{ isMaxed ? 'Maximum evolution reached!' : 'XP Progress' }}
        </p>

        <div
          class="xp-track"
          role="progressbar"
          :aria-label="`${displayedPokemon?.name} XP`"
          :aria-valuenow="xpPercentage"
          :aria-valuemin="0"
          :aria-valuemax="100"
        >
          <div
            class="xp-fill"
            :style="{ width: `${xpPercentage}%` }"
          ></div>
        </div>

        <p>
          {{ displayedPokemon?.xp ?? 0 }} / {{ MAX_XP }} XP
        </p>
      </div>
    </template>

    <p v-else class="buddy-placeholder">
      Select a Pokémon from your Pokédex.
    </p>
  </section>
</template>

<style scoped>
.pokemon-buddy {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 12px;
  text-align: center;
  color: #30304b;
}

.pokemon-buddy h2 {
  margin: 0;
  font-size: clamp(18px, 1.7vw, 24px);
  font-weight: 900;
}

.pokemon-buddy h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
}

.pokemon-buddy p {
  margin: 0;
  font-size: 13px;
}

.buddy-placeholder,
.buddy-status {
  color: #697386;
}

.buddy-message {
  color: #795500;
  font-weight: 700;
}

.buddy-error {
  color: #b42318;
}

/* Pokémon container */

.buddy-image-container {
  position: relative;
  isolation: isolate;
  container-type: inline-size;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 200px;
  flex-shrink: 0;
  overflow: visible;
}

.buddy-sprite {
  position: relative;
  z-index: 2;
  width: auto;
  height: 100px;
  max-width: 80%;
  max-height: 80%;
  object-fit: contain;
  image-rendering: pixelated;
  transform-origin: center;
}

.buddy-sprite.defeated {
  filter: grayscale(1);
  opacity: 0.5;
  transform: rotate(90deg);
}

.buddy-sprite.charging {
  animation: buddy-charge 0.25s infinite alternate;
}

.buddy-sprite.swapping {
  filter: brightness(0) invert(1);
  transform: scale(1.2);
}

.buddy-sprite.revealing {
  animation: buddy-reveal 0.6s ease-out;
}

/* XP progress */

.buddy-xp {
  width: 100%;
  max-width: 220px;
}

.xp-track {
  height: 18px;
  margin: 8px 0;
  overflow: hidden;
  border-radius: 20px;
  background: #dedede;
}

.xp-fill {
  height: 100%;
  background: #4caf50;
  transition: width 0.3s ease;
}

/* Evolution / devolution label */

.buddy-feedback {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  z-index: 8;
  transform: translateX(-50%);
  pointer-events: none;
}

.buddy-evolution-note {
  display: block;
  padding: 7px 14px;
  border: 1px solid #eac66c;
  border-radius: 999px;
  background: #fff4ce;
  color: #72531b;
  font: 600 14px/1.3 'Fredoka', sans-serif;
  white-space: nowrap;
  box-shadow: 0 3px 12px #46371818;
}

.buddy-evolution-note.is-devolving {
  border-color: #e7b5a3;
  background: #fff0e9;
  color: #9a5142;
}

/* Floating XP feedback */

.buddy-xp-float {
  position: absolute;
  top: 32%;
  right: 0;
  z-index: 9;
  padding: 5px 10px;
  border: 1px solid #b5d9ba;
  border-radius: 999px;
  background: #f0fff1;
  color: #2f7142;
  font: 700 17px/1.3 'Fredoka', sans-serif;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 3px 10px #20362820;
  animation: buddy-xp-rise 1.5s ease-out forwards;
}

.buddy-xp-float.is-loss {
  border-color: #e4b8b0;
  background: #fff0ed;
  color: #ad4845;
}

/* Responsive evolution effects */

.evolution-glow {
  position: absolute;
  z-index: 1;
  /* width: min(75%, 300px); */
  /* height: auto; */
  /* aspect-ratio: 1; */
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(
    circle,
    rgb(250, 255, 180),
    #c1ffaade,
    transparent 70%
  );
  animation: buddy-glow 0.5s infinite alternate;

  width: 110%;
  max-width: none;
  height: auto;
  aspect-ratio: 1;
}

.devolving .evolution-glow {
  background: radial-gradient(
    circle,
    white,
    #fb8d8dc4,
    transparent 70%
  );
}

.swap-flash {
  position: absolute;
  inset: 10%;
  z-index: 4;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle, white, transparent 70%);
}

.sparkles {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.sparkles span {
  position: absolute;
  bottom: 20%;
  color: #c1ffaade;
  font-size: clamp(8px, 7cqi, 18px);
  animation: buddy-sparkle 1s infinite;
}

.devolving .sparkles span {
  color: #f9acac;
}

.sparkles span:nth-child(1) {
  left: 15%;
}

.sparkles span:nth-child(2) {
  left: 30%;
  animation-delay: 0.2s;
}

.sparkles span:nth-child(3) {
  left: 45%;
  animation-delay: 0.4s;
}

.sparkles span:nth-child(4) {
  left: 60%;
  animation-delay: 0.1s;
}

.sparkles span:nth-child(5) {
  left: 75%;
  animation-delay: 0.3s;
}

.sparkles span:nth-child(6) {
  left: 85%;
  animation-delay: 0.5s;
}

/* Animation keyframes */

@keyframes buddy-glow {
  from {
    transform: scale(0.85);
    opacity: 0.6;
  }

  to {
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes buddy-charge {
  from {
    filter: brightness(1);
    transform: scale(1);
  }

  to {
    filter: brightness(0) invert(1);
    transform: scale(1.15);
  }
}

@keyframes buddy-reveal {
  from {
    filter: brightness(3);
    transform: scale(0.75);
  }

  60% {
    transform: scale(1.2);
  }

  to {
    filter: brightness(1);
    transform: scale(1);
  }
}

@keyframes buddy-sparkle {
  from {
    transform: translateY(0) scale(0.8);
    opacity: 1;
  }

  to {
    transform: translateY(clamp(-100px, -45cqi, -24px))
      scale(0.3);
    opacity: 0;
  }
}

@keyframes buddy-xp-rise {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }

  15%,
  55% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateY(-42px);
  }
}

@keyframes buddy-xp-fade {
  0%,
  80% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

/* Smaller-screen feedback */

@media (max-width: 600px) {
  .buddy-evolution-note {
    padding: 5px 10px;
    font-size: 12px;
  }

  .buddy-xp-float {
    padding: 4px 8px;
    font-size: 14px;
  }
}

/* Reduced motion */

@media (prefers-reduced-motion: reduce) {
  .buddy-sprite,
  .evolution-glow,
  .sparkles span {
    animation: none;
  }

  .xp-fill {
    transition: none;
  }

  .buddy-xp-float {
    animation-name: buddy-xp-fade;
  }
}
</style>
