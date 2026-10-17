<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ==========================================
// IMAGE PATHS
// ==========================================

const base = import.meta.env.BASE_URL

const images = {
  room: `${base}trainer-home/trainer-home-clean.png`,
  landscape: `${base}trainer-home/window-landscape-clean.png`,
  sun: `${base}home/sun.png`,
  moon: `${base}home/moon.png`,
  stars: `${base}home/stars.png`,
  clouds: `${base}home/cloud.png`,
}

// Show missing images instead of silently failing.
const failedImages = ref([])

function reportImageError(event) {
  const path = new URL(event.target.src).pathname

  if (!failedImages.value.includes(path)) {
    failedImages.value.push(path)
  }
}

// ==========================================
// CLOCK AND PREVIEW
// ==========================================

const currentTime = ref(new Date())
const live = ref(true)
const previewHour = ref(12)
const autoPreview = ref(false)

let clockInterval
let previewInterval

function refreshClock() {
  currentTime.value = new Date()
}

function stopAutoPreview() {
  clearInterval(previewInterval)
  previewInterval = undefined
  autoPreview.value = false
}

function toggleAutoPreview() {
  if (autoPreview.value) {
    stopAutoPreview()
    return
  }

  live.value = false
  autoPreview.value = true
  previewHour.value = 6

  const startTime = performance.now()

  // Preview one full day in 60 seconds.
  previewInterval = setInterval(() => {
    const elapsedSeconds = (performance.now() - startTime) / 1000
    previewHour.value = (6 + (elapsedSeconds / 60) * 24) % 24
  }, 50)
}

function handleLiveChange() {
  stopAutoPreview()
  refreshClock()
}

function previewAt(value) {
  stopAutoPreview()
  live.value = false
  previewHour.value = value
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

const hour = computed(() => {
  if (!live.value) {
    return ((Number(previewHour.value) % 24) + 24) % 24
  }

  const now = currentTime.value

  return (
    now.getHours() +
    now.getMinutes() / 60 +
    now.getSeconds() / 3600
  )
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

// ==========================================
// LIGHTING KEYFRAMES
// Same gradient-based approach as HomeView2.
// ==========================================

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

  // Smooth interpolation.
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

// ==========================================
// SCENE LIGHTING
// ==========================================

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
  // Interior stays brighter than the outdoor landscape.
  filter: `
    brightness(${0.55 + lighting.value.brightness * 0.45})
    saturate(${0.9 + lighting.value.saturation * 0.1})
  `,
}))

const sunsetStrength = computed(() =>
  Math.max(0, 1 - Math.abs(hour.value - 18.3) / 2)
)

// ==========================================
// SUN AND MOON MOVEMENT
// ==========================================

function celestialStyle(isMoon) {
  const h = hour.value

  // Sun travels between 06:00 and 19:00.
  // Moon travels between 19:00 and 06:00.
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
</script>

<template>
  <main class="trainer-page">

    <div class="trainer-scene">

      <!-- OUTDOOR CONTAINER: BEHIND THE ROOM -->
      <div class="window-view" aria-hidden="true">

        <!-- 1. GRADIENT SKY -->
        <div
          class="outdoor-layer sky-layer"
          :style="skyStyle"
        ></div>

        <!-- 2. STARS -->
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

        <!-- 3. CLOUDS -->
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

        <!-- 4. SUN AND MOON -->
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

        <!-- 5. MOUNTAINS, TREES AND LAKE -->
        <img
          class="landscape-image"
          :src="images.landscape"
          :style="landscapeStyle"
          alt=""
          draggable="false"
          @error="reportImageError"
        />

        <!-- SUBTLE SUNSET TINT -->
        <div
          class="outdoor-layer sunset-layer"
          :style="{ opacity: sunsetStrength * 0.2 }"
        ></div>
      </div>

      <!-- 6. ROOM WITH TRANSPARENT WINDOW PANES -->
      <img
        class="room-image"
        :src="images.room"
        :style="roomStyle"
        alt="Trainer bedroom with a study desk, trophy shelves, a bed and a lake-view window"
        draggable="false"
        @error="reportImageError"
      />

      <!-- INTERIOR LIGHT EFFECTS -->
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
        class="lamp-glow bedside-glow"
        :style="{ opacity: lighting.lights * 0.7 }"
        aria-hidden="true"
      ></div>

      <div
        class="lamp-core desk-core"
        :style="{ opacity: lighting.lights * 0.85 }"
        aria-hidden="true"
      ></div>

      <div
        class="lamp-core bedside-core"
        :style="{ opacity: lighting.lights * 0.55 }"
        aria-hidden="true"
      ></div>

      <!-- TITLE AND CLOCK -->
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

    <!-- DEVELOPMENT CONTROLS -->
    <section class="preview-controls" aria-label="Lighting preview">
      <button
        type="button"
        @click="toggleAutoPreview"
      >
        {{ autoPreview ? 'Pause cycle' : 'Run day cycle' }}
      </button>

      <label class="live-toggle">
        <input
          v-model="live"
          type="checkbox"
          @change="handleLiveChange"
        />
        Live time
      </label>

      <input
        v-model.number="previewHour"
        class="time-slider"
        type="range"
        min="0"
        max="23.99"
        step="0.01"
        :disabled="live || autoPreview"
        aria-label="Preview time of day"
      />

      <span class="preview-time">
        {{ displayTime }} · {{ lighting.name }}
      </span>

      <div class="preview-presets">
        <button type="button" @click="previewAt(12)">
          Test day
        </button>

        <button type="button" @click="previewAt(18.5)">
          Test sunset
        </button>

        <button type="button" @click="previewAt(0)">
          Test night
        </button>
      </div>
    </section>

    <!-- ONLY APPEARS IF A FILE FAILS TO LOAD -->
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
/* ==========================================
   PAGE
   ========================================== */

.trainer-page,
.trainer-page * {
  box-sizing: border-box;
}

.trainer-page {
  width: 100%;
  min-height: 100dvh;

  background: #101925;
  color: #fff;

  font-family:
    ui-rounded,
    "Arial Rounded MT Bold",
    system-ui,
    sans-serif;
}

.trainer-scene {
  position: relative;
  width: 100%;
  aspect-ratio: 1672 / 941;

  overflow: hidden;
  isolation: isolate;
  background: #17243b;
}

/* ==========================================
   WINDOW CONTAINER
   Coordinates match the generated room.
   ========================================== */

.window-view {
  position: absolute;
  left: 32.5%;
  top: 16.5%;
  width: 30.5%;
  height: 33%;

  z-index: 0;
  isolation: isolate;
  overflow: hidden;

  pointer-events: none;
}

.outdoor-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* ==========================================
   1. GRADIENT
   ========================================== */

.sky-layer {
  z-index: 0;
}

/* ==========================================
   2. STARS
   ========================================== */

.stars-layer {
  z-index: 1;
}

.stars-image {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: fill;

  animation: star-twinkle 5s ease-in-out infinite alternate;
}

/* ==========================================
   3. CLOUDS
   ========================================== */

.clouds-layer {
  z-index: 1;
}

.clouds-image {
  position: absolute;
  top: 0;
  left: -6%;

  display: block;
  width: 112%;
  height: 70%;
  max-width: none;
  object-fit: fill;

  animation: cloud-drift 70s ease-in-out infinite alternate;
}

/* ==========================================
   4. SUN AND MOON
   ========================================== */

.celestial {
  position: absolute;
  z-index: 2;

  display: block;
  height: auto;
  max-width: none;

  transform: translate(-50%, -50%);
  pointer-events: none;
}

.sun-image {
  width: 15%;
}

.moon-image {
  width: 10%;
}

/* ==========================================
   5. LANDSCAPE
   Use the CLEAN version without upper branches.
   ========================================== */

.landscape-image {
  position: absolute;
  left: 0;
  bottom: 0;
  z-index: 3;

  display: block;
  width: 100%;
  height: 85%;
  max-width: none;
  object-fit: fill;
}

.sunset-layer {
  z-index: 4;
  background: #ff9c60;
  mix-blend-mode: soft-light;
}

/* ==========================================
   6. ROOM FOREGROUND
   Above the entire outdoor container.
   ========================================== */

.room-image {
  position: absolute;
  inset: 0;
  z-index: 1;

  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: fill;

  pointer-events: none;
  user-select: none;
}

/* ==========================================
   INTERIOR LIGHTING
   ========================================== */

.window-warmth {
  position: absolute;
  left: 22%;
  top: 45%;
  width: 55%;
  height: 48%;
  z-index: 2;

  background: radial-gradient(
    ellipse at 50% 15%,
    rgba(255, 179, 95, 0.8),
    rgba(255, 166, 88, 0.2) 45%,
    transparent 72%
  );

  mix-blend-mode: screen;
  pointer-events: none;
}

.lamp-glow {
  position: absolute;
  z-index: 2;

  transform: translate(-50%, -50%);
  border-radius: 50%;

  background: radial-gradient(
    ellipse,
    rgba(255, 214, 133, 0.65) 0%,
    rgba(255, 191, 95, 0.3) 28%,
    rgba(255, 168, 65, 0.08) 50%,
    transparent 72%
  );

  mix-blend-mode: screen;
  pointer-events: none;
}

.desk-glow {
  left: 17%;
  top: 49%;
  width: 24%;
  height: 36%;
}

.bedside-glow {
  left: 89%;
  top: 49%;
  width: 24%;
  height: 38%;
}

.lamp-core {
  position: absolute;
  z-index: 3;

  transform: translate(-50%, -50%);

  background: radial-gradient(
    ellipse,
    rgba(255, 246, 201, 0.95),
    rgba(255, 215, 137, 0.45) 45%,
    transparent 75%
  );

  mix-blend-mode: screen;
  pointer-events: none;
}

.desk-core {
  left: 17%;
  top: 41.5%;
  width: 3.3%;
  height: 2.5%;
}

.bedside-core {
  left: 89.3%;
  top: 44%;
  width: 5%;
  height: 7%;
}

/* ==========================================
   TITLE AND CLOCK
   ========================================== */

.trainer-hud {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 10;

  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.title-card {
  padding: 12px 18px;

  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 18px;

  background: rgba(22, 39, 62, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  box-shadow: 0 5px 16px rgba(5, 15, 30, 0.18);
}

.title-eyebrow {
  color: #ffe29a;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 2px;
}

.title-card h1 {
  margin: 3px 0 0;
  font-size: 21px;
  font-weight: 800;
  line-height: 1.2;
}

.clock-pill {
  display: flex;
  align-items: center;
  gap: 10px;

  padding: 8px 13px;

  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;

  background: rgba(22, 39, 62, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.clock-time {
  font-size: 17px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.clock-divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.35);
}

.clock-period {
  color: #e5edf7;
  font-size: 11px;
  font-weight: 700;
}

/* ==========================================
   PREVIEW CONTROLS
   ========================================== */

.preview-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 14px;

  padding: 16px;
  background: #142033;
  font-size: 13px;
}

.preview-controls button {
  min-height: 40px;
  padding: 9px 13px;

  border: 1px solid #6d84a6;
  border-radius: 10px;

  background: #2b4262;
  color: #fff;

  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.preview-controls button:hover {
  background: #385578;
}

.live-toggle,
.preview-presets {
  display: flex;
  align-items: center;
  gap: 8px;
}

.live-toggle {
  cursor: pointer;
}

.preview-presets {
  flex-wrap: wrap;
  justify-content: center;
}

.time-slider {
  width: min(280px, 65vw);
  accent-color: #ffdc7c;
}

.live-toggle input {
  accent-color: #ffdc7c;
}

.preview-time {
  min-width: 120px;
  color: #d9e5f7;
  font-variant-numeric: tabular-nums;
}

.preview-controls button:focus-visible,
.preview-controls input:focus-visible {
  outline: 3px solid #ffdc7c;
  outline-offset: 4px;
}

/* ==========================================
   MISSING IMAGE MESSAGE
   ========================================== */

.image-errors {
  margin: 16px;
  padding: 16px;

  border: 1px solid #f39b9b;
  border-radius: 12px;

  background: #482631;
  color: #ffe5e5;

  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.image-errors ul {
  margin: 8px 0;
  padding-left: 20px;
}

.image-errors p {
  margin: 8px 0 0;
}

/* ==========================================
   ANIMATION
   ========================================== */

@keyframes cloud-drift {
  from {
    transform: translateX(-2%);
  }

  to {
    transform: translateX(2%);
  }
}

@keyframes star-twinkle {
  from {
    opacity: 0.65;
  }

  to {
    opacity: 1;
  }
}

/* ==========================================
   SMALL SCREENS
   ========================================== */

@media (max-width: 600px) {
  .trainer-hud {
    top: 10px;
    left: 10px;
    gap: 6px;
  }

  .title-card {
    padding: 7px 10px;
    border-radius: 12px;
  }

  .title-eyebrow {
    font-size: 7px;
  }

  .title-card h1 {
    font-size: 14px;
  }

  .clock-pill {
    padding: 5px 9px;
    gap: 7px;
  }

  .clock-time {
    font-size: 12px;
  }

  .clock-period {
    font-size: 9px;
  }

  .clock-divider {
    height: 12px;
  }

  .preview-controls {
    padding: 12px;
    gap: 10px;
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .clouds-image,
  .stars-image {
    animation: none;
  }
}
</style>
