<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const base = import.meta.env.BASE_URL

const images = {
  arena: `${base}poke-arena/poke-arena.png`,
  sun: `${base}town/bg_sun.png`,
  moon: `${base}town/bg_moon.png`,
  clouds: `${base}town/bg_clouds.png`,
  stars: `${base}town/bg_stars.png`,
}

// Preview controls appear only when running the development server.
const showPreviewControls = import.meta.env.DEV

const currentTime = ref(new Date())
const live = ref(true)
const previewHour = ref(12)
const autoPreview = ref(false)

let clockInterval
let previewInterval

const hour = computed(() => {
  if (!live.value) {
    return ((Number(previewHour.value) % 24) + 24) % 24
  }

  const time = currentTime.value

  return (
    time.getHours() +
    time.getMinutes() / 60 +
    time.getSeconds() / 3600
  )
})

// Opening hours: 7am until midnight.
const quizzesOpen = computed(() => hour.value >= 7)

// Floodlights: 7pm until midnight.
const arenaLightsOn = computed(() => hour.value >= 19)

// Same lighting presets as HomeView2.
// hour, name, sky top, horizon, brightness, saturation, clouds, stars
const frames = [
  [0, 'Night', '#03091c', '#142744', 0.5, 0.8, 0.3, 1],
  [5.5, 'Night', '#081229', '#354564', 0.38, 0.7, 0.38, 0.8],
  [8, 'Day', '#258be0', '#c7eeff', 1, 1.06, 1, 0],
  [12, 'Day', '#1685df', '#c4efff', 1.04, 1.1, 1, 0],
  [15.5, 'Afternoon', '#579bd5', '#ffe0ad', 1.02, 1.08, 0.95, 0],
  [18.5, 'Sunset', '#67518e', '#ffad7b', 0.82, 1.05, 0.78, 0.03],
  [19.25, 'Dusk', '#30345f', '#a77b9d', 0.58, 0.85, 0.58, 0.35],
  [20.5, 'Evening', '#101f43', '#405477', 0.43, 0.75, 0.4, 0.75],
  [22, 'Night', '#03091c', '#142744', 0.5, 0.8, 0.3, 1],
  [24, 'Night', '#03091c', '#142744', 0.5, 0.8, 0.3, 1],
].map(
  ([
    hour,
    name,
    top,
    horizon,
    brightness,
    saturation,
    cloud,
    stars,
  ]) => ({
    hour,
    name,
    top,
    horizon,
    brightness,
    saturation,
    cloud,
    stars,
  }),
)

const lerp = (a, b, t) => a + (b - a) * t

function mixColor(a, b, t) {
  const channels = [1, 3, 5].map((position) => {
    const start = parseInt(a.slice(position, position + 2), 16)
    const end = parseInt(b.slice(position, position + 2), 16)

    return Math.round(lerp(start, end, t))
  })

  return `rgb(${channels.join(',')})`
}

const lighting = computed(() => {
  const h = hour.value

  const index = frames.findIndex(
    (frame, i) =>
      i < frames.length - 1 &&
      h >= frame.hour &&
      h < frames[i + 1].hour,
  )

  const start = frames[Math.max(0, index)]
  const end = frames[Math.max(0, index) + 1]

  const progress = (h - start.hour) / (end.hour - start.hour)
  const t = progress * progress * (3 - 2 * progress)

  return {
    name: t < 0.5 ? start.name : end.name,
    top: mixColor(start.top, end.top, t),
    horizon: mixColor(start.horizon, end.horizon, t),
    brightness: lerp(start.brightness, end.brightness, t),
    saturation: lerp(start.saturation, end.saturation, t),
    cloud: lerp(start.cloud, end.cloud, t),
    stars: lerp(start.stars, end.stars, t),
  }
})

const skyStyle = computed(() => ({
  background: `linear-gradient(
    to bottom,
    ${lighting.value.top} 0%,
    ${lighting.value.horizon} 30%
  )`,
}))

const cloudStyle = computed(() => ({
  opacity: lighting.value.cloud,
  filter: `brightness(${lighting.value.brightness})`,
}))

const arenaStyle = computed(() => {
  const brightness = arenaLightsOn.value
    ? Math.max(0.82, lighting.value.brightness)
    : lighting.value.brightness

  const saturation = arenaLightsOn.value
    ? Math.max(0.95, lighting.value.saturation)
    : lighting.value.saturation

  return {
    filter: `brightness(${brightness}) saturate(${saturation})`,
  }
})

// Same sun and moon movement as HomeView2.
function celestialStyle(isMoon) {
  const h = hour.value

  const progress = isMoon
    ? ((h - 19 + 24) % 24) / 11
    : (h - 6) / 13

  const visible = progress > 0 && progress < 1
  const p = Math.max(0, Math.min(1, progress))

  return {
    left: `${12 + p * 76}%`,
    top: `${25 - Math.sin(p * Math.PI) * 19}%`,
    opacity: visible
      ? Math.min(1, p * 10, (1 - p) * 10)
      : 0,
  }
}

// The latest arena artwork has two visible outer floodlight banks.
// Adjust these percentages if you change the background image.
const floodlights = [
  { id: 'left', left: 8.7, top: 16.8, angle: -24 },
  { id: 'right', left: 91.3, top: 16.8, angle: 24 },
]

const displayTime = computed(() => {
  const minutes = Math.floor(hour.value * 60)

  const hoursText = String(Math.floor(minutes / 60)).padStart(2, '0')
  const minutesText = String(minutes % 60).padStart(2, '0')

  return `${hoursText}:${minutesText}`
})

function stopAutoPreview() {
  clearInterval(previewInterval)
  previewInterval = undefined
  autoPreview.value = false
}

function useLiveTime() {
  stopAutoPreview()
  currentTime.value = new Date()
  live.value = true
}

function setPreview(value) {
  stopAutoPreview()
  live.value = false
  previewHour.value = Number(value)
}

function toggleAutoPreview() {
  if (autoPreview.value) {
    stopAutoPreview()
    return
  }

  live.value = false
  autoPreview.value = true
  previewHour.value = 6

  const startedAt = performance.now()

  // One full day in 60 seconds.
  previewInterval = setInterval(() => {
    const elapsedSeconds = (performance.now() - startedAt) / 1000
    previewHour.value = (6 + (elapsedSeconds / 60) * 24) % 24
  }, 50)
}

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
  stopAutoPreview()
  document.removeEventListener('visibilitychange', refreshClock)
})
</script>

<template>
  <main class="arena-page" :style="skyStyle">
    <div class="arena-scene">
      <!-- SKY -->
      <div
        class="layer sky"
        :style="skyStyle"
        aria-hidden="true"
      ></div>

      <!-- SUN / MOON -->
      <img
        class="celestial sun"
        :src="images.sun"
        :style="celestialStyle(false)"
        alt=""
        draggable="false"
      />

      <img
        class="celestial moon"
        :src="images.moon"
        :style="celestialStyle(true)"
        alt=""
        draggable="false"
      />

      <!-- STARS / CLOUDS -->
      <div
        class="layer stars-layer"
        :style="{ opacity: lighting.stars }"
        aria-hidden="true"
      >
        <img
          class="layer stars"
          :src="images.stars"
          alt=""
          draggable="false"
        />
      </div>

      <div
        class="layer clouds-layer"
        :style="cloudStyle"
        aria-hidden="true"
      >
        <img
          class="layer clouds"
          :src="images.clouds"
          alt=""
          draggable="false"
        />
      </div>

      <!-- ARENA -->
      <img
        class="layer arena-image"
        :src="images.arena"
        :style="arenaStyle"
        alt="StudyDex quiz arena"
        draggable="false"
      />

      <!-- EVENING FLOODLIGHTS -->
      <div
        class="layer arena-light-effects"
        :class="{ 'is-on': arenaLightsOn }"
        aria-hidden="true"
      >
        <div
          v-for="light in floodlights"
          :key="light.id"
          class="floodlight"
          :style="{
            left: `${light.left}%`,
            top: `${light.top}%`,
            '--beam-angle': `${light.angle}deg`,
          }"
        >
          <div class="floodlight-beam"></div>
          <div class="floodlight-halo"></div>
          <div class="floodlight-bulbs"></div>
        </div>

        <div class="court-light-pool"></div>
      </div>

      <!--
        Add your quiz interface inside this section.
        It is removed automatically when the arena closes.
      -->
      <section
        v-if="quizzesOpen"
        class="quiz-content"
        aria-label="Arena quiz"
      ></section>

    </div>

    <!-- CLOCK / EXIT -->
    <header class="arena-hud">
      <RouterLink to="/home" class="home-link">
        ‹ Back to town
      </RouterLink>

      <div class="arena-clock">
        <strong>{{ displayTime }}</strong>
        <span>{{ lighting.name }}</span>
      </div>
    </header>

    <!-- DEVELOPMENT PREVIEW -->
    <aside
      v-if="showPreviewControls"
      class="preview-panel"
      aria-label="Arena time preview"
    >
      <div class="preview-heading">
        <strong>{{ live ? 'Live time' : 'Preview time' }}</strong>
        <span>{{ quizzesOpen ? 'Arena open' : 'Arena closed' }}</span>
      </div>

      <div class="preview-buttons">
        <button
          type="button"
          :aria-pressed="live"
          @click="useLiveTime"
        >
          Live
        </button>

        <button type="button" @click="setPreview(7)">
          7am
        </button>

        <button type="button" @click="setPreview(12)">
          Day
        </button>

        <button type="button" @click="setPreview(19)">
          7pm
        </button>

        <button type="button" @click="setPreview(0)">
          Midnight
        </button>

        <button
          type="button"
          :aria-pressed="autoPreview"
          @click="toggleAutoPreview"
        >
          {{ autoPreview ? 'Stop cycle' : 'Play full day' }}
        </button>
      </div>

      <label class="time-slider">
        <span>Time: {{ displayTime }}</span>

        <input
          type="range"
          min="0"
          max="23.99"
          step="0.01"
          :value="hour"
          :aria-valuetext="displayTime"
          @input="setPreview($event.target.value)"
        />
      </label>
    </aside>
  </main>
</template>

<style scoped>
.arena-page {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: system-ui, sans-serif;
}

.arena-page * {
  box-sizing: border-box;
}

.arena-scene {
  position: relative;
  width: min(100vw, calc(100dvh * 1672 / 941));
  aspect-ratio: 1672 / 941;
  overflow: hidden;
  isolation: isolate;
  container-type: inline-size;
}

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

img.layer {
  display: block;
  object-fit: fill;
  user-select: none;
}

.sky {
  z-index: 0;
}

.celestial {
  position: absolute;
  z-index: 1;
  width: 10%;
  height: auto;
  max-width: none;
  transform: translate(-50%, -50%);
  pointer-events: none;
  user-select: none;
  transition: opacity 1.5s ease;
}

.moon {
  width: 7%;
}

.stars-layer {
  z-index: 2;
}

.clouds-layer {
  z-index: 3;
}

.clouds {
  inset: auto;
  top: 0;
  left: -5%;
  width: 110%;
  height: 100%;
  max-width: none;
  animation: cloud-drift 80s ease-in-out infinite alternate;
}

.stars {
  animation: twinkle 5s ease-in-out infinite alternate;
}

.arena-image {
  z-index: 4;
  transition: filter 1s ease;
}

/* FLOODLIGHTS */

.arena-light-effects {
  z-index: 5;
  opacity: 0;
  transition: opacity 1s ease;
}

.arena-light-effects.is-on {
  opacity: 1;
}

.floodlight {
  position: absolute;
  width: 0;
  height: 0;
}

.floodlight-halo {
  position: absolute;
  width: 9cqw;
  height: 6cqw;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    ellipse,
    rgb(255 249 211 / 85%) 0%,
    rgb(255 226 150 / 35%) 35%,
    transparent 72%
  );
  mix-blend-mode: screen;
}

.floodlight-bulbs {
  position: absolute;
  width: 3.8cqw;
  height: 1.4cqw;
  transform: translate(-50%, -50%);
  background:
    radial-gradient(
      circle at 15% 50%,
      #fffef0 0 14%,
      transparent 23%
    ),
    radial-gradient(
      circle at 50% 50%,
      #fffef0 0 14%,
      transparent 23%
    ),
    radial-gradient(
      circle at 85% 50%,
      #fffef0 0 14%,
      transparent 23%
    );
  filter: drop-shadow(0 0 7px #ffe5a1);
}

.floodlight-beam {
  position: absolute;
  top: 0;
  left: 0;
  width: 28cqw;
  height: 43cqw;
  transform-origin: 50% 0;
  transform: translateX(-50%) rotate(var(--beam-angle));
  clip-path: polygon(47% 0, 53% 0, 100% 100%, 0 100%);
  background: linear-gradient(
    to bottom,
    rgb(255 245 203 / 24%),
    rgb(255 239 183 / 8%) 65%,
    transparent
  );
  mix-blend-mode: screen;
}

.court-light-pool {
  position: absolute;
  left: 17%;
  top: 65%;
  width: 66%;
  height: 27%;
  border-radius: 50%;
  background: radial-gradient(
    ellipse,
    rgb(255 239 184 / 25%),
    rgb(255 239 184 / 10%) 45%,
    transparent 72%
  );
  mix-blend-mode: screen;
}

/* FUTURE QUIZ CONTENT */

.quiz-content {
  position: absolute;
  z-index: 6;
  left: 29%;
  top: 26%;
  width: 42%;
  height: 27%;
  padding: 12px;
  overflow: auto;
  color: white;
}


/* CLOCK AND NAVIGATION */

.arena-hud {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  left: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}

.home-link,
.arena-clock {
  border: 1px solid rgb(255 255 255 / 40%);
  border-radius: 14px;
  background: rgb(16 30 52 / 80%);
  color: white;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 14px rgb(0 0 0 / 15%);
}

.home-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  pointer-events: auto;
}

.home-link:hover {
  border-color: #ffdc77;
  color: #ffdc77;
}

.arena-clock {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 10px 14px;
}

.arena-clock strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.arena-clock span {
  color: #e2eafa;
  font-size: 12px;
}

/* DEVELOPMENT PREVIEW */

.preview-panel {
  position: absolute;
  left: 16px;
  bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 12;
  width: min(400px, calc(100vw - 32px));
  max-height: 40dvh;
  overflow: auto;
  padding: 14px;
  border: 1px solid rgb(255 255 255 / 40%);
  border-radius: 16px;
  background: rgb(15 29 50 / 92%);
  color: white;
  backdrop-filter: blur(12px);
}

.preview-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 12px;
}

.preview-heading span {
  color: #ffdc77;
}

.preview-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preview-buttons button {
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid rgb(255 255 255 / 25%);
  border-radius: 8px;
  background: rgb(255 255 255 / 10%);
  color: white;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.preview-buttons button:hover,
.preview-buttons button[aria-pressed='true'] {
  border-color: #ffdc55;
  background: #ffdc55;
  color: #332607;
}

.time-slider {
  display: grid;
  gap: 8px;
  margin-top: 12px;
  color: #d3e3f6;
  font-size: 11px;
}

.time-slider input {
  width: 100%;
  margin: 0;
  accent-color: #ffdc55;
}

button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 3px solid #ffdc55;
  outline-offset: 4px;
}

@keyframes cloud-drift {
  from {
    transform: translateX(-2%);
  }

  to {
    transform: translateX(2%);
  }
}

@keyframes twinkle {
  from {
    opacity: 0.7;
  }

  to {
    opacity: 1;
  }
}

@media (max-width: 600px) {
  .arena-hud {
    top: 10px;
    left: 10px;
    right: 10px;
  }

  .home-link,
  .arena-clock {
    padding: 8px 10px;
  }

  .arena-clock {
    gap: 6px;
  }

  .arena-clock strong {
    font-size: 15px;
  }

  .arena-clock span {
    font-size: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .clouds,
  .stars {
    animation: none;
  }

  .celestial,
  .arena-image,
  .arena-light-effects {
    transition: none;
  }
}
</style>