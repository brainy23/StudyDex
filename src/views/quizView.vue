<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { scienceTopics, demoBank } from '../data/scienceQuizData'
const route = useRoute()
const router = useRouter()
import ClockWeather from '../components/common/ClockWeather.vue'
import { getCurrentProfile } from '../services/profileService'
import { getStudyCatalogue, studyErrorMessage } from '../services/studyService'
const profile = ref(null)
const catalogue = ref({ subjects: [], topics: [] })
const loading = ref(true)
const error = ref(null)
let alive = true
let generation = 0
async function initialise() {
  const request = ++generation
  loading.value = true
  error.value = null
  try {
    const student = await getCurrentProfile()
    if (!alive || request !== generation) return
    profile.value = student
    if (student.school_level_id) {
      // Science demos work even when the published catalogue is unavailable.
      try {
        const data = await getStudyCatalogue(student.school_level_id)
        if (alive && request === generation) catalogue.value = data
      } catch { catalogue.value = { subjects: [], topics: [] } }
    }
  } catch (cause) {
    if (alive && request === generation) error.value = cause
  } finally {
    if (alive && request === generation) loading.value = false
  }
}
onMounted(() => {
  if (!route.query.topic) router.replace({ name:'selection-subjects', query:{ flow:'quiz' } })
  else initialise()
})
onUnmounted(() => { alive = false; generation++ })
const base = import.meta.env.BASE_URL

const images = {
  arena: `${base}poke-arena/poke-arena4.png`,
  sun: `${base}town/bg_sun.png`,
  moon: `${base}town/bg_moon.png`,
  clouds: `${base}town/bg_clouds.png`,
  stars: `${base}town/bg_stars.png`,
}


const currentTime = ref(new Date())
// Preview bar has its own layout row below the arena.
const live = ref(true)
const previewHour = ref(12)
const autoPreview = ref(false)
let previewInterval
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
  const next = Number(value)
  if (!Number.isFinite(next)) return
  stopAutoPreview()
  live.value = false
  previewHour.value = ((next % 24) + 24) % 24
}
function toggleAutoPreview() {
  if (autoPreview.value) { stopAutoPreview(); return }
  previewHour.value = hour.value
  live.value = false
  autoPreview.value = true
  const startedAt = performance.now()
  const startHour = previewHour.value
  previewInterval = setInterval(() => {
    previewHour.value = (startHour + (performance.now() - startedAt) / 60000 * 24) % 24
  }, 50)
}
onUnmounted(stopAutoPreview)

let clockInterval

const hour = computed(() => {
  if (!live.value) return previewHour.value
  const time = currentTime.value

  return (
    time.getHours() +
    time.getMinutes() / 60 +
    time.getSeconds() / 3600
  )
})

// Opening hours: 7am until midnight.
const quizzesOpen = computed(() => true)

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

const enteredArena = ref(false)
const entryError = ref('')
function returnToSelection() {
  clearAttack()
  router.push({ name:'selection-topics', query:{ flow:'quiz', course:route.query.course === 'foundation' ? 'foundation' : 'standard' } })
}
const spriteLoading = ref(false)
const spriteError = ref('')
const fighters = ref([])
let spriteController
function readArenaBuddy() {
  try {
    const saved = JSON.parse(localStorage.getItem('studydex-active-buddy'))
    const id = Number(saved?.pokeapi_id ?? saved?.id)
    if (Number.isInteger(id) && id > 0) return { id, name: saved.name }
  } catch { /* Use a preview buddy when none has been saved. */ }
  return { id: 25, name: 'Pikachu' }
}

async function loadArenaFighters() {
  spriteController?.abort()
  const controller = new AbortController()
  spriteController = controller
  spriteLoading.value = true
  spriteError.value = ''
  const selected = readArenaBuddy()
  // Grounded, fully evolved mentors: Venusaur, Blastoise, Raichu,
  // Nidoqueen, Nidoking, Alakazam, Machamp, Meganium, Typhlosion,
  // Feraligatr, Sceptile, Blaziken and Swampert.
  const pool = [3, 9, 26, 31, 34, 65, 68, 154, 157, 160, 254, 257, 260]
    .filter(id => id !== selected.id)
  const enemyId = pool[Math.floor(Math.random() * pool.length)]
  try {
    const data = await Promise.all([selected.id, enemyId].map(async id => {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}/`, { signal: controller.signal })
      if (!response.ok) throw new Error(`Pokémon request failed: ${response.status}`)
      return response.json()
    }))
    if (controller.signal.aborted) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    fighters.value = data.map((pokemon, index) => {
      const side = index === 0 ? 'back_default' : 'front_default'
      const still = pokemon.sprites?.[side]
      const animated = pokemon.sprites?.versions?.['generation-v']?.['black-white']?.animated?.[side]
      return {
        name: index === 0 ? selected.name || pokemon.name : pokemon.name,
        image: (!reduceMotion && animated) || still,
        still, failed: false, padding: 0,
      }
    })
  } catch (cause) {
    if (cause.name !== 'AbortError') spriteError.value = 'Battle buddies could not load.'
  } finally {
    if (spriteController === controller) spriteLoading.value = false
  }
}
function arenaSpriteError(fighter) {
  if (fighter.still && fighter.image !== fighter.still) {
    fighter.image = fighter.still
    fighter.padding = 0
  } else fighter.failed = true
}
// Align the visible feet, rather than the transparent image edge, to the floor.
function groundArenaSprite(event, fighter) {
  try {
    const img = event.target
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx || !canvas.width || !canvas.height) return
    ctx.drawImage(img, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    for (let y = canvas.height - 1; y >= 0; y--) {
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 32) {
          fighter.padding = (canvas.height - 1 - y) / canvas.height * 100
          return
        }
      }
    }
  } catch { fighter.padding = 0 }
}

onMounted(loadArenaFighters)
onUnmounted(() => spriteController?.abort())


// Local practice questions only. No scores, EXP or rewards are saved.
const selectedDemoTopic = ref(null)
const demoIndex = ref(0)
const demoChoice = ref(null)
const demoScore = ref(0)
const demoFinished = ref(false)
const attackSide = ref(null)
let attackTimer
const demoQuestions = computed(() => demoBank[selectedDemoTopic.value?.key] || [])
const demoQuestion = computed(() => demoQuestions.value[demoIndex.value])
function clearAttack() { clearTimeout(attackTimer); attackSide.value = null }
function restartDemo() {
  clearAttack()
  demoIndex.value = 0
  demoChoice.value = null
  demoScore.value = 0
  demoFinished.value = false
}
function answerDemo(index) {
  if (demoChoice.value !== null || demoFinished.value || !quizzesOpen.value) return
  demoChoice.value = index
  const correct = index === demoQuestion.value[2]
  if (correct) demoScore.value++
  clearAttack()
  attackSide.value = correct ? 0 : 1
  attackTimer = setTimeout(() => { attackSide.value = null }, 1000)
}
function nextDemo() {
  if (demoChoice.value === null) return
  clearAttack()
  if (demoIndex.value + 1 >= demoQuestions.value.length) demoFinished.value = true
  else { demoIndex.value++; demoChoice.value = null }
}
onUnmounted(clearAttack)
function openRequestedBattle() {
  if (loading.value || error.value || !profile.value?.school_level_id) return
  enteredArena.value = false
  entryError.value = ''
  const match = String(profile.value.school_level?.name || '').match(/^(?:primary\s*|p\s*)?([3-6])(?:\b|$)/i)
  const level = match ? Number(match[1]) : null
  const item = scienceTopics.find(t => t.key === route.query.topic && t.level === level && !(route.query.course === 'foundation' && t.standardOnly))
  if (!item || !demoBank[item.key]?.length) { entryError.value = 'This quiz is unavailable for your school level. Choose another topic.'; return }
  if (!quizzesOpen.value) { entryError.value = 'Quizzes open at 7am. Please come back then.'; return }
  selectedDemoTopic.value = item
  restartDemo()
  enteredArena.value = true
}
watch([loading, () => route.query.topic, () => route.query.course, quizzesOpen], openRequestedBattle)


</script>
<template>
  <div class="arena-with-preview">
  <main class="arena-page" :style="skyStyle">
    <div class="arena-scene" :class="{ 'selection-blur': !enteredArena }" :inert="!enteredArena">
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


      <!-- The question stays on the arena's built-in screen. -->
      <section v-if="enteredArena && quizzesOpen" class="quiz-content demo-board" aria-label="Demo quiz">
        <div class="demo-caption"><span>SCIENCE · {{ selectedDemoTopic?.name }}</span><span>{{ demoFinished ? 'Complete' : `${demoIndex + 1} / ${demoQuestions.length}` }}</span></div>
        <h2 id="arena-question">{{ demoFinished ? 'Well done, trainer!' : demoQuestion?.[0] }}</h2>
        <p v-if="demoFinished">You answered {{ demoScore }} of {{ demoQuestions.length }} correctly.</p>
      </section>

      <!-- Classic battle menu: dialogue left, four choices right. -->
      <section v-if="enteredArena && quizzesOpen" class="battle-dock" aria-label="Battle answer controls">
        <div class="battle-dialogue" aria-live="polite">
          <template v-if="demoFinished">
            <span class="dialogue-kicker">ENCOUNTER COMPLETE</span>
            <p>Great practice, trainer! Ready for another challenge?</p>
            <small>Demo practice · results are not saved.</small>
          </template>
          <template v-else-if="demoChoice === null">
            <p>What will <strong>{{ fighters[0]?.name || 'your buddy' }}</strong> do?</p>
          </template>
          <template v-else>
            <p class="battle-explanation">{{ demoQuestion[3] }}</p>
            <button type="button" class="battle-next" @click="nextDemo">{{ demoIndex + 1 === demoQuestions.length ? 'See results' : 'Next question' }} →</button>
          </template>
        </div>
        <div v-if="demoFinished" class="battle-end-actions">
          <button type="button" @click="restartDemo">Play again</button>
          <button type="button" @click="returnToSelection">Choose topic</button>
        </div>
        <div v-else-if="demoQuestion" class="demo-answers" role="group" aria-labelledby="arena-question">
          <button v-for="(answer, index) in demoQuestion[1]" :key="`${demoIndex}-${index}`" type="button" :class="['demo-answer-' + index, { correct: demoChoice !== null && index === demoQuestion[2], wrong: demoChoice === index && index !== demoQuestion[2] }]" :disabled="demoChoice !== null" @click="answerDemo(index)">
            <b class="choice-letter">{{ ['A','B','C','D'][index] }}</b><span class="choice-text">{{ answer }}</span>
            <span v-if="demoChoice !== null && index === demoQuestion[2]" aria-label="Correct answer">✓</span>
            <span v-else-if="demoChoice === index" aria-label="Incorrect answer">✕</span>
          </button>
        </div>
      </section>
      <div v-for="(fighter, index) in fighters" :key="index" class="arena-fighter" :class="[index === 0 ? 'player-fighter' : 'opponent-fighter', { 'is-hit': attackSide !== null && attackSide !== index }]">
        <div class="fighter-shadow"></div>
        <img v-if="fighter.image && !fighter.failed" :key="fighter.image" :src="fighter.image" :alt="`${fighter.name}, ${index === 0 ? 'rear view' : 'front view'}`" crossorigin="anonymous" :style="{ transform: `translateY(${fighter.padding}%)` }" @load="groundArenaSprite($event, fighter)" @error="arenaSpriteError(fighter)" />
        <span v-else class="fighter-unavailable">Sprite unavailable</span>
        
      </div>
      <p v-if="spriteError && enteredArena" class="sprite-status">{{ spriteError }} <button type="button" @click="loadArenaFighters">Retry</button></p>

    </div>

    <!-- CLOCK / EXIT -->
    <header class="arena-hud">
      <RouterLink to="/home" class="home-link">
        ‹ Back to town
      </RouterLink>

      <button v-if="enteredArena" type="button" class="home-link change-topic" @click="returnToSelection">Topics</button>
      <div v-show="enteredArena" class="quiz-clock-weather">
        <ClockWeather />
      </div>
    </header>


    <section v-if="!enteredArena" class="arena-picker redesigned-picker" style="padding:100px 24px;">
      <p v-if="loading" role="status">Opening your battle…</p>
      <div v-else-if="error" role="alert"><p>{{ studyErrorMessage(error, 'Your Arena content') }}</p><button @click="initialise">Try again</button></div>
      <div v-else-if="!profile?.school_level_id"><p>Set your school level to see the right quizzes.</p><RouterLink to="/account">Account settings</RouterLink></div>
      <div v-else role="status"><p>{{ entryError }}</p><button @click="returnToSelection">Choose a topic</button></div>
    </section>


  </main>

  </div>
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

.home-link {
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

  .home-link {
    padding: 8px 10px;
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

/* ENTRY PICKER */
.arena-scene { transition: filter .35s ease; }
.arena-scene.selection-blur { filter: blur(9px) brightness(.64); pointer-events: none; }
.arena-picker { position: absolute; z-index: 8; inset: 90px 0 0; overflow-y: auto; padding: 28px 24px 130px; color: white; text-align: center; }
.picker-shell { width: min(940px, 100%); margin: auto; padding: 28px 0; }
.picker-eyebrow { color: #ffe9ae; font-size: 12px; font-weight: 800; letter-spacing: .2em; }
.picker-shell h1 { margin: 16px 0 12px; color: white; font-size: clamp(28px, 4vw, 48px); font-weight: 800; text-shadow: 0 3px 18px #0007; }
.picker-intro { margin-bottom: 28px; color: #fff6e3; font-size: 17px; }
.bubble-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 22px; }
.bubble-card { position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 14px; width: 100%; min-height: 190px; padding: 26px 20px; border: 1px solid #ffffff9e; border-radius: 32px; background: linear-gradient(145deg, #ffffff38, #ffffff12); box-shadow: inset 0 1px 0 #ffffffb3, inset 0 -1px 0 #ffffff26, 0 12px 30px #071b3544; backdrop-filter: blur(18px); color: white; font: inherit; cursor: pointer; transition: transform .18s, background .18s, box-shadow .18s; }
.bubble-card strong { font-size: 22px; line-height: 1.3; overflow-wrap: anywhere; }
.bubble-card > span:last-child { font-size: 13px; color: #fff5df; }
.bubble-symbol { font-size: 36px; color: #ffe699; text-shadow: 0 0 18px #ffe4a455; }
.bubble-card:hover:not(:disabled) { transform: translateY(-5px); background: linear-gradient(145deg, #ffffff55, #ffffff22); box-shadow: 0 0 0 2px #ffe19a, 0 18px 38px #071b3555; }
.bubble-card:disabled { opacity: .65; cursor: not-allowed; }
.topic-choice { display: flex; flex-direction: column; gap: 12px; }
.topic-choice .bubble-card { flex: 1; }
.revise-link { color: #ffe6a1; font-weight: 700; font-size: 14px; }
.picker-back, .glass-action { display: inline-block; margin: 0 0 22px; padding: 12px 20px; border: 1px solid #ffffff88; border-radius: 20px; background: #ffffff22; color: white; text-decoration: none; font: inherit; cursor: pointer; }
.picker-footnote { margin: 28px 0 0; font-size: 12px; color: #e0e8f5; }
.picker-notice { padding: 12px; border: 1px solid #ffe19a77; border-radius: 12px; background: #203046b3; }
.change-topic { cursor: pointer; font: inherit; }
.quiz-content :deep(.study-panel), .quiz-content :deep(.study-empty), .quiz-content :deep(.study-message) { background: transparent; box-shadow: none; border: 0; color: #fff5dc; padding: 5px; }
.quiz-content :deep(h2), .quiz-content :deep(h3), .quiz-content :deep(p) { color: #fff5dc; }
.quiz-content :deep(h2) { font-size: clamp(17px, 1.6cqw, 26px); }
.arena-topic-caption { font-size: 12px; color: #ffdc81; margin: 0 0 8px; }
.sprite-status { position: absolute; z-index: 8; bottom: 2%; left: 35%; background: #17304d; color: white; padding: 8px; border-radius: 10px; }
.arena-picker button:focus-visible, .arena-picker a:focus-visible { outline: 3px solid #ffdf86; outline-offset: 4px; }
.arena-fighter { position: absolute; z-index: 7; height: 0; transform: translateX(-50%); }
.player-fighter { left: 32%; top: 77%; width: 11%; }
.opponent-fighter { left: 67%; top: 72%; width: 10.5%; }
.arena-fighter > img { position: absolute; bottom: 0; left: 0; width: 100%; height: auto; image-rendering: pixelated; filter: drop-shadow(0 3px 1px #1b253044); }
.fighter-shadow { position: absolute; top: -.3cqw; left: 23%; width: 54%; height: 1cqw; border-radius: 50%; background: #31221466; filter: blur(3px); }
.fighter-name { position: absolute; top: 1cqw; left: 50%; transform: translateX(-50%); border: 1px solid #e6bf60; border-radius: 20px; padding: 4px 12px; color: #fff4d0; background: #182c43e8; text-transform: capitalize; font-size: clamp(10px, .9cqw, 14px); white-space: nowrap; }
.fighter-unavailable { position: absolute; bottom: 10px; background: #172c43; padding: 8px; font-size: 11px; }

@media (max-width: 700px) {
  .arena-picker { padding: 12px 18px 180px; }
  .bubble-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .bubble-card { min-height: 160px; padding: 18px 10px; border-radius: 24px; }
  .bubble-card strong { font-size: 17px; }
  .arena-page:has(.arena-scene:not(.selection-blur)) { overflow-y: auto; display: block; padding-top: 75px; }
  .arena-scene:not(.selection-blur) { width: 100%; aspect-ratio: auto; padding-top: calc(100vw * 941 / 1672); overflow: visible; }
  .arena-scene:not(.selection-blur) > .layer { height: calc(100vw * 941 / 1672); }
  .arena-scene:not(.selection-blur) .quiz-content { position: relative; left: auto; top: auto; width: calc(100% - 24px); height: auto; margin: 16px 12px 180px; padding: 18px; background: #1b3048; border: 3px solid #d4b369; border-radius: 16px; }
  .arena-scene:not(.selection-blur) .player-fighter { top: calc(100vw * 941 / 1672 * .77); }
  .arena-scene:not(.selection-blur) .opponent-fighter { top: calc(100vw * 941 / 1672 * .72); }
}
@media (prefers-reduced-motion: reduce) { .arena-scene, .bubble-card { transition: none; } }

.science-filters { display: grid; justify-items: center; gap: 14px; margin-bottom: 24px; }
.science-filters label { display: flex; gap: 10px; align-items: center; }
.science-filters p { margin: 0; max-width: 650px; font-size: 12px; line-height: 1.6; color: #e2ebf6; }
.science-theme { color: #ffe49b; text-transform: uppercase; font-size: 10px; letter-spacing: .12em; }
.science-detail { font-size: 11px; line-height: 1.5; color: #eff5ff; }
.science-level-label { padding: 10px 20px; border: 1px solid #ffe29b; border-radius: 20px; background: #ffe29b; color: #20334b; }
.science-filters select { padding: 10px 16px; border-radius: 16px; background: #21374e; color: white; font: inherit; }

/* CLASSIC BATTLE LAYOUT — no levels, HP or XP panels. */
.demo-board { display: flex; flex-direction: column; align-items: stretch; justify-content: center; text-align: center; padding: 1cqw 1.4cqw; }
.demo-caption { display: flex; justify-content: space-between; gap: 10px; color: #ffe6a2; font-size: clamp(9px, .8cqw, 13px); font-weight: 800; }
.demo-board h2 { margin: auto 0; padding: 12px 0; font-size: clamp(20px, 2cqw, 34px); line-height: 1.35; color: #fff8e7; }
.demo-board > p { color: #fff8e7; }
.battle-dock { position: absolute; z-index: 9; left: 2%; right: 2%; bottom: 1.5%; height: 19%; display: grid; grid-template-columns: 42% minmax(0, 1fr); gap: 12px; padding: 10px; border: 3px solid #344652; border-radius: 18px; background: #ede8d7; box-shadow: 0 5px 0 #192735, inset 0 0 0 2px #fff9dc; color: #263548; }
.battle-dialogue { min-width: 0; overflow-y: auto; padding: 12px 16px; border: 3px solid #d6b254; border-radius: 9px; background: #183047; box-shadow: inset 0 0 0 2px #080f1d; color: #fff5dc; }
.dialogue-kicker { color: #ffdc83; font-size: clamp(9px, .7cqw, 12px); font-weight: 900; letter-spacing: .1em; }
.battle-dialogue p { margin: 8px 0; font-size: clamp(15px, 1.4cqw, 23px); line-height: 1.3; }
.battle-dialogue strong { text-transform: capitalize; }
.battle-dialogue small { font-size: clamp(10px, .85cqw, 14px); color: #d7e5ec; }
.battle-dialogue .battle-explanation { font-size: clamp(12px, 1cqw, 17px); }
.demo-answers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 8px; min-height: 0; }
.demo-answers button { display: flex; align-items: center; gap: 8px; min-width: 0; min-height: 0; overflow-y: auto; padding: 8px 12px; border: 3px solid #fff4d2; outline: 2px solid #45515b; border-radius: 18px; color: white; font: inherit; font-size: clamp(11px, 1.1cqw, 18px); font-weight: 800; text-align: left; cursor: pointer; box-shadow: inset 0 -5px 0 #0002, inset 0 2px 0 #fff6; }
.choice-letter { display: grid; place-items: center; flex: 0 0 25px; height: 25px; border-radius: 50%; background: #0002; font-size: 12px; }
.choice-text { flex: 1; overflow-wrap: anywhere; }
.demo-answer-0 { background: #be4358; }.demo-answer-1 { background: #dfb94e; color: #26334a !important; }.demo-answer-2 { background: #488247; }.demo-answer-3 { background: #396d99; }
.demo-answers button:hover:not(:disabled) { filter: brightness(1.15); }
.demo-answers button:disabled { cursor: default; }
.demo-answers .correct { outline: 3px solid #ffe270; border-color: #ffe270; }
.demo-answers .wrong { border-style: dashed; }
.battle-next, .battle-end-actions button { padding: 8px 12px; border: 2px solid #b58d32; border-radius: 9px; background: #ffe08a; color: #26334a; font: inherit; font-weight: 800; cursor: pointer; }
.battle-next { font-size: 12px; }
.battle-end-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.battle-dock button:focus-visible { outline: 3px solid #fff; outline-offset: -6px; }
@media (max-width: 700px) {
  .arena-scene:not(.selection-blur) .quiz-content { margin-bottom: 12px; }
  .arena-scene:not(.selection-blur) .player-fighter { top: calc(100vw * 941 / 1672 * .77); }
  .arena-scene:not(.selection-blur) .opponent-fighter { top: calc(100vw * 941 / 1672 * .72); }
  .battle-dock { position: relative; left: auto; right: auto; bottom: auto; width: calc(100% - 24px); height: auto; margin: 12px 12px 180px; grid-template-columns: 1fr; }
  .battle-dialogue { max-height: 180px; }
  .demo-answers { grid-template-rows: auto; }
  .demo-answers button { min-height: 65px; font-size: 14px; overflow: visible; }
  .battle-dialogue p { font-size: 18px; }
  .battle-dialogue .battle-explanation { font-size: 14px; }
}
/* Recoil the wrapper so sprite foot-alignment remains intact. */
.player-fighter.is-hit { animation: player-recoil .65s ease-out .22s both; }
.opponent-fighter.is-hit { animation: opponent-recoil .65s ease-out .22s both; }
.arena-fighter.is-hit > img { animation: damage-flash .65s ease-out .22s both; }
@keyframes player-recoil {
  0%,100% { transform: translateX(-50%); }
  20% { transform: translateX(-65%) rotate(-4deg); }
  40% { transform: translateX(-44%) rotate(2deg); }
  60% { transform: translateX(-56%) rotate(-2deg); }
  80% { transform: translateX(-48%); }
}
@keyframes opponent-recoil {
  0%,100% { transform: translateX(-50%); }
  20% { transform: translateX(-35%) rotate(4deg); }
  40% { transform: translateX(-56%) rotate(-2deg); }
  60% { transform: translateX(-44%) rotate(2deg); }
  80% { transform: translateX(-52%); }
}
@keyframes damage-flash {
  0%,100% { opacity: 1; filter: drop-shadow(0 3px 2px #0005); }
  20% { opacity: .65; filter: brightness(.65) sepia(1) saturate(10000%) hue-rotate(320deg) drop-shadow(0 0 8px #ff2020); }
  55% { opacity: .85; filter: brightness(.85) sepia(1) saturate(10000%) hue-rotate(320deg) drop-shadow(0 0 4px #ff2020); }
}
@media(prefers-reduced-motion: reduce) { .arenafighter, .arena-fighter > img { animation: none !important; } }

/* The footer is a separate grid row, never an overlay on the battle. */
.arena-with-preview { position: fixed; inset: 0; display: grid; grid-template-rows: minmax(0, 1fr) auto; background: #101d30; }
.arena-with-preview > .arena-page { position: relative; inset: auto; width: 100%; height: 100%; min-height: 0; container-type: size; }
.arena-with-preview .arena-scene { width: min(100%, calc(100cqh * 1672 / 941)); }
.time-preview-bar { position: relative; min-width: 0; overflow-x: auto; border-top: 2px solid #b99a58; background: #14243a; color: #fff1cf; padding: 10px 14px max(10px, env(safe-area-inset-bottom)); font-family: system-ui, sans-serif; }
.time-bar-inner { display: flex; align-items: center; justify-content: center; gap: 8px; width: max-content; min-width: 100%; }
.time-bar-title { display: flex; align-items: center; gap: 10px; margin-right: 8px; font-size: 12px; white-space: nowrap; }
.time-bar-title span { color: #ffdf85; font-variant-numeric: tabular-nums; }
.time-preview-bar button { min-height: 36px; padding: 7px 11px; border: 1px solid #718096; border-radius: 8px; background: #253951; color: #fff3d6; font: inherit; font-size: 12px; cursor: pointer; white-space: nowrap; }
.time-preview-bar button:hover { background: #3b526d; }
.time-preview-bar button[aria-pressed='true'] { background: #ffdf85; border-color: #ffdf85; color: #233047; }
.time-bar-slider { display: flex; align-items: center; gap: 8px; margin: 0 8px; font-size: 12px; }
.time-bar-slider input { width: clamp(100px, 12vw, 200px); accent-color: #ffdf85; }
.time-bar-status { font-size: 11px; color: #c6d4e7; white-space: nowrap; }
.time-preview-bar button:focus-visible, .time-preview-bar input:focus-visible { outline: 2px solid #ffdf85; outline-offset: 2px; }
@media (max-width: 700px) {
  .arena-with-preview .arena-scene { width: 100%; }
  .time-bar-inner { justify-content: flex-start; }
  .arena-picker { padding-bottom: 24px; }
  .battle-dock { margin-bottom: 24px; }
}

/* Shared Studydex shell: identical font, navigation and clock on both pages. */
.arena-hud { position: fixed; font-family: system-ui, sans-serif; }
.arena-hud .home-link { font-family: inherit; font-size: 13px; font-weight: 700; line-height: 1.4; }
.arena-hud .change-topic { margin-inline: auto; }
.arena-hud .quiz-clock-weather {
  margin-left: auto;
  min-width: 0;
  pointer-events: auto;
}
@media (max-width: 600px) {
  .arena-hud { flex-wrap: wrap; }
  .arena-hud .quiz-clock-weather { max-width: 100%; }
}
.arena-hud button.home-link { border: 1px solid rgb(255 255 255 / 40%); border-radius: 14px; background: rgb(16 30 52 / 80%); padding: 10px 14px; color: white; }
.arena-hud button.home-link:hover { border-color: #ffdc77; color: #ffdc77; background: rgb(16 30 52 / 80%); }
.arena-picker { font-family: system-ui, sans-serif; }
@media(max-width:600px) { .arena-hud button.home-link { padding: 8px 10px; } }


.arena-picker.redesigned-picker { position:fixed; inset:0; padding:0; background:#fff; color:#303557; overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain; }
.arena-with-preview { grid-template-rows:minmax(0,1fr); }
.picker-course { display:flex; align-items:center; gap:12px; color:#684180; font-weight:700; font-size:13px; }
.picker-course select { padding:8px; border:1px solid #b394c7; border-radius:8px; background:#fff; color:#684180; }

</style>
