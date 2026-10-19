<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const base = import.meta.env.BASE_URL

const images = {
  room: `${base}trainer-home/trainer-home-v2.png`,
  landscape: `${base}trainer-home/window-landscape-clean.png`,
  sun: `${base}home/sun.png`,
  moon: `${base}home/moon.png`,
  stars: `${base}home/stars.png`,
  clouds: `${base}home/cloud.png`,
}
const failedImages = ref([])

function reportImageError(event) {
  const path = new URL(event.target.src).pathname

  if (!failedImages.value.includes(path)) {
    failedImages.value.push(path)
  }
}

const currentTime = ref(new Date())
let clockInterval

function refreshClock() {
  currentTime.value = new Date()
}

onMounted(() => {
  refreshClock()
  clockInterval = setInterval(refreshClock, 1000)
  document.addEventListener('visibilitychange', refreshClock)
})

onUnmounted(() => {
  clearInterval(clockInterval)
  document.removeEventListener('visibilitychange', refreshClock)
})

const hour = computed(() => {
  const now = currentTime.value
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
})

const displayTime = computed(() => {
  const totalMinutes = Math.floor(hour.value * 60)

  const hours = String(
    Math.floor(totalMinutes / 60)
  ).padStart(2, '0')

  const minutes = String(
    totalMinutes % 60
  ).padStart(2, '0')

  return `${hours}:${minutes}`
})

const frames = [
  {
    hour: 0,
    name: 'Night',
    top: '#03091c',
    horizon: '#142744',
    brightness: 0.5,
    saturation: 0.8,
    cloud: 0.3,
    stars: 1,
    lights: 1,
  },
  {
    hour: 5.5,
    name: 'Night',
    top: '#081229',
    horizon: '#354564',
    brightness: 0.38,
    saturation: 0.7,
    cloud: 0.38,
    stars: 0.8,
    lights: 1,
  },
  {
    hour: 8,
    name: 'Day',
    top: '#258be0',
    horizon: '#c7eeff',
    brightness: 1,
    saturation: 1.06,
    cloud: 1,
    stars: 0,
    lights: 0,
  },
  {
    hour: 12,
    name: 'Day',
    top: '#1685df',
    horizon: '#c4efff',
    brightness: 1.04,
    saturation: 1.1,
    cloud: 1,
    stars: 0,
    lights: 0,
  },
  {
    hour: 15.5,
    name: 'Afternoon',
    top: '#579bd5',
    horizon: '#ffe0ad',
    brightness: 1.02,
    saturation: 1.08,
    cloud: 0.95,
    stars: 0,
    lights: 0,
  },
  {
    hour: 18.5,
    name: 'Sunset',
    top: '#67518e',
    horizon: '#ffad7b',
    brightness: 0.82,
    saturation: 1.05,
    cloud: 0.78,
    stars: 0.03,
    lights: 0.15,
  },
  {
    hour: 19.25,
    name: 'Dusk',
    top: '#30345f',
    horizon: '#a77b9d',
    brightness: 0.58,
    saturation: 0.85,
    cloud: 0.58,
    stars: 0.35,
    lights: 0.55,
  },
  {
    hour: 20.5,
    name: 'Evening',
    top: '#101f43',
    horizon: '#405477',
    brightness: 0.43,
    saturation: 0.75,
    cloud: 0.4,
    stars: 0.75,
    lights: 0.9,
  },
  {
    hour: 22,
    name: 'Night',
    top: '#03091c',
    horizon: '#142744',
    brightness: 0.5,
    saturation: 0.8,
    cloud: 0.3,
    stars: 1,
    lights: 1,
  },
]

frames.push({ ...frames[0], hour: 24 })

const lerp = (a, b, t) => a + (b - a) * t

function mixColor(firstHex, secondHex, t) {
  const toRgb = hex =>
    hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16))

  const first = toRgb(firstHex)
  const second = toRgb(secondHex)

  const result = first.map((value, index) =>
    Math.round(lerp(value, second[index], t))
  )

  return `rgb(${result.join(',')})`
}

const lighting = computed(() => {
  const index = frames.findIndex((frame, i) =>
    i < frames.length - 1 &&
    hour.value >= frame.hour &&
    hour.value < frames[i + 1].hour
  )

  const safeIndex = Math.max(0, index)

  const a = frames[safeIndex]
  const b = frames[safeIndex + 1]

  const progress = Math.max(
    0,
    Math.min(
      1,
      (hour.value - a.hour) / (b.hour - a.hour)
    )
  )
  const t = progress * progress * (3 - 2 * progress)

  const result = {
    name: t < 0.5 ? a.name : b.name,
    top: mixColor(a.top, b.top, t),
    horizon: mixColor(a.horizon, b.horizon, t),
  }

  for (const key of [
    'brightness',
    'saturation',
    'cloud',
    'stars',
    'lights',
  ]) {
    result[key] = lerp(a[key], b[key], t)
  }

  return result
})

const skyStyle = computed(() => ({
  background: `linear-gradient(
    to bottom,
    ${lighting.value.top} 0%,
    ${lighting.value.horizon} 55%,
    ${lighting.value.horizon} 100%
  )`,
}))

const landscapeStyle = computed(() => ({
  filter: `
    brightness(${lighting.value.brightness})
    saturate(${lighting.value.saturation})
  `,
}))

const cloudStyle = computed(() => ({
  opacity: lighting.value.cloud,
  filter: `brightness(${lighting.value.brightness})`,
}))

const roomStyle = computed(() => ({
  filter: `
    brightness(${0.55 + lighting.value.brightness * 0.45})
    saturate(${0.9 + lighting.value.saturation * 0.1})
  `,
}))

const sunsetStrength = computed(() =>
  Math.max(0, 1 - Math.abs(hour.value - 18.3) / 2)
)

function celestialStyle(isMoon) {
  const h = hour.value
  const progress = isMoon
    ? ((h - 19 + 24) % 24) / 11
    : (h - 6) / 13

  const visible = progress > 0 && progress < 1
  const p = Math.max(0, Math.min(1, progress))

  return {
    left: `${18 + p * 64}%`,
    top: `${48 - Math.sin(p * Math.PI) * 36}%`,
    opacity: visible
      ? Math.min(1, p * 12, (1 - p) * 12)
      : 0,
  }
}
const emit = defineEmits(['trainer-change'])

// Use the same saved profile and active buddy as the town.
const STORAGE = {
  trainer: 'studydex-trainer-profile',
  buddy: 'studydex-active-buddy',
}

function readSaved(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

const saveError = ref('')

function saveSelection(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    saveError.value = ''
  } catch {
    saveError.value =
      'Selection updated, but this browser could not save it.'
  }
}
// Add future outfits here with a unique id, gender, label and image.
const trainerVariants = [
  {
    id: 'male-classic',
    gender: 'male',
    label: 'Classic trainer',
    image: `${base}avatars/male.png`,
  },
  {
    id: 'female-classic',
    gender: 'female',
    label: 'Classic trainer',
    image: `${base}avatars/female.png`,
  },
]

const savedTrainer = readSaved(STORAGE.trainer, {})
const selectedVariantId = ref(
  trainerVariants.some(item => item.id === savedTrainer.variantId)
    ? savedTrainer.variantId
    : savedTrainer.gender === 'female' ? 'female-classic' : 'male-classic',
)

const selectedTrainer = computed(() =>
  trainerVariants.find(item => item.id === selectedVariantId.value)
  ?? trainerVariants[0],
)

const genderFilter = ref(selectedTrainer.value.gender)

const visibleVariants = computed(() =>
  trainerVariants.filter(item => item.gender === genderFilter.value),
)

function selectTrainer(variant) {
  selectedVariantId.value = variant.id

  const profile = {
    ...readSaved(STORAGE.trainer, {}),
    gender: variant.gender,
    variantId: variant.id,
  }

  saveSelection(STORAGE.trainer, profile)
  emit('trainer-change', profile)
}
const savedBuddy = readSaved(STORAGE.buddy, null)
const savedBuddyId = Number(savedBuddy?.id)

const activeBuddy = ref(
  Number.isInteger(savedBuddyId) && savedBuddyId > 0
    ? { ...savedBuddy, id: savedBuddyId }
    : null,
)

const buddySprite = ref('')
const buddyLoading = ref(false)
const buddyError = ref('')
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

    buddyLoading.value = true

    try {
      const cacheKey = `studydex-pokemon-v1-${id}`
      let pokemon = readSaved(cacheKey, null)

      if (!pokemon?.sprites) {
        const response = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${id}/`,
          { signal: controller.signal },
        )

        if (!response.ok) throw new Error('Could not load Pokémon')

        pokemon = await response.json()

        try {
          localStorage.setItem(cacheKey, JSON.stringify(pokemon))
        } catch {
          // Continue without caching if browser storage is full.
        }
      }

      if (cancelled) return

      buddySprite.value =
        pokemon.sprites?.versions?.['generation-v']?.['black-white']
          ?.animated?.front_default ||
        pokemon.sprites?.front_default ||
        ''

      if (!buddySprite.value) {
        buddyError.value = 'No sprite available.'
      }
    } catch (error) {
      if (!cancelled && error.name !== 'AbortError') {
        buddyError.value = 'Your buddy could not load.'
      }
    } finally {
      if (!cancelled) buddyLoading.value = false
    }
  },
  { immediate: true },
)

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

// Change these three paths to match your router when those pages are ready.
const roomLinks = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', left: '74.7%', top: '34.8%', width: '11.5%', height: '23%' },
  { id: 'studydecks', label: 'Study decks', path: '/studydecks', left: '10.5%', top: '48.5%', width: '8%', height: '9%' },
  { id: 'pokepacks', label: 'Open Poképacks', path: '/pokepacks', left: '91%', top: '68.7%', width: '11.5%', height: '20%' },
]
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

</script>

<template>

  <main class="trainer-page">

    <div class="trainer-scene">

      <div class="window-view" aria-hidden="true">

        <div
          class="outdoor-layer sky-layer"
          :style="skyStyle"
        ></div>

        <div
          class="outdoor-layer stars-layer"
          :style="{ opacity: lighting.stars }"
        >
          <img
            class="stars-image"
            :src="images.stars"
            alt=""
            draggable="false"
            @error="reportImageError"
          />
        </div>

        <div
          class="outdoor-layer clouds-layer"
          :style="cloudStyle"
        >
          <img
            class="clouds-image"
            :src="images.clouds"
            alt=""
            draggable="false"
            @error="reportImageError"
          />
        </div>

        <img
          class="celestial sun-image"
          :src="images.sun"
          :style="celestialStyle(false)"
          alt=""
          draggable="false"
          @error="reportImageError"
        />

        <img
          class="celestial moon-image"
          :src="images.moon"
          :style="celestialStyle(true)"
          alt=""
          draggable="false"
          @error="reportImageError"
        />

        <img
          class="landscape-image"
          :src="images.landscape"
          :style="landscapeStyle"
          alt=""
          draggable="false"
          @error="reportImageError"
        />

        <div
          class="outdoor-layer sunset-layer"
          :style="{ opacity: sunsetStrength * 0.2 }"
        ></div>
      </div>

      <img
        class="room-image"
        :src="images.room"
        :style="roomStyle"
        alt="Trainer room with a study laptop, wall dashboard, clothes cupboard, pack bag, and lake-view window"
        draggable="false"
        @error="reportImageError"
      />
      <div class="room-characters">

        <div class="carpet-party">
          <div class="trainer-figure">
            <img
              :src="selectedTrainer.image"
              :alt="`${selectedTrainer.gender} trainer — ${selectedTrainer.label}`"
              class="trainer-sprite"
              draggable="false"
              @error="reportImageError"
            />
          </div>

          <div class="buddy-figure" aria-live="polite">
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
          </div>
        </div>

        <button
          v-for="link in roomLinks"
          :key="link.id"
          type="button"
          class="room-hotspot"
          :class="`hotspot-${link.id}`"
          :style="{ left: link.left, top: link.top, width: link.width, height: link.height }"
          :aria-label="link.label"
          :title="link.label"
          @click="openRoomPage(link)"
        >
          <span class="hotspot-label">{{ link.label }}</span>
        </button>

        <button
          ref="wardrobeButton"
          type="button"
          class="room-hotspot wardrobe-hotspot"
          aria-label="Open wardrobe to change avatar"
          :aria-expanded="openPanel === 'wardrobe'"
          aria-controls="room-selection-panel"
          @click="togglePanel('wardrobe')"
        >
          <span class="hotspot-label">Change avatar</span>
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
            <div class="gender-options" aria-label="Trainer options">
              <button
                v-for="gender in ['male', 'female']"
                :key="gender"
                type="button"
                :aria-pressed="genderFilter === gender"
                @click="genderFilter = gender"
              >
                {{ gender }}
              </button>
            </div>

            <div class="variant-grid">
              <button
                v-for="variant in visibleVariants"
                :key="variant.id"
                type="button"
                class="variant-card"
                :aria-pressed="selectedVariantId === variant.id"
                @click="selectTrainer(variant)"
              >
                <img :src="variant.image" :alt="variant.gender" @error="reportImageError" />
                <strong>{{ variant.label }}</strong>
                <small>
                  {{ selectedVariantId === variant.id ? 'Equipped ✓' : 'Equip' }}
                </small>
              </button>
            </div>
          </template>

          <p v-if="saveError" class="save-error" role="status">
            {{ saveError }}
          </p>
        </section>
      </div>

      <div
        class="window-warmth"
        :style="{ opacity: sunsetStrength * 0.3 }"
        aria-hidden="true"
      ></div>

      <div
        class="lamp-glow desk-glow"
        :style="{ opacity: lighting.lights * 0.65 }"
        aria-hidden="true"
      ></div>

      <div
        class="lamp-core desk-core"
        :style="{ opacity: lighting.lights * 0.85 }"
        aria-hidden="true"
      ></div>

      <header class="trainer-hud">
        <div class="title-card">
          <span class="title-eyebrow">STUDYDEX</span>
          <h1>Trainer Home</h1>
        </div>

        <div class="clock-pill">
          <span class="clock-time">{{ displayTime }}</span>
          <span class="clock-divider" aria-hidden="true"></span>
          <span class="clock-period">{{ lighting.name }}</span>
        </div>
      </header>
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

.window-view { position: absolute; left: 32.5%; top: 16.5%; width: 30.5%; height: 33%; z-index: 0; isolation: isolate; overflow: hidden; pointer-events: none; }

.outdoor-layer { position: absolute; inset: 0; width: 100%; height: 100%; }

.sky-layer { z-index: 0; }

.stars-layer { z-index: 2; }

.stars-image { display: block; width: 100%; height: 100%; max-width: none; object-fit: fill; animation: star-twinkle 5s ease-in-out infinite alternate; }

.clouds-layer { z-index: 2; }

.clouds-image { position: absolute; top: 0; left: -6%; display: block; width: 112%; height: 70%; max-width: none; object-fit: fill; animation: cloud-drift 70s ease-in-out infinite alternate; }

.celestial { position: absolute; z-index: 1; display: block; height: auto; max-width: none; transform: translate(-50%, -50%); pointer-events: none; }

.sun-image { width: 15%; }

.moon-image { width: 10%; }

.landscape-image { position: absolute; left: 0; bottom: 0; z-index: 3; display: block; width: 100%; height: 85%; max-width: none; object-fit: fill; }

.sunset-layer { z-index: 4; background: #ff9c60; mix-blend-mode: soft-light; }

.room-image { position: absolute; inset: 0; z-index: 1; display: block; width: 100%; height: 100%; max-width: none; object-fit: fill; pointer-events: none; user-select: none; }

.window-warmth { position: absolute; left: 22%; top: 45%; width: 55%; height: 48%; z-index: 2; background: radial-gradient( ellipse at 50% 15%, rgba(255, 179, 95, 0.8), rgba(255, 166, 88, 0.2) 45%, transparent 72% ); mix-blend-mode: screen; pointer-events: none; }

.lamp-glow { position: absolute; z-index: 2; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient( ellipse, rgba(255, 214, 133, 0.65) 0%, rgba(255, 191, 95, 0.3) 28%, rgba(255, 168, 65, 0.08) 50%, transparent 72% ); mix-blend-mode: screen; pointer-events: none; }

.desk-glow { left: 17%; top: 49%; width: 24%; height: 36%; }

.lamp-core { position: absolute; z-index: 3; transform: translate(-50%, -50%); background: radial-gradient( ellipse, rgba(255, 246, 201, 0.95), rgba(255, 215, 137, 0.45) 45%, transparent 75% ); mix-blend-mode: screen; pointer-events: none; }

.desk-core { left: 17%; top: 41.5%; width: 3.3%; height: 2.5%; }

.trainer-hud { position: absolute; top: 24px; left: 24px; z-index: 10; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }

.title-card { padding: 12px 18px; border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 18px; background: rgba(22, 39, 62, 0.65); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 5px 16px rgba(5, 15, 30, 0.18); }

.title-eyebrow { color: #ffe29a; font-size: 9px; font-weight: 900; letter-spacing: 2px; }

.title-card h1 { margin: 3px 0 0; font-size: 21px; font-weight: 800; line-height: 1.2; }

.clock-pill { display: flex; align-items: center; gap: 10px; padding: 8px 13px; border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 999px; background: rgba(22, 39, 62, 0.6); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }

.clock-time { font-size: 17px; font-weight: 800; font-variant-numeric: tabular-nums; }

.clock-divider { width: 1px; height: 16px; background: rgba(255, 255, 255, 0.35); }

.clock-period { color: #e5edf7; font-size: 11px; font-weight: 700; }

.image-errors { margin: 16px; padding: 16px; border: 1px solid #f39b9b; border-radius: 12px; background: #482631; color: #ffe5e5; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }

.image-errors ul { margin: 8px 0; padding-left: 20px; }

.image-errors p { margin: 8px 0 0; }

@keyframes cloud-drift {
from { transform: translateX(-2%); }

to { transform: translateX(2%); }
}

@keyframes star-twinkle {
from { opacity: 0.65; }

to { opacity: 1; }
}

@media (max-width: 600px) {
.trainer-hud { top: 10px; left: 10px; gap: 6px; }

.title-card { padding: 7px 10px; border-radius: 12px; }

.title-eyebrow { font-size: 7px; }

.title-card h1 { font-size: 14px; }

.clock-pill { padding: 5px 9px; gap: 7px; }

.clock-time { font-size: 12px; }

.clock-period { font-size: 9px; }

.clock-divider { height: 12px; }

}

@media (prefers-reduced-motion: reduce) {
  .clouds-image,
.stars-image { animation: none; }
}

.room-characters { position: absolute; inset: 0; z-index: 6; pointer-events: none; --party-left: 51%; --party-feet: 85%;  }

.room-characters button { font-family: inherit; cursor: pointer; pointer-events: auto; }

.room-characters button:focus-visible { outline: 3px solid #ffe58c; outline-offset: 4px; }

.carpet-party { position: absolute; left: var(--party-left); top: var(--party-feet); width: 29%; display: flex; align-items: flex-end; gap: 7%; transform: translate(-50%, -100%); }

.trainer-figure { width: 57%; flex-shrink: 0; }

.buddy-figure { width: 30%; min-width: 0; }

.trainer-sprite,
.buddy-sprite { display: block; width: 100%; height: auto; image-rendering: pixelated; user-select: none; filter: drop-shadow(0 5px 2px rgb(35 28 24 / 28%)); }

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

.room-hotspot { position: absolute; transform: translate(-50%, -50%); border: 2px solid transparent; border-radius: 14px; background: transparent; color: #46392d; }
.room-hotspot:hover, .room-hotspot:focus-visible { border-color: #ffe6a3; background: rgb(255 226 154 / 12%); box-shadow: 0 0 20px rgb(255 221 134 / 30%); }
.hotspot-label { opacity: 0; visibility: hidden; pointer-events: none; position: absolute; top: calc(100% + 5px); left: 50%; transform: translateX(-50%); padding: 6px 10px; border: 2px solid #594334; border-radius: 10px; background: #fff4d9; box-shadow: 0 3px 0 #594334; white-space: nowrap; font-size: clamp(10px, 1vw, 14px); font-weight: 800; }
@media (max-width: 600px) { .hotspot-label { padding: 3px 5px; border-width: 1px; } }
.hotspot-dashboard .hotspot-label { left: 50%; right: auto; transform: translateX(-50%); }
.room-hotspot:hover .hotspot-label,
.room-hotspot:focus-visible .hotspot-label { opacity: 1; visibility: visible; }
.room-hotspot:active { background: rgb(255 226 154 / 25%); }
.wardrobe-hotspot { left: 91.5%; top: 37.5%; width: 14%; height: 40%; }
</style>