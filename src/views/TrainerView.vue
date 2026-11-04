<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { getCurrentProfile } from '../services/profileService'
import { updateCurrentAvatar } from '../services/accountService'
import { getSelectedStudyBuddy, resolveStudyImage } from '../services/studyService'
import { avatarOptions } from '../data/avatarOptions'

import BackToHome from '../components/common/BackToHome.vue'

import StudydexBubbleNav from '../components/common/StudydexBubbleNav.vue'

import PokemonBuddy from '@/components/pokebuddy/PokemonBuddy.vue'
import ClockWeather from '@/components/common/ClockWeather.vue'
import TownBackground from '@/components/common/TownBackground.vue'

// =====================================================
// CONFIGURATION AND PAGE IMAGES
// =====================================================


const router = useRouter()
const POKE_API_URL = (import.meta.env.VITE_POKE_API_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '')

// Weather is fetched inside ClockWeather; this only forwards its output.
const rainActive = ref(false)

const failedImages = ref([])

function reportImageError(event) {
  const path = new URL(event.target.src).pathname

  if (!failedImages.value.includes(path)) {
    failedImages.value.push(path)
  }
}

// =====================================================
// TRAINER AVATAR — AUTHENTICATED PROFILE
// =====================================================

const profile = ref(null)
const savedActiveBuddy = ref(null)

const avatarLoading = ref(false)
const avatarSaving = ref(false)
const avatarLoadError = ref('')

const saveError = ref('')
const saveMessage = ref('')

let avatarPageActive = true

const trainerVariants = avatarOptions.map(option => ({
  ...option,
  id: option.value
}))

const selectedTrainer = computed(() =>
  trainerVariants.find(
    item => item.value === profile.value?.avatar_choice
  ) ?? null
)

const selectedVariantId = computed(() =>
  selectedTrainer.value?.id ?? ''
)

const genderFilter = ref('male')

const visibleVariants = computed(() =>
  trainerVariants.filter(
    item => item.value === genderFilter.value
  )
)

// Use the original avatar while its idle image is unavailable.
const loadedIdle = ref('')

watch(
  () => selectedTrainer.value?.idleImage,
  (src, previous, onCleanup) => {
    loadedIdle.value = ''

    if (!src) return

    const image = new Image()

    image.onload = () => {
      loadedIdle.value = src
    }

    image.onerror = () => {
      loadedIdle.value = ''
    }

    onCleanup(() => {
      image.onload = null
      image.onerror = null
    })

    image.src = src
  },
  { immediate: true }
)

async function loadTrainerProfile() {
  if (avatarLoading.value || avatarSaving.value) return

  avatarLoading.value = true
  avatarLoadError.value = ''

  try {
    const saved = await getCurrentProfile()

    if (!avatarPageActive) return

    profile.value = saved
    genderFilter.value = saved.avatar_choice
    buddyLoading.value = true
    try {
      savedActiveBuddy.value = await getSelectedStudyBuddy(saved.id)
      buddyError.value = ''
    } catch {
      savedActiveBuddy.value = null
      buddyError.value = 'Your active Pokémon could not load.'
    } finally {
      buddyLoading.value = false
    }
  } catch (error) {
    if (avatarPageActive) {
      avatarLoadError.value =
        error.message ||
        'Your avatar could not load. Please try again.'
    }
  } finally {
    if (avatarPageActive) {
      avatarLoading.value = false
    }
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

    if (!avatarPageActive) return

    profile.value = saved
    saveMessage.value = 'Avatar saved to your profile.'
  } catch (error) {
    if (avatarPageActive) {
      saveError.value =
        error.message ||
        'Your avatar could not be saved. Please try again.'
    }
  } finally {
    if (avatarPageActive) {
      avatarSaving.value = false
    }
  }
}

// =====================================================
// The active buddy always comes from the signed-in profile's selected record.
const activeBuddy = computed(() => {
  const record = savedActiveBuddy.value
  if (!record?.pokemon) return null
  const pokemonName = record.pokemon.name
  const pokemonId = pokemonName.toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/\s+/g, '-')

  return {
    ownedId: record.id,
    pokemon_id: record.pokemon.id,
    id: pokemonId,
    name: pokemonName,
    xp: record.xp ?? 0,
    level: record.level ?? 1,
    isDefeated: false,
    static_img: resolveStudyImage(record.pokemon.sprite_url),
  }
})

// =====================================================
// FETCH THE BUDDY IMAGE
// Cached for this page visit.
// =====================================================

const buddySprite = ref('')
const buddyLoading = ref(false)
const buddyError = ref('')

const spriteCache = new Map()

watch(
  () => activeBuddy.value?.id,
  async (id, previousId, onCleanup) => {
    const controller = new AbortController()
    let cancelled = false

    onCleanup(() => {
      cancelled = true
      controller.abort()
    })

    buddySprite.value = ''
    buddyError.value = ''
    buddyLoading.value = false

    if (!id) return

    const fallback = activeBuddy.value.static_img
    buddyLoading.value = true

    try {
      let sprite = spriteCache.get(id)

      if (!sprite) {
        const response = await fetch(
          `${POKE_API_URL}/pokemon/${id}/`,
          { signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error('Could not load Pokémon')
        }

        const data = await response.json()

        sprite =
          data.sprites?.versions?.['generation-v']?.['black-white']
            ?.animated?.front_default ||
          data.sprites?.front_default ||
          fallback

        if (sprite) {
          spriteCache.set(id, sprite)
        }
      }

      if (cancelled) return

      buddySprite.value = sprite || ''

      if (!buddySprite.value) {
        buddyError.value = 'No sprite available.'
      }
    } catch (error) {
      if (cancelled || error.name === 'AbortError') return

      buddySprite.value = fallback

      if (!fallback) {
        buddyError.value = 'Your buddy could not load.'
      }
    } finally {
      if (!cancelled) {
        buddyLoading.value = false
      }
    }
  },
  { immediate: true }
)

// The single object passed to PokemonBuddy.
// All sample species above are their initial forms.
const roomPokemon = computed(() => {
  if (!activeBuddy.value) return null

  return {
    ...activeBuddy.value,
    animated_img: buddySprite.value,
    evolution_stage: 0
  }
})

// =====================================================
// WARDROBE PANEL
// =====================================================

const openPanel = ref(null)
const wardrobeButton = ref(null)

function togglePanel(panel) {
  openPanel.value = openPanel.value === panel ? null : panel
}

function closePanel() {
  const previousPanel = openPanel.value
  openPanel.value = null

  if (previousPanel === 'wardrobe') {
    wardrobeButton.value?.focus()
  }
}

// =====================================================
// ROOM LINKS AND CLICKABLE AREAS
// =====================================================

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
    id: 'studydecks',
    label: 'Visit Poké Lab in town',
    path: '/home',
    left: '12%',
    top: '49.6%',
    width: '11.3%',
    height: '11.2%',
    outline:
      'M 2 8 Q 1 3 5 3 L 58 0 Q 61 0 62 4 L 70 66 L 98 79 Q 100 81 96 84 L 40 98 L 14 88 Z'
  },
  {
    id: 'pokepacks',
    label: 'Open Poképacks',
    path: '/rewards',
    left: '91%',
    top: '68.7%',
    width: '11.5%',
    height: '20%',
    outline:
      'M 43 11 Q 41 0 52 0 Q 63 0 64 11 L 77 12 Q 88 15 91 35 L 96 56 L 99 84 Q 99 93 89 95 L 62 99 L 11 92 Q 2 91 2 80 L 3 68 L 9 57 L 12 34 Q 14 14 26 12 Z'
  }
]

// Coordinates match the 1672 × 941 room artwork.
const wardrobeArea = {
  left: `${(1400 + 272 / 2) / 1672 * 100}%`,
  top: `${(90 + 560 / 2) / 941 * 100}%`,
  width: `${272 / 1672 * 100}%`,
  height: `${560 / 941 * 100}%`,

  outline:
    'M 1462 589 L 1404 577 L 1404 555 L 1408 551 L 1408 181 L 1401 176 L 1401 159 L 1638 92 L 1668 102 L 1668 633 L 1643 643 L 1610 634',

  hitArea:
    'M 1401 159 L 1638 92 L 1668 102 L 1668 633 L 1643 643 L 1610 634 L 1596 592 L 1580 577 L 1550 574 Q 1545 554 1526 555 Q 1507 556 1506 574 L 1474 574 L 1462 589 L 1404 577 Z'
}

const exitDoorStyle = {
  left: `${334 / 1672 * 100}%`,
  top: `${195 / 941 * 100}%`,
  width: `${80 / 1672 * 100}%`,
  height: `${273 / 941 * 100}%`
}

// =====================================================
// NAVIGATION
// =====================================================

const navigationMessage = ref('')

function openRoomPage(link) {
  if (!router.resolve(link.path).matched.length) {
    navigationMessage.value = `${link.label} is not available yet.`
    return
  }

  navigationMessage.value = ''

  router.push(link.path).catch(() => {
    navigationMessage.value =
      `Could not open ${link.label}. Please try again.`
  })
}
// =====================================================
// LIFECYCLE
// =====================================================

onMounted(() => {
  // Load trainer profile
  loadTrainerProfile()

  window.addEventListener(
    'focus',
    loadTrainerProfile
  )
})

onUnmounted(() => {
  avatarPageActive = false

  window.removeEventListener(
    'focus',
    loadTrainerProfile
  )
})
</script>

<template>

  <main class="trainer-page">

    <StudydexBubbleNav current="bag" />

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

            <PokemonBuddy
              v-else-if="roomPokemon && buddySprite"
              :key="roomPokemon.ownedId || roomPokemon.id"
              class="room-pokemon"
              :active-pokemon="roomPokemon"
            />

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
                  v-for="option in avatarOptions"
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

     <header class="trainer-hud">
      <div class="title-card">
        <span class="title-eyebrow">STUDYDEX</span>
        <h1>Trainer Home</h1>
      </div>
    </header>

    <div class="trainer-clock">
      <ClockWeather
        :use-device-location="true"
        @rain-change="rainActive = $event"
      />
    </div>
    </div>

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

.trainer-page,
.trainer-page * { box-sizing: border-box; }

.trainer-page { width: 100%; min-height: 100dvh; background: #101925; color: #fff; font-family: ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif; }

.trainer-scene { position: relative; width: 100%; aspect-ratio: 1672 / 941; overflow: hidden; isolation: isolate; background: #17243b; }

.trainer-hud { position: absolute; top: 24px; left: 24px; z-index: 10; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }

.title-card { padding: 12px 18px; border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 18px; background: rgba(22, 39, 62, 0.65); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 5px 16px rgba(5, 15, 30, 0.18); }

.title-eyebrow { color: #ffe29a; font-size: 9px; font-weight: 900; letter-spacing: 2px; }

.title-card h1 { margin: 3px 0 0; font-size: 21px; font-weight: 800; line-height: 1.2; }

.image-errors { margin: 16px; padding: 16px; border: 1px solid #f39b9b; border-radius: 12px; background: #482631; color: #ffe5e5; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }

.image-errors ul { margin: 8px 0; padding-left: 20px; }

.image-errors p { margin: 8px 0 0; }

@media (max-width: 600px) {
.trainer-hud { top: 10px; left: 10px; gap: 6px; }

.title-card { padding: 7px 10px; border-radius: 12px; }

.title-eyebrow { font-size: 7px; }

.title-card h1 { font-size: 14px; }

}

.room-characters { position: absolute; inset: 0; z-index: 6; pointer-events: none; --party-left: 51%; --party-feet: 85%;  }

.room-characters button { font-family: inherit; cursor: pointer; pointer-events: auto; }

.room-characters button:focus-visible { outline: 3px solid #ffe58c; outline-offset: 4px; }

.carpet-party { position: absolute; left: var(--party-left); top: var(--party-feet); width: 33%; display: flex; flex-direction: row-reverse; justify-content: center; align-items: flex-end; gap: 6%; transform: translate(-50%, -100%); }

.trainer-figure { width: 63%; flex-shrink: 0; }

.buddy-figure { width: 26.36%; flex-shrink: 0; min-width: 0; }

.trainer-sprite {
  display: block;
  width: 100%;
  height: auto;
  image-rendering: pixelated;
  user-select: none;
  filter: drop-shadow(0 5px 2px rgb(35 28 24 / 28%));
}

.scene-message { display: block; padding: 6px; background: #fff6dd; border-radius: 8px; color: #493c2e; font-size: clamp(9px, 1vw, 13px); text-align: center; }

.selection-panel { position: absolute; top: 6%; right: 3%; width: min(350px, 90%); max-height: 84%; overflow: auto; box-sizing: border-box; padding: 20px; border: 3px solid #624b38; border-radius: 20px; background: #fff8e9; color: #493b30; box-shadow: 0 9px 0 rgb(70 45 28 / 30%); pointer-events: auto; }

.panel-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }

.panel-header small { color: #776a51; font-size: 10px; font-weight: 800; letter-spacing: 2px; }

.panel-header h2 { margin: 5px 0 0; font-size: 22px; }

.close-button { width: 34px; height: 34px; flex-shrink: 0; border: 1px solid #cfbd99; border-radius: 10px; background: #eee3cc; color: #493b30; }

.gender-options { display: flex; gap: 8px; margin-bottom: 16px; }

.gender-options button { flex: 1; padding: 10px; border: 2px solid #d9caa8; border-radius: 10px; background: #fffdf6; color: #493b30; text-transform: capitalize; }

.variant-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }

.variant-card { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 14px 8px; border: 2px solid #d9caa8; border-radius: 14px; background: #fffdf6; color: #493b30; }

.variant-card img { width: 75px; height: 110px; object-fit: contain; image-rendering: pixelated; }

.variant-card strong { font-size: 13px; }

.variant-card small { font-size: 11px; }

.selection-panel button[aria-pressed='true'] { border-color: #547555; background: #e4edda; }

.save-error { font-size: 13px; line-height: 1.5; }

.save-error { color: #9a382a; }

@media (max-width: 600px) {

.selection-panel { top: 3%; right: 3%; max-height: 94%; padding: 14px; }
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
  font-size: clamp(10px, 1vw, 14px);
  font-weight: 800;
  pointer-events: none;
  opacity: 1;
  transition: opacity 140ms ease;
}
.wardrobe-hotspot .hotspot-label { top: 60%; }
@media (hover: hover) {
  .room-hotspot:hover .hotspot-label { opacity: 0; }
  .room-hotspot:hover .object-outline { opacity: 1; }
}
.room-characters .room-hotspot:focus-visible { outline: none; }
.room-hotspot:focus-visible .hotspot-label { opacity: 0; }
.room-hotspot:focus-visible .object-outline,
.room-hotspot:active .object-outline { opacity: 1; }
.room-hotspot:active .object-outline path { stroke: #fff2ab; stroke-width: 2.5px; }
@media (max-width: 600px) {
  .hotspot-label { padding: 3px 5px; border-width: 1px; }
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
.exit-door .hotspot-label { top: 48%; bottom: auto; left: 50%; transform: translate(-50%, -50%); width: 88%; padding: 5px 3px; white-space: normal; text-align: center; line-height: 1.2; font-size: clamp(8px, 0.8vw, 13px); }
@media (hover: hover) {
  .exit-door:hover .door-outline { opacity: 1; }
  .exit-door:hover .hotspot-label { opacity: 0; }
}
.room-characters .exit-door:focus-visible { outline: none; }
.exit-door:focus-visible .door-outline { opacity: 1; }
.exit-door:focus-visible .hotspot-label { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .door-outline { transition: none; }
}

/* Poke component */
/* Image-only Pokémon component inside the room */

.room-pokemon {
  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
  padding: 0;
}

/* Hide the heading and extra messages only */
.room-pokemon :deep(h2),
.room-pokemon :deep(.buddy-message),
.room-pokemon :deep(.buddy-error),
.room-pokemon :deep(.buddy-status),
.room-pokemon :deep(.buddy-placeholder) {
  display: none;
}

/* Pokémon name */
.room-pokemon :deep(h3) {
  position: absolute;
  bottom: calc(100% + 68px);
  left: 50%;
  transform: translateX(-50%);

  width: 180px;
  margin: 0;
  color: #26365b;
  font-size: 17px;
  font-weight: 800;
  text-align: center;
}

/* Pokémon level */
.room-pokemon :deep(.buddy-level) {
  position: absolute;
  bottom: calc(100% + 48px);
  left: 50%;
  transform: translateX(-50%);

  width: 180px;
  margin: 0;
  color: #493c2e;
  font-size: 12px;
  text-align: center;
}

/* XP information above the sprite */
.room-pokemon :deep(.buddy-xp) {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);

  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 5px 8px;

  width: 160px;
  max-width: none;
  margin: 0;
}

.room-pokemon :deep(.buddy-xp > p) {
  margin: 0;
  color: #493c2e;
  font-size: 10px;
}

.room-pokemon :deep(.buddy-xp > p:first-child) {
  grid-column: 1;
  grid-row: 1;
  text-align: left;
}

.room-pokemon :deep(.buddy-xp > p:last-child) {
  grid-column: 2;
  grid-row: 1;
  text-align: right;
  white-space: nowrap;
}

.room-pokemon :deep(.xp-track) {
  grid-column: 1 / -1;
  grid-row: 2;

  width: 100%;
  height: 9px;
  margin: 0;
  overflow: hidden;
  border-radius: 999px;
  background: #e5e9df;
  image-rendering: pixelated;
}

.room-pokemon :deep(.xp-fill) {
  height: 100%;
  border-radius: inherit;
  background: #78c98b;
}

/* Preserve the sprite size and evolution effects */
.room-pokemon :deep(.buddy-image-container) {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  margin: 0;
}

.room-pokemon :deep(.buddy-sprite) {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  user-select: none;
  filter: drop-shadow(0 5px 2px rgb(35 28 24 / 28%));
}

@media (max-width: 600px) {
  .room-pokemon :deep(h3) {
    width: 130px;
    font-size: 14px;
  }

  .room-pokemon :deep(.buddy-level) {
    width: 130px;
    font-size: 11px;
  }

  .room-pokemon :deep(.buddy-xp) {
    width: 130px;
  }
}

.room-pokemon {
  isolation: isolate;
}

.room-pokemon::before {
  content: '';
  position: absolute;
  bottom: calc(100% - 2px);
  left: 50%;
  transform: translateX(-50%);

  width: 200px;
  height: 110px;
  background: #fff0e8;
  border-radius: 14px;

  z-index: -1;
  pointer-events: none;
}

@media (max-width: 600px) {
  .room-pokemon::before {
    width: 150px;
  }
}

/* =========================================
   PICHU — HOVER TO SHOW NAME, LEVEL AND XP
   ========================================= */

/* Allow mouse interaction with the Pokémon */
.buddy-figure {
  pointer-events: auto;
}

.room-pokemon {
  pointer-events: auto;
}

/* Make the actual sprite hoverable */
.room-pokemon :deep(.buddy-image-container),
.room-pokemon :deep(.buddy-sprite) {
  pointer-events: auto;
  cursor: pointer;
}

/* Hide information by default */
.room-pokemon :deep(h3),
.room-pokemon :deep(.buddy-level),
.room-pokemon :deep(.buddy-xp) {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;

  transition:
    opacity 0.25s ease,
    visibility 0.25s ease;
}

/* Hide information background by default */
.room-pokemon::before {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;

  transition:
    opacity 0.25s ease,
    visibility 0.25s ease;
}

/* Show information when hovering on Pokémon image */
.room-pokemon:has(.buddy-image-container:hover) :deep(h3),
.room-pokemon:has(.buddy-image-container:hover) :deep(.buddy-level),
.room-pokemon:has(.buddy-image-container:hover) :deep(.buddy-xp) {
  opacity: 1;
  visibility: visible;
}

/* Show the information panel background */
.room-pokemon:has(.buddy-image-container:hover)::before {
  opacity: 1;
  visibility: visible;
}

.trainer-clock {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 10;
}

@media (max-width: 600px) {
  .trainer-clock {
    top: 12px;
    right: 12px;
  }
}

</style>
