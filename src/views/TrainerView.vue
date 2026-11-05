<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { getCurrentProfile } from '../services/profileService'
import { updateCurrentAvatar } from '../services/accountService'
import { getSelectedStudyBuddy, resolveStudyImage } from '../services/studyService'
import { avatarOptions, findAvatar } from '../data/avatarOptions'

// Keep the existing <xpPrompt> tag in TrainerHouse's template.
// It now renders the new XP → final evolution → gift component.
import xpPrompt from '../components/common/xpPrompt.vue'
import BackToHome from '../components/common/BackToHome.vue'
import StudydexBubbleNav from '../components/common/StudydexBubbleNav.vue'

import PokeSprite from '@/components/pokebuddy/PokeSprite.vue'

import ClockWeather from '@/components/common/ClockWeather.vue'
import TownBackground from '@/components/common/TownBackground.vue'

// =====================================================
// GENERAL CONFIGURATION
// =====================================================

const router = useRouter()
const POKE_API_URL = (
  import.meta.env.VITE_POKE_API_URL || 'https://pokeapi.co/api/v2'
).replace(/\/+$/, '')

const rainActive = ref(false)
const failedImages = ref([])

function reportImageError(event) {
  const path = event.target?.src || 'Unknown image'
  if (!failedImages.value.includes(path)) failedImages.value.push(path)
}

// =====================================================
// TRAINER PROFILE AND WARDROBE
// =====================================================

const profile = ref(null)
const avatarLoading = ref(false)
const avatarSaving = ref(false)
const avatarLoadError = ref('')
const saveError = ref('')
const saveMessage = ref('')

let pageActive = true

const trainerVariants = avatarOptions.map(option => ({
  ...option,
  id: option.value
}))

const selectedTrainer = computed(() =>
  findAvatar(profile.value?.avatar_choice)
)

const selectedVariantId = computed(() => selectedTrainer.value?.value ?? '')
const genderFilter = ref('all')

const avatarGroups = [
  { value: 'all', label: 'All styles' },
  { value: 'female', label: 'Girls' },
  { value: 'male', label: 'Boys' }
]

const visibleVariants = computed(() =>
  trainerVariants.filter(
    item => genderFilter.value === 'all' || item.gender === genderFilter.value
  )
)

const loadedIdle = ref('')

watch(
  () => selectedTrainer.value?.idleImage,
  (src, _previous, onCleanup) => {
    loadedIdle.value = ''
    if (!src) return

    const image = new Image()
    let cancelled = false

    image.onload = () => {
      if (!cancelled) loadedIdle.value = src
    }
    image.onerror = () => {
      if (!cancelled) loadedIdle.value = ''
    }
    onCleanup(() => {
      cancelled = true
      image.onload = null
      image.onerror = null
    })
    image.src = src
  },
  { immediate: true }
)

// =====================================================
// POKÉMON STATE AND EXPERIENCE PROMPT
// =====================================================

// The buttons and generated gifts below are DEV PREVIEWS only.
// Do not treat changes here as persisted XP or newly owned Pokémon.
const showXpTestButtons = import.meta.env.DEV

const selectedBuddyRecord = ref(null)
const buddyLoadError = ref('')
const buddyLoading = ref(false)
const buddyError = ref('')
const buddySprite = ref('')

const pokemonBuddyRef = ref(null)
const previewXp = ref(null)
const previewPokemon = ref(null)
const experienceResult = ref(null)

// Keeps the two existing :disabled="!!xpTestResult" bindings working.
// You can rename those bindings to "!!experienceResult" later.
const xpTestResult = experienceResult

let pendingPokemonChanges = null
const unallocatedXP = ref(0)
const previewGiftIds = new Set()
let giftRequestController = null

const activeBuddy = computed(() => {
  const record = selectedBuddyRecord.value
  if (!record?.pokemon) return null

  const saved = {
    ownedId: record.id,
    pokemon_id: record.pokemon.id,
    id: record.pokemon.name
      .toLowerCase()
      .replace(/[.'’]/g, '')
      .replace(/\s+/g, '-'),
    name: record.pokemon.name,
    xp: record.xp ?? 0,
    level: record.level ?? 1,
    isDefeated: false,
    evolution_stage: record.evolution_stage ?? 0,
    originalSpeciesId: record.originalSpeciesId ?? record.original_species_id,
    static_img: resolveStudyImage(record.pokemon.sprite_url)
  }

  const preview = previewPokemon.value?.ownedId === record.id
    ? previewPokemon.value
    : null

  return preview
    ? {
        ...saved,
        ...preview,
        ownedId: record.id,
        static_img: preview.static_img || saved.static_img
      }
    : saved
})

const roomPokemon = computed(() => {
  if (!activeBuddy.value) return null

  return {
    ...activeBuddy.value,
    animated_img: activeBuddy.value.animated_img || buddySprite.value,
    evolution_stage: activeBuddy.value.evolution_stage ?? 0,
    stageBeforeMax: activeBuddy.value.stageBeforeMax
  }
})

watch(
  () => selectedBuddyRecord.value?.id,
  () => {
    previewXp.value = null
    previewPokemon.value = null
    experienceResult.value = null
    unallocatedXP.value = 0
    pendingPokemonChanges = null
  }
)

// Read a saved buddy once rather than fetching it independently twice.
async function refreshTrainerBuddy(userId = profile.value?.id) {
  if (!userId) return

  buddyLoading.value = true
  buddyLoadError.value = ''

  try {
    const record = await getSelectedStudyBuddy(userId)
    if (!pageActive || profile.value?.id !== userId) return

    selectedBuddyRecord.value = record
    buddyError.value = ''

    // A genuine saved XP update supersedes all local test previews.
    previewXp.value = null
    previewPokemon.value = null
    pendingPokemonChanges = null
  } catch (error) {
    if (!pageActive) return
    buddyLoadError.value = error?.message || 'Your Pokémon could not load.'
    buddyError.value = buddyLoadError.value
  } finally {
    if (pageActive) buddyLoading.value = false
  }
}

async function loadTrainerProfile() {
  if (avatarLoading.value || avatarSaving.value) return

  avatarLoading.value = true
  avatarLoadError.value = ''

  try {
    const saved = await getCurrentProfile()
    if (!pageActive) return

    profile.value = saved
    genderFilter.value = 'all'
    await refreshTrainerBuddy(saved.id)
  } catch (error) {
    if (pageActive) {
      avatarLoadError.value =
        error?.message || 'Your avatar could not load. Please try again.'
    }
  } finally {
    if (pageActive) avatarLoading.value = false
  }
}

async function selectTrainer(variant) {
  if (
    avatarLoading.value ||
    avatarSaving.value ||
    !profile.value ||
    selectedVariantId.value === variant.id
  ) return

  avatarSaving.value = true
  saveError.value = ''
  saveMessage.value = ''

  try {
    const saved = await updateCurrentAvatar(variant.value)
    if (!pageActive) return

    profile.value = saved
    saveMessage.value = 'Avatar saved to your profile.'
  } catch (error) {
    if (pageActive) {
      saveError.value =
        error?.message || 'Your avatar could not be saved. Please try again.'
    }
  } finally {
    if (pageActive) avatarSaving.value = false
  }
}

// =====================================================
// POKÉMON SPRITES
// =====================================================

const spriteCache = new Map()

watch(
  () => activeBuddy.value?.id,
  async (id, _oldId, onCleanup) => {
    const controller = new AbortController()
    let cancelled = false

    onCleanup(() => {
      cancelled = true
      controller.abort()
    })

    buddyError.value = ''

    if (!id) {
      buddySprite.value = ''
      return
    }

    const fallback = activeBuddy.value?.static_img || ''
    // Keep a visible sprite while an evolved form's GIF is loading.
    // This also avoids unnecessary PokeSprite remounts.
    buddySprite.value = spriteCache.get(id) || fallback || buddySprite.value

    try {
      let sprite = spriteCache.get(id)

      if (!sprite) {
        const response = await fetch(`${POKE_API_URL}/pokemon/${id}/`, {
          signal: controller.signal
        })

        if (!response.ok) throw new Error('Could not load Pokémon')

        const data = await response.json()
        sprite =
          data.sprites?.versions?.['generation-v']?.['black-white']
            ?.animated?.front_default ||
          data.sprites?.front_default ||
          fallback

        if (sprite) spriteCache.set(id, sprite)
      }

      if (!cancelled) buddySprite.value = sprite || fallback
    } catch (error) {
      if (cancelled || error.name === 'AbortError') return
      buddySprite.value = fallback
      if (!fallback) buddyError.value = 'Your buddy could not load.'
    }
  },
  { immediate: true }
)

// =====================================================
// RECEIVE EVOLUTION / XP EVENTS FROM POKESPRITE
// =====================================================

function receivePokemonUpdate({ pokemon, changes } = {}) {
  // The child emits the current owned Pokémon and changes; don't update
  // the database from the visual testing controls.
  if (!changes || !selectedBuddyRecord.value) return

  if (
    pokemon?.ownedId != null &&
    pokemon.ownedId !== selectedBuddyRecord.value.id
  ) return

  pendingPokemonChanges = { ...changes }
}

function receiveXpOverflow({ amount } = {}) {
  const value = Number(amount)
  if (Number.isFinite(value) && value > 0) {
    unallocatedXP.value += value
  }
}

async function testPokemonXp(delta) {
  if (
    !showXpTestButtons ||
    !selectedBuddyRecord.value ||
    experienceResult.value
  ) return

  const component = pokemonBuddyRef.value
  if (!component || component.busy) return

  const previousPokemon = roomPokemon.value
  const previousStage = previousPokemon?.evolution_stage
  const previousName = previousPokemon?.name

  pendingPokemonChanges = null

  try {
    const result = delta > 0
      ? await component.addXP(delta)
      : await component.subtractXP(Math.abs(delta))

    const changes = pendingPokemonChanges
    pendingPokemonChanges = null

    if (!result?.accepted || !changes) return

    const nextStage = changes.evolution_stage ?? result.evolution_stage
    const reachedMaxEvolution =
      previousStage !== 'MAX' && nextStage === 'MAX'

    previewPokemon.value = {
      ...previousPokemon,
      ...changes,
      ownedId: selectedBuddyRecord.value.id
    }
    previewXp.value = changes.xp ?? previousPokemon?.xp ?? 0

    experienceResult.value = {
      title: changes.name !== previousName
        ? 'Pokémon evolution!'
        : 'XP reward!',
      pokemonName: changes.name || previousName || 'Your Pokémon',
      delta,
      appliedDelta: Number.isFinite(result.appliedDelta)
        ? result.appliedDelta
        : delta,
      xp: previewXp.value,
      saving: false,
      error: '',
      duplicate: false,
      reachedMaxEvolution,
      giftOpening: false,
      giftError: '',
      giftPokemon: null,
      unallocatedXP: unallocatedXP.value
    }
  } catch (error) {
    pendingPokemonChanges = null
    experienceResult.value = {
      title: 'XP update failed',
      pokemonName: previousName || 'Your Pokémon',
      delta,
      appliedDelta: 0,
      xp: previousPokemon?.xp ?? 0,
      saving: false,
      error: error?.message || 'Unable to update the Pokémon preview.',
      duplicate: false,
      reachedMaxEvolution: false,
      retry: () => {
        experienceResult.value = null
        void testPokemonXp(delta)
      }
    }
  }
}

// =====================================================
// GIFT REVEAL — PREVIEW ONLY
// =====================================================

// The sample PokeBuddy awards an unowned, unevolved Gen 1 species (excluding
// Ditto). TrainerHouse currently loads only ONE saved Pokémon, not the full
// collection, so this preview cannot guarantee a species is genuinely unowned.
// A production gift MUST be checked and saved by your backend.
async function handleOpenGift() {
  const current = experienceResult.value
  if (
    !current?.reachedMaxEvolution ||
    current.giftOpening ||
    current.giftPokemon
  ) return

  if (!showXpTestButtons) {
    experienceResult.value = {
      ...current,
      giftError: 'Gift creation is not yet connected to the saved Pokémon service.'
    }
    return
  }

  const controller = new AbortController()
  giftRequestController = controller

  experienceResult.value = {
    ...current,
    giftOpening: true,
    giftError: ''
  }

  try {
    const candidates = Array.from({ length: 151 }, (_, i) => i + 1)
      .filter(id => id !== 132 && !previewGiftIds.has(id))

    // Fisher–Yates shuffle so the reward is random.
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }

    // Exclude the active species if its numeric PokéAPI ID is available.
    const ownedId = Number(selectedBuddyRecord.value?.pokemon?.pokeapi_id)

    let gift = null

    for (const id of candidates) {
      if (id === ownedId) continue

      const speciesResponse = await fetch(
        `${POKE_API_URL}/pokemon-species/${id}/`,
        { signal: controller.signal }
      )
      if (!speciesResponse.ok) throw new Error('Pokémon species could not load.')

      const species = await speciesResponse.json()
      if (species.evolves_from_species !== null) continue

      const pokemonResponse = await fetch(
        `${POKE_API_URL}/pokemon/${id}/`,
        { signal: controller.signal }
      )
      if (!pokemonResponse.ok) throw new Error('Pokémon sprite could not load.')

      const data = await pokemonResponse.json()
      const staticImage = data.sprites?.front_default || ''
      const name = data.name
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')

      gift = {
        id: data.id,
        originalSpeciesId: data.id,
        name,
        species: name,
        evolution_stage: 0,
        xp: 0,
        static_img: staticImage,
        animated_img:
          data.sprites?.versions?.['generation-v']?.['black-white']
            ?.animated?.front_default || staticImage
      }
      break
    }

    if (!gift) throw new Error('No eligible preview Pokémon were found.')
    if (!pageActive || controller.signal.aborted) return

    previewGiftIds.add(gift.originalSpeciesId)
    experienceResult.value = {
      ...experienceResult.value,
      giftOpening: false,
      giftError: '',
      giftPokemon: gift
    }
  } catch (error) {
    if (controller.signal.aborted || !pageActive) return
    experienceResult.value = {
      ...experienceResult.value,
      giftOpening: false,
      giftError: error?.message || 'Could not open the preview gift.'
    }
  } finally {
    if (giftRequestController === controller) {
      giftRequestController = null
    }
  }
}

// =====================================================
// WARDROBE AND ROOM NAVIGATION
// =====================================================

const openPanel = ref(null)
const wardrobeButton = ref(null)

function togglePanel(panel) {
  openPanel.value = openPanel.value === panel ? null : panel
}

function closePanel() {
  const previousPanel = openPanel.value
  openPanel.value = null
  if (previousPanel === 'wardrobe') wardrobeButton.value?.focus()
}

const roomLinks = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    left: '74.7%',
    top: '34.8%',
    width: '11.5%',
    height: '23%',
    outline: 'M 2 2 L 98 2 L 98 98 L 2 98 Z'
  },
  {
    id: 'pokedex',
    label: 'Pokédex',
    path: '/collection',
    left: '12%',
    top: '49.6%',
    width: '11.3%',
    height: '11.2%',
    outline: 'M 2 8 Q 1 3 5 3 L 58 0 Q 61 0 62 4 L 70 66 L 98 79 Q 100 81 96 84 L 40 98 L 14 88 Z'
  },
  {
    id: 'pokepacks',
    label: 'Open Poképacks',
    path: '/rewards',
    left: '91%',
    top: '68.7%',
    width: '11.5%',
    height: '20%',
    outline: 'M 43 11 Q 41 0 52 0 Q 63 0 64 11 L 77 12 Q 88 15 91 35 L 96 56 L 99 84 Q 99 93 89 95 L 62 99 L 11 92 Q 2 91 2 80 L 3 68 L 9 57 L 12 34 Q 14 14 26 12 Z'
  }
]

const wardrobeArea = {
  left: `${(1400 + 272 / 2) / 1672 * 100}%`,
  top: `${(90 + 560 / 2) / 941 * 100}%`,
  width: `${272 / 1672 * 100}%`,
  height: `${560 / 941 * 100}%`,
  outline: 'M 1462 589 L 1404 577 L 1404 555 L 1408 551 L 1408 181 L 1401 176 L 1401 159 L 1638 92 L 1668 102 L 1668 633 L 1643 643 L 1610 634',
  hitArea: 'M 1401 159 L 1638 92 L 1668 102 L 1668 633 L 1643 643 L 1610 634 L 1596 592 L 1580 577 L 1550 574 Q 1545 554 1526 555 Q 1507 556 1506 574 L 1474 574 L 1462 589 L 1404 577 Z'
}

const exitDoorStyle = {
  left: `${334 / 1672 * 100}%`,
  top: `${195 / 941 * 100}%`,
  width: `${80 / 1672 * 100}%`,
  height: `${273 / 941 * 100}%`
}

const navigationMessage = ref('')

function openRoomPage(link) {
  if (!router.resolve(link.path).matched.length) {
    navigationMessage.value = `${link.label} is not available yet.`
    return
  }

  navigationMessage.value = ''
  router.push(link.path).catch(() => {
    navigationMessage.value = `Could not open ${link.label}. Please try again.`
  })
}

// =====================================================
// LIFECYCLE
// =====================================================

function handleSavedXpEvent() {
  void refreshTrainerBuddy()
}

onMounted(() => {
  void loadTrainerProfile()
  window.addEventListener('focus', loadTrainerProfile)
  window.addEventListener('studydex:pokemon-xp', handleSavedXpEvent)
})

onUnmounted(() => {
  pageActive = false
  giftRequestController?.abort()
  window.removeEventListener('focus', loadTrainerProfile)
  window.removeEventListener('studydex:pokemon-xp', handleSavedXpEvent)
})
</script>

<template>

  <main class="trainer-page">
    <section v-if="showXpTestButtons" class="xp-test-panel" aria-label="Pokémon XP testing">
      <strong>XP badge test</strong>
      <p>Preview only · not saved</p>
      <p v-if="selectedBuddyRecord" aria-live="polite">
        {{ selectedBuddyRecord.pokemon?.name }} · {{ previewXp ?? selectedBuddyRecord.xp ?? 0 }} XP
      </p>
      <div class="xp-test-actions">
        <button type="button" :disabled="!selectedBuddyRecord || !!xpTestResult"
          @click="testPokemonXp(50)">+50 XP</button>
        <button type="button" :disabled="!selectedBuddyRecord || !!xpTestResult"
          @click="testPokemonXp(-50)">−50 XP</button>
      </div>
      <p v-if="buddyLoadError" role="alert">{{ buddyLoadError }}</p>
    </section>

    <xpPrompt
      :result="experienceResult"
      offer-gift
      @close="experienceResult = null"
      @open-gift="handleOpenGift"
    />



    <StudydexBubbleNav current="bag" />

    <!-- Overlays the room from md up; sits above the room in normal flow on phones. -->
    <header class="trainer-hud">
      <div class="title-card">
        <h1>Trainer Home</h1>
      </div>
      <div class="trainer-clock">
        <ClockWeather
          :use-device-location="true"
          @rain-change="rainActive = $event"
        />
      </div>
    </header>

    <div class="trainer-scene">

      <TownBackground
        scene="room"
        :rain-active="rainActive"
        @image-error="reportImageError"
      />

      <div class="room-characters">

        <div class="carpet-party">
          <div v-if="selectedTrainer" class="trainer-figure">
            <div
              v-if="loadedIdle"
              :key="loadedIdle"
              class="trainer-idle"
              :style="{ backgroundImage: `url('${loadedIdle}')` }"
              role="img"
              :aria-label="`${selectedTrainer.label} avatar`"
            ></div>
            <img
              v-else
              :src="selectedTrainer.image"
              :alt="selectedTrainer.imageAlt || `${selectedTrainer.label} avatar`"
              class="trainer-sprite"
              draggable="false"
              @error="reportImageError"
            />
          </div>
          <div v-else class="trainer-figure scene-message">
            {{ avatarLoading ? 'Loading your avatar…' : 'Avatar unavailable. Open the wardrobe to retry.' }}
          </div>

          <div
            class="buddy-figure"
            aria-live="polite"
            @error.capture="buddyError = 'Your buddy could not load.'"
          >
            <span v-if="buddyLoading" class="scene-message">
              Loading…
            </span>

            <span v-else-if="buddyError" class="scene-message">
              {{ buddyError }}
            </span>


            <div class="trainer-pokemon" v-else-if="roomPokemon && buddySprite">

            <PokeSprite
              ref="pokemonBuddyRef"
              :key="roomPokemon.ownedId || roomPokemon.id"
              class="room-pokemon"
              :active-pokemon="roomPokemon"
              :fallback-src="roomPokemon.static_img"
              progress-position="bottom"
              facing="front"
              :max-xp="200"
              @update-pokemon="receivePokemonUpdate"
              @xp-overflow="receiveXpOverflow"
            />


            </div>

            <span v-else class="scene-message">
              No active buddy yet
            </span>


          </div>

          <!-- <div class="buddy-figure" aria-live="polite">
            <span v-if="buddyLoading" class="scene-message">
              Loading…
            </span>

            <span v-else-if="buddyError" class="scene-message">
              {{ buddyError }}
            </span>

            <img
              v-else-if="buddySprite"
              :src="buddySprite"
              :alt="activeBuddy?.name || 'Active Pokémon'"
              class="buddy-sprite"
              draggable="false"
              @error="buddyError = 'Your buddy could not load.'"
            />

            <span v-else class="scene-message">
              No active buddy yet
            </span>
          </div> -->
        </div>

        <BackToHome
          variant="custom"
          class="exit-door"
          :style="exitDoorStyle"
          aria-label="Leave room and return to town"
        >
          <svg class="door-outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M 0 0 L 100 8 L 100 100 L 0 100 Z" vector-effect="non-scaling-stroke" />
          </svg>
          <span class="hotspot-label" aria-hidden="true">Back to town</span>
        </BackToHome>

        <button
          v-for="link in roomLinks"
          :key="link.id"
          type="button"
          class="room-hotspot"
          :class="`hotspot-${link.id}`"
          :style="{ left: link.left, top: link.top, width: link.width, height: link.height }"
          :aria-label="link.label"
          @click="openRoomPage(link)"
        >
          <svg class="object-outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path :d="link.outline" vector-effect="non-scaling-stroke" />
          </svg>
          <span class="hotspot-label" aria-hidden="true">{{ link.label }}</span>
        </button>

        <button
          ref="wardrobeButton"
          type="button"
          class="room-hotspot wardrobe-hotspot"
          :style="{ left: wardrobeArea.left, top: wardrobeArea.top, width: wardrobeArea.width, height: wardrobeArea.height }"
          aria-label="Open wardrobe to change avatar"
          :aria-expanded="openPanel === 'wardrobe'"
          aria-controls="room-selection-panel"
          @click="togglePanel('wardrobe')"
        >
          <svg class="object-outline wardrobe-outline" viewBox="1400 90 272 560" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path class="wardrobe-hit" :d="wardrobeArea.hitArea" />
            <path class="wardrobe-stroke" :d="wardrobeArea.outline" vector-effect="non-scaling-stroke" />
          </svg>
          <span class="hotspot-label" aria-hidden="true">Change avatar</span>
        </button>

        <section
          v-if="openPanel"
          id="room-selection-panel"
          class="selection-panel"
          aria-labelledby="room-panel-title"
          @keydown.esc.stop="closePanel"
        >
          <header class="panel-header">
            <div>
              <small>TRAINER ROOM</small>
              <h2 id="room-panel-title">
                Your wardrobe
              </h2>
            </div>

            <button
              type="button"
              class="close-button"
              aria-label="Close selection panel"
              @click="closePanel"
            >
              ✕
            </button>
          </header>

          <template v-if="openPanel === 'wardrobe'">
            <p v-if="avatarLoading" role="status">Loading your saved avatar…</p>
            <div v-else-if="avatarLoadError" role="alert">
              <p>{{ avatarLoadError }}</p>
              <button type="button" @click="loadTrainerProfile">Try again</button>
            </div>
            <template v-else-if="profile">
              <div class="gender-options" aria-label="Trainer options">
                <button
                  v-for="option in avatarGroups"
                  :key="option.value"
                  type="button"
                  :aria-pressed="genderFilter === option.value"
                  :disabled="avatarSaving"
                  @click="genderFilter = option.value"
                >
                  {{ option.label }}
                </button>
              </div>

              <div class="variant-grid">
                <button
                  v-for="variant in visibleVariants"
                  :key="variant.id"
                  type="button"
                  class="variant-card"
                  :aria-pressed="selectedVariantId === variant.id"
                  :aria-label="`Equip ${variant.label} avatar`"
                  :disabled="avatarSaving || selectedVariantId === variant.id"
                  @click="selectTrainer(variant)"
                >
                  <img
                    :src="variant.image"
                    :alt="variant.imageAlt || `${variant.label} avatar`"
                    @error="reportImageError"
                  />
                  <strong>{{ variant.label }}</strong>
                  <small>
                    {{ selectedVariantId === variant.id ? 'Equipped ✓' : 'Equip' }}
                  </small>
                </button>
              </div>
            </template>
          </template>

          <p v-if="saveError" class="save-error" role="alert">
            {{ saveError }}
          </p>
          <p v-if="avatarSaving" role="status">Saving avatar…</p>
          <p v-else-if="saveMessage" role="status">{{ saveMessage }}</p>
        </section>
      </div>
    </div>

    <!-- Below md: one large button per room action, so nothing depends on
         small hotspots or labels squeezed into the phone-sized room. -->
    <nav class="room-menu" aria-label="Room menu">
      <button
        v-for="link in roomLinks"
        :key="`menu-${link.id}`"
        type="button"
        class="sd-btn room-menu-button"
        @click="openRoomPage(link)"
      >
        {{ link.label }}
      </button>
      <button
        type="button"
        class="sd-btn room-menu-button"
        :aria-expanded="openPanel === 'wardrobe'"
        aria-controls="room-selection-panel"
        @click="togglePanel('wardrobe')"
      >
        Change avatar
      </button>
      <BackToHome variant="button" class="room-menu-button" />
    </nav>

    <p v-if="navigationMessage" class="page-message" role="status">
      {{ navigationMessage }}
    </p>

    <section
      v-if="failedImages.length"
      class="image-errors"
      role="alert"
    >
      <strong>These images could not load:</strong>

      <ul>
        <li v-for="path in failedImages" :key="path">
          {{ path }}
        </li>
      </ul>

      <p>
        Check the filenames in your public folder, then refresh.
      </p>
    </section>
  </main>
</template>

<style scoped>
.xp-test-panel {
  position: fixed; right: 16px; bottom: 16px; z-index: 30;
  width: min(280px, calc(100vw - 32px)); padding: 16px;
  border: 2px solid #b998d8; border-radius: 18px;
  background: #fffdf8; color: #303557; box-shadow: 0 8px 24px #15102540;
}
.xp-test-panel p { margin: 6px 0 10px; font-size: var(--text-sm); }
.xp-test-actions { display: flex; gap: 8px; }
.xp-test-actions button {
  flex: 1; padding: 10px 14px; border: 0; border-radius: 10px;
  background: #7550ad; color: white; font: inherit; font-weight: 800; cursor: pointer;
}
.xp-test-actions button:last-child { background: #a44059; }
.xp-test-actions button:disabled { opacity: .5; cursor: not-allowed; }
.xp-test-actions button:focus-visible { outline: 3px solid #c19425; outline-offset: 3px; }


.trainer-page,
.trainer-page * { box-sizing: border-box; }

.trainer-page { position: relative; width: 100%; min-height: 100dvh; background: #101925; color: #fff; font-family: ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif; }

.trainer-scene { position: relative; width: 100%; aspect-ratio: 1672 / 941; overflow: hidden; isolation: isolate; background: #17243b; }

.trainer-hud { position: absolute; top: 24px; left: 24px; z-index: 10; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }

.title-card { padding: 12px 18px; border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 18px; background: rgba(22, 39, 62, 0.65); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 5px 16px rgba(5, 15, 30, 0.18); }

.title-card h1 { margin: 0; font-size: 21px; font-weight: 800; line-height: 1.2; }

.image-errors { margin: 16px; padding: 16px; border: 1px solid #f39b9b; border-radius: 12px; background: #482631; color: #ffe5e5; font-size: var(--text-sm); line-height: 1.6; overflow-wrap: anywhere; }

.image-errors ul { margin: 8px 0; padding-left: 20px; }

.image-errors p { margin: 8px 0 0; }

/* md to lg: clock beside the title, so the HUD clears the door and desk labels. */
@media (min-width: 768px) and (max-width: 991.98px) {
  .trainer-hud { flex-direction: row; align-items: flex-start; }
}

/* Below md: the HUD leaves the room overlay and sits above it in normal flow,
   so it can never cover a room button. */
@media (max-width: 767.98px) {
  .trainer-hud {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 16px;
  }

  .title-card { padding: 8px 14px; border-radius: var(--radius-md); }

  .title-card h1 { font-size: var(--text-lg); }
}

.room-characters { position: absolute; inset: 0; z-index: 6; pointer-events: none; --party-left: 51%; --party-feet: 85%;  }

.room-characters button { font-family: inherit; cursor: pointer; pointer-events: auto; }

.room-characters button:focus-visible { outline: 3px solid #ffe58c; outline-offset: 4px; }

.carpet-party { position: absolute; left: var(--party-left); top: var(--party-feet); width: 33%; display: flex; flex-direction: row-reverse; justify-content: center; align-items: flex-end; gap: 6%; transform: translate(-50%, -100%); }

.trainer-figure { width: 63%; flex-shrink: 0; }

.buddy-figure { width: 70%; flex-shrink: 0; min-width: 0; }

.trainer-sprite {
  display: block;
  width: 100%;
  height: auto;
  image-rendering: pixelated;
  user-select: none;
  filter: drop-shadow(0 5px 2px rgb(35 28 24 / 28%));
}

.scene-message { display: block; padding: 6px; background: #fff6dd; border-radius: 8px; color: #493c2e; font-size: var(--text-sm); text-align: center; }

.selection-panel { position: absolute; top: 6%; right: 3%; width: min(350px, 90%); max-height: 84%; overflow: auto; box-sizing: border-box; padding: 20px; border: 3px solid #624b38; border-radius: 20px; background: #fff8e9; color: #493b30; box-shadow: 0 9px 0 rgb(70 45 28 / 30%); pointer-events: auto; }

.panel-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }

.panel-header small { color: #776a51; font-size: var(--text-sm); font-weight: 800; letter-spacing: 1px; }

.panel-header h2 { margin: 5px 0 0; font-size: 22px; }

.close-button { width: var(--tap-min); height: var(--tap-min); flex-shrink: 0; border: 1px solid #cfbd99; border-radius: 10px; background: #eee3cc; color: #493b30; }

.gender-options { display: flex; gap: 8px; margin-bottom: 16px; }

.gender-options button { flex: 1; min-height: var(--tap-min); padding: 10px; border: 2px solid #d9caa8; border-radius: 10px; background: #fffdf6; color: #493b30; text-transform: capitalize; }

.variant-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }

.variant-card { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 14px 8px; border: 2px solid #d9caa8; border-radius: 14px; background: #fffdf6; color: #493b30; }

.variant-card img { width: 75px; height: 110px; object-fit: contain; image-rendering: pixelated; }

.variant-card strong { font-size: var(--text-sm); }

.variant-card small { font-size: var(--text-sm); }

.selection-panel button[aria-pressed='true'] { border-color: #547555; background: #e4edda; }

.save-error { font-size: var(--text-sm); line-height: 1.5; }

.save-error { color: #9a382a; }

/* Below md the wardrobe opens as a wood-framed bottom sheet over the page,
   instead of a tiny scroll box inside the phone-sized room. */
@media (max-width: 767.98px) {
  .selection-panel {
    position: fixed;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 50;
    width: 100%;
    max-height: 75dvh;
    padding: 16px;
    border-radius: 20px 20px 0 0;
  }
}
.page-message { margin: 0; padding: 16px; text-align: center; background: #142033; }

.room-characters .room-hotspot {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 0;
  border: 0;
  background: transparent;
  color: #46392d;
  overflow: visible;
  pointer-events: none;
}
.object-outline {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  opacity: 0;
  pointer-events: none;
  transition: opacity 140ms ease;
  filter: drop-shadow(0 0 3px rgb(255 213 64 / 65%));
}
.object-outline path {
  fill: transparent;
  stroke: #ffdc55;
  stroke-width: 1.7px;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: all;
  cursor: pointer;
}
.hotspot-label {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 10px;
  border: 2px solid #594334;
  border-radius: 10px;
  background: #fff4d9;
  box-shadow: 0 3px 0 #594334;
  white-space: nowrap;
  font-size: var(--text-sm);
  font-weight: 800;
  pointer-events: none;
  opacity: 1;
  transition: opacity 140ms ease;
}
.wardrobe-hotspot .hotspot-label { top: 60%; }
/* Hotspots near the room's edges: pin the label inside the room. */
.hotspot-studydecks .hotspot-label { left: 0; transform: none; }
.hotspot-pokepacks .hotspot-label,
.wardrobe-hotspot .hotspot-label { left: auto; right: 0; transform: none; }
@media (hover: hover) {
  .room-hotspot:hover .hotspot-label { opacity: 0; }
  .room-hotspot:hover .object-outline { opacity: 1; }
}
.room-characters .room-hotspot:focus-visible { outline: none; }
.room-hotspot:focus-visible .hotspot-label { opacity: 1; }
.room-hotspot:focus-visible .object-outline,
.room-hotspot:active .object-outline { opacity: 1; }
.room-hotspot:active .object-outline path { stroke: #fff2ab; stroke-width: 2.5px; }
/* Below md the room menu carries the words, so labels can't be clipped. */
@media (max-width: 767.98px) {
  .hotspot-label { display: none; }

  /* Phone-sized room: give each small hotspot a full 44 × 44 tap area
     centred on its furniture (the outline and art stay the same size). */
  .room-characters .room-hotspot:not(.wardrobe-hotspot)::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: max(100%, var(--tap-min));
    height: max(100%, var(--tap-min));
    transform: translate(-50%, -50%);
    pointer-events: auto;
  }
}
@media (prefers-reduced-motion: reduce) {
  .object-outline, .hotspot-label { transition: none; }
}
/* Separate the cupboard's invisible hit area from its visible open outline. */
.wardrobe-outline .wardrobe-hit { fill: transparent; stroke: none; pointer-events: all; }
.wardrobe-outline .wardrobe-stroke { fill: none; pointer-events: none; }

/* Four 512 × 768 crops from the 2048 × 768 generated strips.
   Offsets compensate for the artwork's nonuniform cell placement. */
.trainer-idle {
  width: 100%;
  aspect-ratio: 2 / 3;
  background-repeat: no-repeat;
  background-size: 400% 100%;
  background-position: 4.166667% 0;
  image-rendering: pixelated;
  filter: drop-shadow(0 5px 2px rgb(35 28 24 / 28%));
  animation: trainer-idle-loop 4s steps(1, end) infinite;
}
@keyframes trainer-idle-loop {
  0%, 100% { background-position: 4.166667% 0; }
  45% { background-position: 34.765625% 0; }
  72% { background-position: 65.364583% 0; }
  75% { background-position: 95.963542% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .trainer-idle { animation: none; }
}

/* Static exit door: label and hover outline over the room artwork. */
.room-characters .exit-door {
  position: absolute;
  padding: 0;
  border: 0;
  background: transparent;
  color: #46392d;
  pointer-events: auto;
  cursor: pointer;
}
.door-outline {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  opacity: 0;
  pointer-events: none;
  filter: drop-shadow(0 0 3px rgb(255 213 64 / 65%));
  transition: opacity 140ms ease;
}
.door-outline path { fill: none; stroke: #ffdc55; stroke-width: 1.7px; stroke-linejoin: round; }
.exit-door .hotspot-label { top: 48%; bottom: auto; left: 50%; transform: translate(-50%, -50%); width: max-content; padding: 5px 8px; white-space: nowrap; text-align: center; line-height: 1.2; font-size: var(--text-sm); }
/* The door is narrow on small screens: keep a 44px-wide tap area on it. */
.room-characters .exit-door::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: max(100%, var(--tap-min));
  transform: translateX(-50%);
}
@media (hover: hover) {
  .exit-door:hover .door-outline { opacity: 1; }
  .exit-door:hover .hotspot-label { opacity: 0; }
}
.room-characters .exit-door:focus-visible { outline: none; }
.exit-door:focus-visible .door-outline { opacity: 1; }
.exit-door:focus-visible .hotspot-label { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .door-outline { transition: none; }
}

/* =========================================
   POKÉMON — ALWAYS-VISIBLE XP PANEL BELOW
   ========================================= */

.room-pokemon {
  position: relative;
  isolation: isolate;
  display: block;
  width: 100%;
  min-width: 0;
  padding: 0;
  overflow: visible;
}

/* Remove the old hover-panel background. */
.room-pokemon::before {
  content: none;
}

/* Hide standalone headings and extra text.
   The shared panel already displays the level and XP. */
.room-pokemon :deep(h2),
.room-pokemon :deep(h3),
.room-pokemon :deep(.buddy-message),
.room-pokemon :deep(.buddy-error),
.room-pokemon :deep(.buddy-status),
.room-pokemon :deep(.buddy-placeholder) {
  display: none;
}

/* Keep positioning controlled by PokeSprite. */
.room-pokemon :deep(.buddy-image-container) {
  width: 100%;
  margin: 0;
  cursor: default;
}

/* Preserve the Pokémon sprite styling. */
.room-pokemon :deep(.buddy-sprite) {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  user-select: none;
  cursor: default;
}

/* Apply the shadow only while idle so evolution
   and defeated-state filters remain available. */
.room-pokemon :deep(.buddy-sprite:not(.charging):not(.swapping):not(.revealing):not(.defeated)) {
  filter: drop-shadow(0 5px 2px rgb(35 28 24 / 28%));
}

/* Always show the shared level and XP panel.
   Its colours, typography and bar stay consistent
   with the other pages. */
.room-pokemon :deep(.buddy-progress) {
  top: auto;
  bottom: calc(100% + 8px);
  width: 180px;
  max-width: calc(100vw - 32px);
  opacity: 1;
  visibility: visible;
  pointer-events: none;
}

.trainer-clock {
  position: relative;
  z-index: 10;
}

@media (max-width: 575.98px) {
  .trainer-clock {
    max-width: calc(100vw - 24px);
  }
}

/* Room menu: hidden from md up, where the room's hotspots and labels fit. */
.room-menu { display: none; }

@media (max-width: 767.98px) {
  .trainer-page {
    display: flex;
    flex-direction: column;
    padding-bottom: 104px; /* scroll clear of the Menu bubble */
  }

  /* Dev-only XP test panel: in the page flow after the room menu, not over it. */
  .xp-test-panel {
    position: static;
    order: 10;
    width: auto;
    margin: 0 16px 16px;
  }

  .room-menu {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
    gap: 12px;
    margin: 16px;
    padding: 16px;
    border: 3px solid var(--gold-500);
    border-radius: var(--radius-md);
    background: var(--navy-900);
  }

  .room-menu .room-menu-button {
    width: 100%;
    min-height: 56px;
    font-size: var(--text-lg);
    text-align: center;
  }

  .room-menu .room-menu-button:focus-visible { outline: 3px solid var(--sd-focus-on-dark); outline-offset: 3px; }
}

.trainer-pokemon { width: min(250px, 100%); aspect-ratio: 1; }
.room-pokemon { height: auto; aspect-ratio: 1; }
.room-pokemon :deep(.buddy-stage) {
  height: auto;
  min-height: 0;
  aspect-ratio: 1;
  flex: 0 0 auto;
}
.room-pokemon :deep(.buddy-image-container) {
  top: auto;
  bottom: 0;
  height: 100%;
}

</style>
