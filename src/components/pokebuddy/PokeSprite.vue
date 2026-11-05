
<script setup>
import {
  computed,
  onBeforeUnmount,
  ref,
  watch
} from 'vue'

import playSound from '../../../scripts/soundEffect'
import { normaliseName, capitalise, getEvolutionOptions, planPokemonXp } from '../../services/pokemonProgression'

// ==========================================
// PROPS AND EVENTS
// ==========================================

const props = defineProps({
  activePokemon: {
    type: Object,
    required: true
  },

  facing: {
    type: String,
    default: 'front',
    validator: value => ['front', 'back'].includes(value)
  },

  fallbackSrc: {
    type: String,
    default: ''
  },

  progressPosition: {
    type: String,
    default: 'top',
    validator: value =>
      ['top', 'bottom', 'right', 'hidden'].includes(value)
  },

  embedded: {
    type: Boolean,
    default: false
  },

  maxXp: {
    type: Number,
    default: 200
  }
})

const emit = defineEmits([
  'update-pokemon',
  'xp-overflow',
  'evolution-complete'
])

const API = (
  import.meta.env.VITE_POKE_API_URL ||
  'https://pokeapi.co/api/v2'
).replace(/\/+$/, '')

// ==========================================
// COMPONENT STATE
// ==========================================

const sprite = ref('')
const currentSpriteName = ref('')
const isAnimated = ref(false)

const loading = ref(false)
const busy = ref(false)
const error = ref('')
const message = ref('')

const phase = ref('idle')
const isPlaying = ref(false)
const isDevolving = ref(false)

const animatedPokemon = ref(null)

const xpFloat = ref(null)
let xpFloatId = 0

let disposed = false
let spriteController = null
let evolutionController = null
let spriteVersion = 0

const spriteCache = new Map()

// ==========================================
// COMPUTED VALUES
// ==========================================

// Data comes from TrainerHouse / SurpriseBossView.
// This component does not fetch the user profile.
const pokemonName = computed(() =>
  props.activePokemon?.name ||
  props.activePokemon?.pokemon?.name ||
  ''
)

const displayedPokemon = computed(() =>
  animatedPokemon.value || props.activePokemon
)

const displayedName = computed(() =>
  displayedPokemon.value?.name || 'Pokémon'
)

const isAnimating = computed(() =>
  phase.value !== 'idle'
)

const isMaxed = computed(() =>
  displayedPokemon.value?.evolution_stage === 'MAX' ||
  displayedPokemon.value?.is_max_evolution === true ||
  displayedPokemon.value?.isMaxEvolution === true
)

const displayedLevel = computed(() =>
  isMaxed.value
    ? 'MAX'
    : displayedPokemon.value?.level ?? 1
)

const displayedXP = computed(() =>
  Math.max(0, Number(displayedPokemon.value?.xp ?? 0))
)

const xpPercentage = computed(() =>
  Math.min(
    100,
    (displayedXP.value / props.maxXp) * 100
  )
)

// ==========================================
// GENERAL HELPERS
// ==========================================

function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
}

function delay(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, milliseconds)

    function abort() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    signal?.addEventListener('abort', abort, {
      once: true
    })
  })
}

function playPokemonSound(name) {
  try {
    playSound(name)
  } catch (cause) {
    console.warn('Pokémon sound unavailable:', cause)
  }
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

// ==========================================
// GET FRONT OR BACK SPRITE
// ==========================================

async function fetchPokemonSprite(name, facing, signal) {
  const slug = normaliseName(name)
  const cacheKey = `${slug}:${facing}`

  if (spriteCache.has(cacheKey)) {
    return spriteCache.get(cacheKey)
  }

  const pokemon = await requestJson(
    `${API}/pokemon/${encodeURIComponent(slug)}/`,
    signal
  )

  const bw =
    pokemon.sprites?.versions?.['generation-v']?.['black-white']

  const animated = facing === 'back'
    ? bw?.animated?.back_default
    : bw?.animated?.front_default

  const staticImage = facing === 'back'
    ? pokemon.sprites?.back_default
    : pokemon.sprites?.front_default

  const image =
    animated ||
    staticImage ||
    props.fallbackSrc

  if (!image) {
    throw new Error(
      `No ${facing}-facing sprite for ${slug}.`
    )
  }

  const result = {
    name: pokemon.name,
    pokeapiId: pokemon.id,
    image,
    animated: Boolean(animated)
  }

  spriteCache.set(cacheKey, result)

  return result
}

// ==========================================
// LOAD THE CURRENT SELECTED POKÉMON
// ==========================================

async function loadCurrentSprite() {
  if (disposed || isPlaying.value) return

  spriteController?.abort()

  const controller = new AbortController()
  spriteController = controller

  const version = ++spriteVersion
  const name = normaliseName(pokemonName.value)

  error.value = ''
  loading.value = false

  if (!name) {
    sprite.value = ''
    currentSpriteName.value = ''
    error.value = 'Choose a Pokémon.'
    return
  }

  loading.value = true

  try {
    const result = await fetchPokemonSprite(
      name,
      props.facing,
      controller.signal
    )

    if (
      disposed ||
      controller.signal.aborted ||
      version !== spriteVersion ||
      isPlaying.value
    ) return

    sprite.value = result.image
    currentSpriteName.value = result.name
    isAnimated.value = result.animated
  } catch (cause) {
    if (controller.signal.aborted || disposed) return

    error.value =
      cause.message || 'Unable to load Pokémon.'

    sprite.value = props.fallbackSrc || ''
  } finally {
    if (
      !controller.signal.aborted &&
      version === spriteVersion
    ) {
      loading.value = false
    }
  }
}

// Automatically update when the selected Pokémon
// or its facing direction changes.
watch(
  [pokemonName, () => props.facing],
  () => {
    if (!isPlaying.value) {
      void loadCurrentSprite()
    }
  },
  { immediate: true }
)

// ==========================================
// FETCH EVOLUTION INFORMATION
// ==========================================

// ==========================================
// FRONTEND XP + EVOLUTION CALCULATION
//
// This calculates the proposed new Pokémon.
// It DOES NOT save anything to Supabase.
// ==========================================

function planXpChange(options = {}) {
  return planPokemonXp(props.activePokemon, options, props.maxXp)
}

// ==========================================
// PLAY EVOLUTION / DEVOLUTION ANIMATION
//
// Does not award XP.
// Does not update Supabase.
// ==========================================

async function playEvolution(transitions = []) {
  if (
    disposed ||
    isPlaying.value ||
    !Array.isArray(transitions) ||
    transitions.length === 0
  ) {
    return false
  }

  spriteController?.abort()
  ++spriteVersion

  const controller = new AbortController()
  evolutionController = controller

  isPlaying.value = true
  loading.value = false
  error.value = ''
  message.value = ''

  try {
    for (const step of transitions) {
      if (disposed || controller.signal.aborted) {
        return false
      }

      const from = normaliseName(
        step.from || step.previous?.name
      )

      const to = normaliseName(
        step.to || step.next?.name
      )

      if (!from || !to) {
        throw new Error(
          'Evolution transition is incomplete.'
        )
      }

      const direction =
        step.direction === 'devolve' ||
        step.direction === -1
          ? -1
          : 1

      isDevolving.value = direction < 0

      // Ensure old form is visible.
      if (currentSpriteName.value !== from) {
        const oldSprite = await fetchPokemonSprite(
          from,
          props.facing,
          controller.signal
        )

        sprite.value = oldSprite.image
        currentSpriteName.value = oldSprite.name
        isAnimated.value = oldSprite.animated
      }

      animatedPokemon.value = {
        ...props.activePokemon,
        name: capitalise(from)
      }

      // Preload the next form.
      const nextSprite = await fetchPokemonSprite(
        to,
        props.facing,
        controller.signal
      )

      message.value = direction < 0
        ? `${capitalise(from)} is devolving…`
        : `${capitalise(from)} is evolving…`

      playPokemonSound(
        direction < 0 ? 'devolving' : 'evolving'
      )

      if (!prefersReducedMotion()) {
        phase.value = 'charging'
        await delay(900, controller.signal)

        if (direction > 0) {
          playPokemonSound('HURRAY')
        }

        phase.value = 'swapping'
        await delay(150, controller.signal)
      }

      // Swap the Pokémon's appearance.
      sprite.value = nextSprite.image
      currentSpriteName.value = nextSprite.name
      isAnimated.value = nextSprite.animated

      animatedPokemon.value = {
        ...animatedPokemon.value,
        name: capitalise(to)
      }

      if (!prefersReducedMotion()) {
        phase.value = 'revealing'
        await delay(650, controller.signal)
      }

      phase.value = 'idle'

      message.value = direction < 0
        ? `${capitalise(from)} devolved into ${capitalise(to)}!`
        : `${capitalise(from)} evolved into ${capitalise(to)}!`
    }

    emit('evolution-complete', {
      transitions,
      pokemonName: currentSpriteName.value
    })

    return true
  } catch (cause) {
    if (!disposed && cause.name !== 'AbortError') {
      console.error('Evolution animation failed:', cause)

      error.value =
        cause.message || 'Evolution animation failed.'
    }

    return false
  } finally {
    phase.value = 'idle'
    isPlaying.value = false
    animatedPokemon.value = null

    if (evolutionController === controller) {
      evolutionController = null
    }
  }
}

// ==========================================
// LOCAL XP METHODS
//
// Intended for Trainer House preview/testing.
//
// For real rewards, the parent should use
// planXpChange(), playEvolution(), and a
// validated Supabase save operation.
// ==========================================

async function changeXP(amount) {
  if (disposed || busy.value || isPlaying.value) {
    return {
      accepted: false,
      reason: 'busy'
    }
  }

  if (!Number.isSafeInteger(amount) || amount === 0) {
    return {
      accepted: false,
      reason: 'invalid-amount'
    }
  }

  const originalPokemon = props.activePokemon
  const originalOwner =
    originalPokemon?.ownedId ?? originalPokemon?.id

  busy.value = true
  error.value = ''

  try {
    // 1. Calculate evolution.
    const plan = await planXpChange({
      delta: amount
    })

    if (disposed) {
      return {
        accepted: false,
        reason: 'unmounted'
      }
    }

    const currentOwner =
      props.activePokemon?.ownedId ??
      props.activePokemon?.id

    if (currentOwner !== originalOwner) {
      return {
        accepted: false,
        reason: 'buddy-changed'
      }
    }

    const visibleDelta = plan.appliedDelta

    if (visibleDelta !== 0) {
      xpFloat.value = {
        id: ++xpFloatId,
        amount: visibleDelta
      }
    }

    // 2. Play animation.
    if (plan.evolutions.length) {
      const played = await playEvolution(
        plan.evolutions
      )

      if (!played) {
        return {
          accepted: false,
          reason: 'animation-failed'
        }
      }
    }

    // 3. Give the proposed changes to the parent.
    // The parent decides whether/how to persist them.
    emit('update-pokemon', {
      pokemon: originalPokemon,
      changes: plan.result
    })

    if (plan.overflowXP > 0) {
      emit('xp-overflow', {
        pokemon: originalPokemon,
        amount: plan.overflowXP
      })
    }

    if (!plan.evolutions.length) {
      message.value = amount > 0
        ? `+${amount} XP!`
        : `−${Math.abs(amount)} XP`
    }

    return {
      accepted: true,
      appliedDelta: plan.appliedDelta,
      overflow: plan.overflowXP,
      evolutions: plan.evolutions,
      result: plan.result
    }
  } catch (cause) {
    console.error('Unable to process Pokémon XP:', cause)

    error.value =
      cause.message || 'Unable to update Pokémon.'

    return {
      accepted: false,
      reason: 'request-failed'
    }
  } finally {
    busy.value = false
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

// Reset the preview to the parent's saved Pokémon.
async function resetSprite() {
  evolutionController?.abort()
  animatedPokemon.value = null
  phase.value = 'idle'
  message.value = ''

  await loadCurrentSprite()
}

function handleImageError() {
  if (
    props.fallbackSrc &&
    sprite.value !== props.fallbackSrc
  ) {
    sprite.value = props.fallbackSrc
    isAnimated.value = false
    return
  }

  sprite.value = ''
  error.value = 'Pokémon image unavailable.'
}

// ==========================================
// PUBLIC METHODS
// ==========================================

defineExpose({
  getEvolutionOptions,
  planXpChange,
  playEvolution,
  resetSprite,
  addXP,
  subtractXP,
  busy,
  isPlaying
})

onBeforeUnmount(() => {
  disposed = true

  spriteController?.abort()
  evolutionController?.abort()
})
</script>

<template>
  <section
    class="pokemon-buddy"
    :class="{
      'pokemon-buddy--embedded': embedded,
      'pokemon-buddy--back': facing === 'back'
    }"
  >
    <h2 v-if="!embedded">Battle Buddy</h2>

    <template v-if="activePokemon">
      <!-- Evolution status -->
      <div class="buddy-feedback" aria-live="polite">
        <span
          v-if="isAnimating"
          class="buddy-evolution-note"
        >
          {{ isDevolving ? 'Devolving…' : 'Evolving…' }}
        </span>
      </div>

      <!-- Floating XP -->
      <span
        v-if="xpFloat"
        :key="xpFloat.id"
        class="buddy-xp-float"
        :class="{ 'is-loss': xpFloat.amount < 0 }"
        @animationend="xpFloat = null"
      >
        {{ xpFloat.amount > 0 ? '+' : '−' }}
        {{ Math.abs(xpFloat.amount) }} XP
      </span>

      <!-- Pokémon stage -->
      <div
        class="buddy-stage"
        :class="`buddy-stage--${progressPosition}`"
      >
        <!-- XP progress -->
        <div
          v-if="progressPosition !== 'hidden'"
          class="buddy-progress"
          :class="{ 'buddy-progress--max': isMaxed }"
        >
          <div class="buddy-progress__name">{{ displayedName }}</div>
          <div class="buddy-progress__heading">
            <span class="buddy-progress__level">
              {{ isMaxed ? 'MAX' : `Lv. ${displayedLevel}` }}
            </span>

            <span class="buddy-progress__value">
              {{ displayedXP }} / {{ maxXp }} XP
            </span>
          </div>

          <div
            class="buddy-progress__track"
            role="progressbar"
            :aria-label="`${displayedName} XP`"
            :aria-valuenow="xpPercentage"
            :aria-valuemin="0"
            :aria-valuemax="100"
          >
            <div
              class="buddy-progress__fill"
              :style="{ width: `${xpPercentage}%` }"
            ></div>
          </div>
        </div>

        <!-- Sprite display -->
        <div
          class="buddy-image-container"
          :class="{ devolving: isDevolving }"
          :aria-busy="loading || isPlaying"
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
            <span v-for="n in 6" :key="n">✦</span>
          </div>

          <div
            v-if="phase === 'swapping'"
            class="swap-flash"
            aria-hidden="true"
          ></div>

          <img
            v-if="sprite"
            :src="sprite"
            :alt="`${displayedName}, ${facing} view`"
            :title="isAnimated
              ? displayedName
              : `${displayedName} — static sprite`"
            class="buddy-sprite"
            :class="{
              charging: phase === 'charging',
              swapping: phase === 'swapping',
              revealing: phase === 'revealing',
              defeated:
                (displayedPokemon?.isDefeated ||
                 displayedPokemon?.is_defeated) &&
                !isAnimating
            }"
            draggable="false"
            @error="handleImageError"
          />

          <span
            v-else-if="loading"
            class="buddy-placeholder"
            role="status"
          >
            Loading Pokémon…
          </span>

          <span
            v-else-if="error"
            class="buddy-placeholder"
            role="alert"
          >
            {{ error }}
          </span>
        </div>
      </div>

      <h3>{{ displayedName }}</h3>

      <p v-if="message" class="buddy-message">
        {{ message }}
      </p>
    </template>

    <p v-else class="buddy-placeholder">
      Choose a Pokémon.
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
  gap: 8px;

  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;

  padding: 8px;
  text-align: center;
  color: #30304b;
}

.pokemon-buddy h2 {
  margin: 0;
  font-size: clamp(16px, 1.7vw, 24px);
  font-weight: 900;
}

.pokemon-buddy h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.pokemon-buddy p {
  margin: 0;
  font-size: 13px;
}

.pokemon-buddy--embedded {
  padding: 0;
  gap: 0;
}

/* ================================
   STAGE
================================ */

.buddy-stage {
  position: relative;
  isolation: isolate;

  width: 100%;
  height: 300px;
  min-height: 180px;
  flex: 1 1 auto;
}
.homepage-pokemon :deep(.buddy-stage) {
  height: 100%;
  min-height: 0;
}

.buddy-image-container {
  position: absolute;
  left: 0;
  bottom: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 100%;
  height: calc(100% - 90px);

  overflow: visible;
  isolation: isolate;
}

/* ================================
   SPRITE
================================ */

.buddy-sprite {
  position: relative;
  z-index: 2;

  display: block;

  width: auto;
  height: 100%;

  max-width: 90%;
  max-height: 90%;

  object-fit: contain;
  object-position: center bottom;

  image-rendering: pixelated;
  user-select: none;
  transform-origin: center bottom;
}

.buddy-sprite.defeated {
  filter: grayscale(1);
  opacity: 0.5;
  transform: rotate(90deg);
}

/* ================================
   XP PANEL
================================ */

.buddy-progress {
  position: absolute;
  top: 6px;
  left: 50%;
  z-index: 6;

  transform: translateX(-50%);

  box-sizing: border-box;
  width: min(270px, 96%);
  padding: 9px 11px;

  border: 2px solid #263b5c;
  border-radius: 14px;

  background: #fffdf3;
  color: #243653;

  font-family: 'Fredoka', system-ui, sans-serif;
  box-shadow: 0 3px 0 #263b5c33;
  pointer-events: none;
}

.buddy-progress__name {
  margin-bottom: 6px;
  font-size: clamp(12px, 1.2vw, 16px);
  font-weight: 800;
  line-height: 1.25;
  text-align: left;
  overflow-wrap: anywhere;
}

.buddy-progress__heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;

  margin-bottom: 7px;
  line-height: 1.2;
  white-space: nowrap;

  font-size: clamp(10px, 1vw, 13px);
  font-weight: 700;
}

.buddy-progress__level {
  padding: 3px 7px;
  border-radius: 7px;

  background: #263b5c;
  color: #ffdf63;
}

.buddy-progress__track {
  height: 12px;
  overflow: hidden;

  border: 1px solid #bbc6d3;
  border-radius: 999px;

  background: #e3e9ef;
}

.buddy-progress__fill {
  height: 100%;
  border-radius: inherit;

  background: linear-gradient(
    180deg,
    #ffe989,
    #f4c542
  );

  transition: width .35s ease;
}

.buddy-progress--max {
  border-color: #a47c25;
  background: #fff8dc;
}

/* Progress underneath Pokémon */

.buddy-stage--bottom .buddy-progress {
  top: auto;
  bottom: 6px;
}

.buddy-stage--bottom .buddy-image-container {
  top: 0;
  bottom: auto;
}

/* Progress beside the Pokémon */

.buddy-stage--right {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  align-items: center;
  gap: 12px;
}

.buddy-stage--right .buddy-image-container {
  position: relative;
  grid-column: 1;
  grid-row: 1;
  height: 100%;
  min-height: 0;
}

.buddy-stage--right .buddy-progress {
  position: static;
  grid-column: 2;
  grid-row: 1;
  width: 100%;
  min-width: 0;
  transform: none;
}

.buddy-stage--right .buddy-progress__heading {
  flex-wrap: wrap;
  white-space: normal;
}

.buddy-stage--right .buddy-progress__value {
  overflow-wrap: anywhere;
}

/* Hide the progress panel entirely */

.buddy-stage--hidden .buddy-image-container {
  top: 0;
  bottom: 0;
  height: 100%;
}

/* ================================
   EVOLUTION EFFECTS
================================ */

.buddy-sprite.charging {
  animation: buddy-charge .25s infinite alternate;
}

.buddy-sprite.swapping {
  filter: brightness(0) invert(1);
  transform: scale(1.2);
}

.buddy-sprite.revealing {
  animation: buddy-reveal .65s ease-out;
}

.evolution-glow {
  position: absolute;
  z-index: 1;

  width: 110%;
  aspect-ratio: 1;

  border-radius: 50%;
  pointer-events: none;

  background: radial-gradient(
    circle,
    #faffb4,
    #c1ffaade 45%,
    transparent 70%
  );

  animation: buddy-glow .5s infinite alternate;
}

.devolving .evolution-glow {
  background: radial-gradient(
    circle,
    white,
    #fb8d8dc4 45%,
    transparent 70%
  );
}

.swap-flash {
  position: absolute;
  inset: 10%;
  z-index: 4;

  border-radius: 50%;
  pointer-events: none;

  background: radial-gradient(
    circle,
    white,
    transparent 70%
  );
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
  font-size: 18px;

  animation: buddy-sparkle 1s infinite;
}

.sparkles span:nth-child(1) { left: 15%; }
.sparkles span:nth-child(2) { left: 30%; animation-delay: .2s; }
.sparkles span:nth-child(3) { left: 45%; animation-delay: .4s; }
.sparkles span:nth-child(4) { left: 60%; animation-delay: .1s; }
.sparkles span:nth-child(5) { left: 75%; animation-delay: .3s; }
.sparkles span:nth-child(6) { left: 85%; animation-delay: .5s; }

.devolving .sparkles span {
  color: #f9acac;
}

/* ================================
   MESSAGES
================================ */

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

  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.buddy-message {
  color: #795500;
  font-weight: 700;
}

.buddy-placeholder {
  color: #697386;
  font-size: 12px;
}

.buddy-xp-float {
  position: absolute;
  top: 30%;
  right: 0;
  z-index: 9;

  padding: 5px 10px;
  border-radius: 999px;

  background: #f0fff1;
  color: #2f7142;

  font-weight: 800;
  white-space: nowrap;
  pointer-events: none;

  animation: buddy-xp-rise 1.5s ease-out forwards;
}

.buddy-xp-float.is-loss {
  background: #fff0ed;
  color: #ad4845;
}

/* ================================
   KEYFRAMES
================================ */

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
    transform: scale(.75);
  }

  60% {
    transform: scale(1.2);
  }

  to {
    filter: brightness(1);
    transform: scale(1);
  }
}

@keyframes buddy-glow {
  from {
    transform: scale(.85);
    opacity: .6;
  }

  to {
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes buddy-sparkle {
  from {
    transform: translateY(0) scale(.8);
    opacity: 1;
  }

  to {
    transform: translateY(-90px) scale(.3);
    opacity: 0;
  }
}

@keyframes buddy-xp-rise {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }

  20%, 60% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateY(-42px);
  }
}

/* ================================
   RESPONSIVE
================================ */

@media (max-width: 600px) {
  .buddy-progress {
    padding: 6px 8px;
    border-radius: 10px;
  }

  .buddy-progress__heading {
    font-size: 10px;
  }

  .buddy-progress__track {
    height: 9px;
  }

  .buddy-stage {
    min-height: 150px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .buddy-sprite,
  .evolution-glow,
  .sparkles span,
  .buddy-xp-float {
    animation: none;
  }

  .buddy-progress__fill {
    transition: none;
  }
}
</style>
