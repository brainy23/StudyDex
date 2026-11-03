<script setup>
defineOptions({ name: 'AvatarStylePreview' })
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const base = import.meta.env.BASE_URL

/*Background (room + live window sky)  */

const images = {
  room: `${base}trainer-home/trainer-home-v3.png`,
  landscape: `${base}trainer-home/window-landscape-clean.png`,
  sun: `${base}town/bg_sun.png`,
  moon: `${base}town/bg_moon.png`,
  stars: `${base}town/bg_stars.png`,
  clouds: `${base}town/bg_clouds.png`,
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

const frames = [
  { hour: 0,     name: 'Night',     top: '#03091c', horizon: '#142744', brightness: 0.5,  saturation: 0.8,  cloud: 0.3,  stars: 1,    lights: 1 },
  { hour: 5.5,   name: 'Night',     top: '#081229', horizon: '#354564', brightness: 0.38, saturation: 0.7,  cloud: 0.38, stars: 0.8,  lights: 1 },
  { hour: 8,     name: 'Day',       top: '#258be0', horizon: '#c7eeff', brightness: 1,    saturation: 1.06, cloud: 1,    stars: 0,    lights: 0 },
  { hour: 12,    name: 'Day',       top: '#1685df', horizon: '#c4efff', brightness: 1.04, saturation: 1.1,  cloud: 1,    stars: 0,    lights: 0 },
  { hour: 15.5,  name: 'Afternoon', top: '#579bd5', horizon: '#ffe0ad', brightness: 1.02, saturation: 1.08, cloud: 0.95, stars: 0,    lights: 0 },
  { hour: 18.5,  name: 'Sunset',    top: '#67518e', horizon: '#ffad7b', brightness: 0.82, saturation: 1.05, cloud: 0.78, stars: 0.03, lights: 0.15 },
  { hour: 19.25, name: 'Dusk',      top: '#30345f', horizon: '#a77b9d', brightness: 0.58, saturation: 0.85, cloud: 0.58, stars: 0.35, lights: 0.55 },
  { hour: 20.5,  name: 'Evening',   top: '#101f43', horizon: '#405477', brightness: 0.43, saturation: 0.75, cloud: 0.4,  stars: 0.75, lights: 0.9 },
  { hour: 22,    name: 'Night',     top: '#03091c', horizon: '#142744', brightness: 0.5,  saturation: 0.8,  cloud: 0.3,  stars: 1,    lights: 1 },
]
frames.push({ ...frames[0], hour: 24 })

const lerp = (a, b, t) => a + (b - a) * t

function mixColor(firstHex, secondHex, t) {
  const toRgb = hex => hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16))
  const first = toRgb(firstHex)
  const second = toRgb(secondHex)
  const result = first.map((value, index) => Math.round(lerp(value, second[index], t)))
  return `rgb(${result.join(',')})`
}

const lighting = computed(() => {
  const index = frames.findIndex((frame, i) =>
    i < frames.length - 1 && hour.value >= frame.hour && hour.value < frames[i + 1].hour
  )
  const safeIndex = Math.max(0, index)
  const a = frames[safeIndex]
  const b = frames[safeIndex + 1]

  const progress = Math.max(0, Math.min(1, (hour.value - a.hour) / (b.hour - a.hour)))
  const t = progress * progress * (3 - 2 * progress)

  const result = {
    name: t < 0.5 ? a.name : b.name,
    top: mixColor(a.top, b.top, t),
    horizon: mixColor(a.horizon, b.horizon, t),
  }
  for (const key of ['brightness', 'saturation', 'cloud', 'stars', 'lights']) {
    result[key] = lerp(a[key], b[key], t)
  }
  return result
})

const skyStyle = computed(() => ({
  background: `linear-gradient(to bottom, ${lighting.value.top} 0%, ${lighting.value.horizon} 55%, ${lighting.value.horizon} 100%)`,
}))

const landscapeStyle = computed(() => ({
  filter: `brightness(${lighting.value.brightness}) saturate(${lighting.value.saturation})`,
}))

const cloudStyle = computed(() => ({
  opacity: lighting.value.cloud,
  filter: `brightness(${lighting.value.brightness})`,
}))

const roomStyle = computed(() => ({
  filter: `brightness(${0.55 + lighting.value.brightness * 0.45}) saturate(${0.9 + lighting.value.saturation * 0.1})`,
}))

const sunsetStrength = computed(() => Math.max(0, 1 - Math.abs(hour.value - 18.3) / 2))

function celestialStyle(isMoon) {
  const h = hour.value
  const progress = isMoon ? ((h - 19 + 24) % 24) / 11 : (h - 6) / 13
  const visible = progress > 0 && progress < 1
  const p = Math.max(0, Math.min(1, progress))

  return {
    left: `${18 + p * 64}%`,
    top: `${48 - Math.sin(p * Math.PI) * 36}%`,
    opacity: visible ? Math.min(1, p * 12, (1 - p) * 12) : 0,
  }
}

/*Character  */

// image = picture in the list, head = profile badge picture, idleImage = 4-frame idle sheet
const avatars = [
  { id: 'female-classic', gender: 'female', image: `${base}avatars/girl_0.png`, head: `${base}heads/girl_0-head.png`, idleImage: `${base}avatars/female-idle.png` },
  { id: 'male-classic',   gender: 'male',   image: `${base}avatars/boy_0.png`,  head: `${base}heads/boy_0-head.png`, idleImage: `${base}avatars/male-idle.png` },
  { id: 'female-1', gender: 'female', image: `${base}avatars/girl_1.png`, head: `${base}heads/girl_1-head.png`, idleImage: `${base}avatars/girl_1-idle.png` },
  { id: 'male-1',   gender: 'male',   image: `${base}avatars/boy_1.png`,  head: `${base}heads/boy_1-head.png`, idleImage: `${base}avatars/boy_1-idle.png` },
  { id: 'female-2', gender: 'female', image: `${base}avatars/girl_2.png`, head: `${base}heads/girl_2-head.png`, idleImage: `${base}avatars/girl_2-idle.png` },
  { id: 'male-2',   gender: 'male',   image: `${base}avatars/boy_2.png`,  head: `${base}heads/boy_2-head.png`, idleImage: `${base}avatars/boy_2-idle.png` },
  { id: 'female-3', gender: 'female', image: `${base}avatars/girl_3.png`, head: `${base}heads/girl_3-head.png`, idleImage: `${base}avatars/girl_3-idle.png` },
  { id: 'male-3',   gender: 'male',   image: `${base}avatars/boy_3.png`,  head: `${base}heads/boy_3-head.png`, idleImage: `${base}avatars/boy_3-idle.png` },
  { id: 'female-4', gender: 'female', image: `${base}avatars/girl_4.png`, head: `${base}heads/girl_4-head.png`, idleImage: `${base}avatars/girl_4-idle.png` },
  { id: 'male-4',   gender: 'male',   image: `${base}avatars/boy_4.png`,  head: `${base}heads/boy_4-head.png`, idleImage: `${base}avatars/boy_4-idle.png` },
]

const selectedId = ref(avatars[0].id)

const selected = computed(() => avatars.find(a => a.id === selectedId.value))

// Shown in the profile badge. Change this to user's username.
const username = ref('Trainer')

// Load every idle sheet up front. If one can't load, show the still picture instead.
const missingIdle = ref([])

onMounted(() => {
  avatars.forEach(a => {
    const img = new Image()
    img.onerror = () => {
      missingIdle.value.push(a.id)
      console.warn('Idle sheet not found:', a.idleImage)
    }
    img.src = a.idleImage
  })
})

function start() {
  router.push({ name: 'tutorial' })
}
</script>

<template>
  <main class="trainer-page">
    <!-- profile badge (top left) -->
    <div class="profile-badge">
      <div class="head-circle">
        <img :src="selected.head" alt="" class="head" />
      </div>
      <span class="username">{{ username }}</span>
    </div>

    <div class="trainer-scene">

      <!-- live sky in the window -->
      <div class="window-view" aria-hidden="true">
        <div class="outdoor-layer sky-layer" :style="skyStyle"></div>

        <div class="outdoor-layer stars-layer" :style="{ opacity: lighting.stars }">
          <img class="stars-image" :src="images.stars" alt="" draggable="false" />
        </div>

        <div class="outdoor-layer clouds-layer" :style="cloudStyle">
          <img class="clouds-image" :src="images.clouds" alt="" draggable="false" />
        </div>

        <img class="celestial sun-image" :src="images.sun" :style="celestialStyle(false)" alt="" draggable="false" />
        <img class="celestial moon-image" :src="images.moon" :style="celestialStyle(true)" alt="" draggable="false" />

        <img class="landscape-image" :src="images.landscape" :style="landscapeStyle" alt="" draggable="false" />

        <div class="outdoor-layer sunset-layer" :style="{ opacity: sunsetStrength * 0.2 }"></div>
      </div>

      <!-- room -->
      <img class="room-image" :src="images.room" :style="roomStyle" alt="" draggable="false" />

      <div class="window-warmth" :style="{ opacity: sunsetStrength * 0.3 }" aria-hidden="true"></div>
      <div class="lamp-glow desk-glow" :style="{ opacity: lighting.lights * 0.65 }" aria-hidden="true"></div>
      <div class="lamp-core desk-core" :style="{ opacity: lighting.lights * 0.85 }" aria-hidden="true"></div>

      <!-- chosen avatar on the carpet -->
      <div class="trainer-figure">
        <img
          v-if="missingIdle.includes(selected.id)"
          :src="selected.image"
          class="trainer-sprite"
          alt="Your avatar"
        />
        <div
          v-else
          :key="selected.id"
          class="trainer-idle"
          :style="{ backgroundImage: `url('${selected.idleImage}')` }"
          role="img"
          aria-label="Your avatar"
        ></div>
      </div>
    </div>

    <!-- choosing panel -->
    <section class="choose-panel">
      <h1>Preview avatar styles</h1>

      <p role="note">Preview only. These styles are not saved. Your account avatar stays the same.</p>
      <div class="list">
        <button
          v-for="avatar in avatars"
          :key="avatar.id"
          type="button"
          :class="['pick', { active: avatar.id === selectedId }]"
          :aria-label="`Preview ${avatar.id}`"
          :aria-pressed="avatar.id === selectedId"
          @click="selectedId = avatar.id"
        >
          <img :src="avatar.image" alt="" />
        </button>
      </div>

      <button class="start-btn" type="button" @click="start">
        Continue to tutorial
      </button>
    </section>
  </main>
</template>

<style scoped>
.trainer-page,
.trainer-page * { box-sizing: border-box; }

.trainer-page { position: relative; width: 100%; height: 100dvh; overflow: hidden; background: #101925; }

/* The room always covers the whole screen (like background-size: cover) */
.trainer-scene {
  position: absolute;
  left: 50%;
  top: 50%;
  width: max(100vw, calc(100dvh * 1672 / 941));
  aspect-ratio: 1672 / 941;
  transform: translate(-50%, -50%);
  overflow: hidden;
  isolation: isolate;
  background: #17243b;
}

/*background */
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

.window-warmth { position: absolute; left: 22%; top: 45%; width: 55%; height: 48%; z-index: 2; background: radial-gradient(ellipse at 50% 15%, rgba(255, 179, 95, 0.8), rgba(255, 166, 88, 0.2) 45%, transparent 72%); mix-blend-mode: screen; pointer-events: none; }
.lamp-glow { position: absolute; z-index: 2; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient(ellipse, rgba(255, 214, 133, 0.65) 0%, rgba(255, 191, 95, 0.3) 28%, rgba(255, 168, 65, 0.08) 50%, transparent 72%); mix-blend-mode: screen; pointer-events: none; }
.desk-glow { left: 17%; top: 49%; width: 24%; height: 36%; }
.lamp-core { position: absolute; z-index: 3; transform: translate(-50%, -50%); background: radial-gradient(ellipse, rgba(255, 246, 201, 0.95), rgba(255, 215, 137, 0.45) 45%, transparent 75%); mix-blend-mode: screen; pointer-events: none; }
.desk-core { left: 17%; top: 41.5%; width: 3.3%; height: 2.5%; }

@keyframes cloud-drift {
  from { transform: translateX(-2%); }
  to { transform: translateX(2%); }
}
@keyframes star-twinkle {
  from { opacity: 0.65; }
  to { opacity: 1; }
}

/* avatar on the carpet  */
.trainer-figure {
  position: absolute;
  left: 51%;
  top: 85%;
  width: 21%;
  aspect-ratio: 2 / 3;
  transform: translate(-50%, -100%);
  z-index: 6;
}

.trainer-sprite {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: bottom;
}

/* Four 512 × 768 crops from the 2048 × 768 idle strips */
.trainer-idle {
  width: 100%;
  aspect-ratio: 2 / 3;
  background-repeat: no-repeat;
  background-size: 400% 100%;
  background-position: 4.166667% 0;
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
  .clouds-image, .stars-image, .trainer-idle { animation: none; }
}

/* choosing panel (match the login page) */
.choose-panel {
  position: absolute;
  top: 50%;
  right: 3%;
  transform: translateY(-50%);
  z-index: 10;
  width: min(340px, 30vw);
  max-height: 92dvh;
  overflow: auto;
  padding: 20px;
  border-radius: 12px;
  background: #072578;
  border: 2px solid #ffd117;
  box-shadow: 3px 3px 6px #232323;
  font-family: 'Fredoka', sans-serif;
  color: white;
}

h1 {
  margin: 0 0 16px;
  font: 600 24px 'Fredoka', sans-serif;
  text-align: center;
  color: white;
  -webkit-text-stroke: 4px black;
  paint-order: stroke fill;
}

.list {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 22px;
}

.pick {
  padding: 4px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 3px 3px 6px #232323;
  cursor: pointer;
  transition: transform 0.2s;
}

.pick:hover {
  transform: scale(1.1);
}

.pick.active {
  border-color: #ffd117;
  background: #fff2b0;
}

.pick img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 5;
  object-fit: contain;
}

/* same as the login button */
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.start-btn {
  display: block;
  width: 205px;
  height: 40px;
  margin: 0 auto;
  border: 2px solid #ffd117;
  border-radius: 12px;
  background-color: #072578;
  color: white;
  box-shadow: 3px 3px 6px #232323;
  font: 500 20px 'Fredoka', sans-serif;
  cursor: pointer;
}

.start-btn:hover {
  transform: scale(1.2);
  border-color: transparent;
  background:
    linear-gradient(#072578, #072578) padding-box,
    conic-gradient(from var(--angle), #b8860b, #ffd117, #fff2b0, #ffd117, #b8860b, #daa520, #b8860b) border-box;
  animation: spin-border 3s linear infinite;
}

@keyframes spin-border {
  to { --angle: 360deg; }
}

/* ----- profile badge (top left) ----- */
.profile-badge {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'Fredoka', sans-serif;
}

.head-circle {
  width: 104px;
  height: 104px;
  overflow: hidden;
  border-radius: 50%;
  border: 4px solid #ffd117;
  outline: 4px solid #072578;
  background: radial-gradient(circle at 50% 35%, #d4f1ff, #a9dff7 70%);
  box-shadow: 3px 3px 8px #232323;
}

.head {
  display: block;
  width: 100%;
  height: 100%;
}

.username {
  position: relative;
  margin-top: -16px;
  max-width: 140px;
  padding: 3px 14px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  background: #072578;
  border: 2px solid #ffd117;
  border-radius: 12px;
  box-shadow: 3px 3px 6px #232323;
  color: white;
  font-size: 16px;
  font-weight: 600;
}

@media (max-width: 520px) {
  .profile-badge { top: 12px; left: 12px; }
  .head-circle { width: 72px; height: 72px; border-width: 3px; outline-width: 3px; }
  .username { margin-top: -12px; font-size: 13px; padding: 2px 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .trainer-page *, .trainer-page *::before, .trainer-page *::after { animation: none !important; transition: none !important; }
}
.pick:focus-visible, .start-btn:focus-visible { outline: 4px solid #fff; outline-offset: 4px; }
</style>