<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

const buildingButtons = [
  {
    id: 'arena',
    title: 'Poké Arena',
    subtitle: 'Take a Quiz',
    icon: asset+ 'poke_arena.png',
    left: '21%',
    top: '55%',
    path: '/quiz',
  },
  {
    id: 'laboratory',
    title: 'Poké Lab',
    subtitle: 'Study Your Decks',
    icon: asset+ 'poke_study.png',
    left: '54.5%',
    top: '53%',
    path: '/study-decks',
  },
  {
    id: 'trainer',
    title: 'Trainer House',
    subtitle: 'View Your Progress',
    icon: asset+ 'poke_home.png',
    left: '83%',
    top: '67%',
    path: '/dashboard',
  },
]

function selectBuilding(building) {
  router.push(building.path)
}

const asset = '/home/'

const live = ref(true)
const previewHour = ref(12)
const currentTime = ref(new Date())

let clockInterval

// AUTO PREVIEWW
const autoPreview = ref(false)

let previewInterval

// Real seconds needed to preview one full day
const cycleDuration = 60

function stopAutoPreview() {
  clearInterval(previewInterval)
  previewInterval = undefined
  autoPreview.value = false
}

function startAutoPreview() {
  stopAutoPreview()

  live.value = false
  autoPreview.value = true
  previewHour.value = 6 // Start at 6 AM

  const startTime = performance.now()
  const startHour = previewHour.value

  previewInterval = setInterval(() => {
    const elapsedSeconds = (performance.now() - startTime) / 1000

    previewHour.value =
      (startHour + (elapsedSeconds / cycleDuration) * 24) % 24
  }, 50)
}

function toggleAutoPreview() {
  if (autoPreview.value) {
    stopAutoPreview()
  } else {
    startAutoPreview()
  }
}

onMounted(() => {
  clockInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  clearInterval(clockInterval)
  stopAutoPreview()
})

const hour = computed(() => {
  if (!live.value) return Number(previewHour.value)

  const now = currentTime.value
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
})

/*
  Each row is a lighting keyframe.
  Values smoothly transition between neighbouring keyframes.

  Times are visual presets, not astronomical sunrise/sunset times.
*/
const frames = [
  {
    hour: 0, name: 'Night',
    top: '#03091c', horizon: '#142744',
    brightness: 0.5, saturation: 0.8,
    cloud: 0.3, stars: 1, lights: 1, fireflies: 0.75,
  },
  {
    hour: 5.5, name: 'Night',
    top: '#081229', horizon: '#354564',
    brightness: 0.38, saturation: 0.7,
    cloud: 0.38, stars: 0.8, lights: 1, fireflies: 0.5,
  },
  {
    hour: 8, name: 'Day',
    top: '#258be0', horizon: '#c7eeff',
    brightness: 1, saturation: 1.06,
    cloud: 1, stars: 0, lights: 0, fireflies: 0,
  },
  {
    hour: 12, name: 'Day',
    top: '#1685df', horizon: '#c4efff',
    brightness: 1.04, saturation: 1.1,
    cloud: 1, stars: 0, lights: 0, fireflies: 0,
  },
  {
    hour: 15.5, name: 'Afternoon',
    top: '#579bd5', horizon: '#ffe0ad',
    brightness: 1.02, saturation: 1.08,
    cloud: 0.95, stars: 0, lights: 0, fireflies: 0,
  },
  {
    hour: 18.5, name: 'Sunset',
    top: '#67518e', horizon: '#ffad7b',
    brightness: 0.82, saturation: 1.05,
    cloud: 0.78, stars: 0.03, lights: 0.15, fireflies: 0.05,
  },
  {
    hour: 19.25, name: 'Dusk',
    top: '#30345f', horizon: '#a77b9d',
    brightness: 0.58, saturation: 0.85,
    cloud: 0.58, stars: 0.35, lights: 0.55, fireflies: 0.35,
  },
  {
    hour: 20.5, name: 'Evening',
    top: '#101f43', horizon: '#405477',
    brightness: 0.43, saturation: 0.75,
    cloud: 0.4, stars: 0.75, lights: 0.9, fireflies: 0.65,
  },
  {
    hour: 22, name: 'Night',
    top: '#03091c', horizon: '#142744',
    brightness: 0.5, saturation: 0.8,
    cloud: 0.3, stars: 1, lights: 1, fireflies: 0.75,
  },
]

frames.push({ ...frames[0], hour: 24 })

const lerp = (a, b, t) => a + (b - a) * t

function mixColor(a, b, t) {
  const rgb = hex => hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v, 16))
  const first = rgb(a)
  const second = rgb(b)

  return `rgb(${first.map((v, i) =>
    Math.round(lerp(v, second[i], t))
  ).join(',')})`
}

const lighting = computed(() => {
  const h = hour.value
  const index = frames.findIndex((frame, i) =>
    i < frames.length - 1 &&
    h >= frame.hour &&
    h < frames[i + 1].hour
  )

  const a = frames[Math.max(0, index)]
  const b = frames[Math.max(0, index) + 1]
  const progress = (h - a.hour) / (b.hour - a.hour)

  // Smooth easing between lighting keyframes
  const t = progress * progress * (3 - 2 * progress)

  const result = {
    name: t < 0.5 ? a.name : b.name,
    top: mixColor(a.top, b.top, t),
    horizon: mixColor(a.horizon, b.horizon, t),
  }

  for (const key of [
    'brightness', 'saturation', 'cloud',
    'stars', 'lights', 'fireflies',
  ]) {
    result[key] = lerp(a[key], b[key], t)
  }

  return result
})

const worldStyle = computed(() => ({
  filter: `brightness(${lighting.value.brightness})
           saturate(${lighting.value.saturation})`,
}))

// Sun crosses the sky between 06:00 and 19:00.
// Moon crosses between 19:00 and 06:00.
function celestialStyle(isMoon) {
  const h = hour.value
  const progress = isMoon
    ? ((h - 19 + 24) % 24) / 11
    : (h - 6) / 13

  const visible = progress > 0 && progress < 1 && !isRaining.value
  const p = Math.max(0, Math.min(1, progress))

  return {
    left: `${12 + p * 76}%`,
    top: `${25 - Math.sin(p * Math.PI) * 19}%`,
    opacity: visible
      ? Math.min(1, p * 10, (1 - p) * 10)
      : 0,
  }
}

const displayTime = computed(() => {
  const minutes = Math.floor(hour.value * 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
    minutes % 60
  ).padStart(2, '0')}`
})

// RAININGGG
const isRaining = ref(false)

// Create drops once so they don't reset when the clock updates
const rainDrops = Array.from({ length: 90 }, (_, id) => ({
  id,
  style: {
    left: `${Math.random() * 110}%`,
    height: `${14 + Math.random() * 18}px`,
    opacity: 0.2 + Math.random() * 0.4,
    animationDuration: `${0.7 + Math.random() * 0.5}s`,
    animationDelay: `${-Math.random() * 3}s`,
  },
}))


</script>

<template>
  <div class="world-page">
    <div class="world-scene">
      <!-- Sky colour changes continuously -->
      <div
        class="layer sky"
        :style="{
          background: `linear-gradient(
            to bottom,
            ${lighting.top} 0%,
            ${lighting.horizon} 30%
          )`,
        }"
      ></div>

      <img
        class="celestial sun"
        :src="asset + 'bg_sun.png'"
        :style="celestialStyle(false)"
        alt=""
      />

      <img
        class="celestial moon"
        :src="asset + 'bg_moon.png'"
        :style="celestialStyle(true)"
        alt=""
      />

      <div class="layer" :style="{ opacity: isRaining ? 0 : lighting.stars }">
        <img class="layer stars" :src="asset + 'bg_stars.png'" alt="" />
      </div>

      <div
        class="layer"
        :style="{
          opacity: lighting.cloud,
          filter: `brightness(${lighting.brightness})`,
        }"
      >
        <img class="layer clouds" :src="asset + 'bg_clouds.png'" alt="" />
      </div>

      <!-- One fixed world prevents geometry shifting -->
      <img
        class="layer"
        :src="asset + 'building_img.png'"
        :style="worldStyle"
        alt="StudyDex world with an arena, laboratory and trainer house"
      />



      <div class="layer" :style="{ opacity: isRaining ? 0 : lighting.fireflies }">
        <img
          class="layer fireflies"
          :src="asset + 'bg_firefly.png'"
          alt=""
        />
      </div>

      <!-- Darkening layer: separate from the rain -->
      <div
        class="layer rain-shade"
        :class="{ 'rain-active': isRaining }"
      ></div>

      <!-- Raindrops must be INSIDE this container -->
      <div
        class="layer rain-overlay"
        :class="{ 'rain-active': isRaining }"
        aria-hidden="true"
      >
        <span
          v-for="drop in rainDrops"
          :key="drop.id"
          class="rain-drop"
          :style="drop.style"
        ></span>
      </div>



      <!-- Building navigation -->
      <div class="building-navigation">
        <button
          v-for="building in buildingButtons"
          :key="building.id"
          type="button"
          class="building-button"
          :style="{
            left: building.left,
            top: building.top,
          }"
          @click="selectBuilding(building)"
        >

        <span class="building-button-icon">
          <img
            :src="building.icon"
            :alt="building.title"
            class="building-icon-img"
          />
        </span>

          <span class="building-button-text">
            <span class="building-button-title">
              {{ building.title }}
            </span>

            <span class="building-button-subtitle">
              {{ building.subtitle }}
            </span>
          </span>
        </button>
      </div>
    </div>

    <!-- Development controls: remove when ready -->

    <!-- INCLUDES MANUAL SHIFTING AND AUTO PREVIEW OF TIME  -->
    <div class="preview-controls">
      <label>
        <input v-model="isRaining" type="checkbox" />
        🌧️ Test rain
      </label>
      <label>
        <button
          type="button"
          class="preview-play-button"
          @click="toggleAutoPreview"
        >
          {{ autoPreview ? '⏸ Pause preview' : '▶ Run day cycle' }}
        </button>
        <input
          v-model="live"
          type="checkbox"
          @change="stopAutoPreview"
        />
        Live time
      </label>

      <input
        v-model.number="previewHour"
        type="range"
        min="0"
        max="23.99"
        step="0.01"
        :disabled="live || autoPreview"
        aria-label="Preview time of day"
      />

      <span>{{ displayTime }} · {{ lighting.name }}</span>
    </div>
  </div>
</template>

<style scoped>
.world-page {
  width: 100%;
  background: #071024;
}

.world-scene {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  isolation: isolate;
}

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

img.layer {
  object-fit: fill;
}

.building-lights {
  filter: saturate(0.65);
}

.celestial {
  position: absolute;
  width: 10%;
  height: auto;
  transform: translate(-50%, -50%);
  pointer-events: none;

  transition: opacity 1.5s ease;
}

.moon {
  width: 7%;
}

.clouds {
  inset: auto;
  top: 0;
  left: -5%;
  width: 110%;
  height: 100%;
  max-width: none;
  object-fit: fill;

  animation: cloud-drift 80s ease-in-out infinite alternate;
}

.stars {
  animation: twinkle 5s ease-in-out infinite alternate;
}

.fireflies {
  animation: firefly-float 5s ease-in-out infinite alternate;
}

@keyframes cloud-drift {
  from { transform: translateX(-2%); }
  to { transform: translateX(2%); }
}
@keyframes twinkle {
  from { opacity: 0.65; }
  to { opacity: 1; }
}

@keyframes firefly-float {
  from { transform: translateY(0); opacity: 0.55; }
  to { transform: translateY(-0.8%); opacity: 1; }
}

.preview-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px;
  color: white;
  font: 14px system-ui, sans-serif;
}

.preview-controls input[type="range"] {
  width: min(360px, 70vw);
}

@media (prefers-reduced-motion: reduce) {
  .clouds,
  .stars,
  .fireflies {
    animation: none;
  }
}

/* NAVIGATION BUTTONS */
.building-navigation {
  position: absolute;
  inset: 0;
  z-index: 20;
}

.building-button {

  position: absolute;
  transform: translate(-50%, -100%);

  display: flex;
  align-items: center;
  gap: 10px;

  padding: 10px 14px 10px 10px;
  border: 2px solid white;
  border-radius: 20px;

  background: rgba(255, 253, 247, 0.97);
  color: #26365b;
  box-shadow:
    0 6px 18px rgba(15, 27, 48, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);

  text-align: left;
  white-space: nowrap;
  cursor: pointer;

  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease;
}

.building-button-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  width: 40px;
  height: 40px;

  background: linear-gradient(135deg, #ffe98a, #ffdb59);
  border-radius: 13px;

  overflow: hidden;
}

.building-icon-img {
  width: 30px;
  height: 30px;

  object-fit: contain;
  display: block;
}

.building-button-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.building-button-title {
  font-size: 14px;
  font-weight: 800;
  line-height: 1.2;
}

.building-button-subtitle {
  color: #647394;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
}

.building-button:hover {
  transform: translate(-50%, calc(-100% - 5px));
  background: #fff;
  box-shadow: 0 0 12px 3px rgba(255, 213, 45, 0.7);
}

.building-button:active {
  transform: translate(-50%, -100%) scale(0.97);
}

.building-button:focus-visible {
  outline: 3px solid #ffdc5e;
  outline-offset: 4px;
}

@media (max-width: 600px) {
  .building-button {
    gap: 5px;
    padding: 6px;
    border-radius: 13px;
  }

  .building-button-icon {
    width: 28px;
    height: 28px;
    border-radius: 9px;
    font-size: 17px;
  }

  .building-button-title {
    font-size: 10px;
  }

  .building-button-subtitle {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .building-button {
    transition: none;
  }
}


/* RAIN */
.rain-shade {
  z-index: 6;
  background: rgba(27, 40, 61, 0.3);
  opacity: 0;
  transition: opacity 2s ease;
}

.rain-overlay {
  z-index: 7;
  overflow: hidden;
  container-type: size;
  opacity: 0;
  transition: opacity 1s ease;
}

.rain-shade.rain-active,
.rain-overlay.rain-active {
  opacity: 1;
}

.rain-drop {
  position: absolute;
  top: -40px;
  width: 1px;
  border-radius: 2px;

  background: linear-gradient(
    to bottom,
    transparent,
    rgba(210, 230, 255, 0.85)
  );

  animation: rainfall linear infinite;
  animation-play-state: paused;
}

.rain-active .rain-drop {
  animation-play-state: running;
}

@keyframes rainfall {
  from {
    transform: translate(0, 0) rotate(12deg);
  }

  to {
    transform: translate(-80px, calc(100cqh + 80px)) rotate(12deg);
  }
}

/* Keep navigation above the weather */
.building-navigation {
  z-index: 20;
}

@media (prefers-reduced-motion: reduce) {
  .rain-drop {
    display: none;
  }
}

</style>
