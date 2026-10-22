<script setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/* ───────────── IMAGE PATHS ───────────── */

const base = import.meta.env.BASE_URL

const ASSETS = {
  forest: `${base}surprise-battle/forest.png`,
  sun: `${base}town/bg_sun.png`,
  moon: `${base}town/bg_moon.png`,
  clouds: `${base}town/bg_clouds.png`,
  stars: `${base}town/bg_stars.png`,
}

/* ───────────── STORAGE ───────────── */

function readStored(storage, key) {
  try {
    return JSON.parse(window[storage].getItem(key))
  } catch {
    return null
  }
}

function writeStored(storage, key, value) {
  try {
    window[storage].setItem(key, JSON.stringify(value))
  } catch {
    // The page can still run when storage is unavailable.
  }
}

const encounter = readStored(
  'sessionStorage',
  'studydex-surprise-encounter',
)

const savedBuddy = readStored(
  'localStorage',
  'studydex-active-buddy',
)

const buddyId =
  Number.isInteger(Number(savedBuddy?.id)) &&
  Number(savedBuddy?.id) > 0
    ? Number(savedBuddy.id)
    : 25

const returnPath =
  typeof encounter?.returnPath === 'string' &&
  encounter.returnPath.startsWith('/') &&
  !encounter.returnPath.startsWith('//') &&
  !encounter.returnPath.startsWith('/surprise-battle')
    ? encounter.returnPath
    : '/home'

/* ───────────── QUESTIONS ───────────── */

// Your study deck can supply questions through the encounter storage.
// Each question supports two to four options.

function validQuestion(question) {
  return (
    typeof question?.prompt === 'string' &&
    question.prompt.trim().length > 0 &&
    Array.isArray(question.options) &&
    question.options.length >= 2 &&
    question.options.length <= 4 &&
    question.options.every(
      (option) => typeof option === 'string' && option.trim(),
    ) &&
    Number.isInteger(question.correctIndex) &&
    question.correctIndex >= 0 &&
    question.correctIndex < question.options.length
  )
}

const suppliedQuestions = Array.isArray(encounter?.questions)
  ? encounter.questions.filter(validQuestion).slice(0, 3)
  : []

const demoMode = suppliedQuestions.length === 0

const questions = demoMode
  ? [
      {
        prompt: 'Which planet is closest to the Sun?',
        options: ['Venus', 'Mercury', 'Earth', 'Mars'],
        correctIndex: 1,
        explanation: 'Mercury is the closest planet to the Sun.',
      },
      {
        prompt: 'Which gas do plants absorb during photosynthesis?',
        options: [
          'Oxygen',
          'Carbon dioxide',
          'Hydrogen',
          'Helium',
        ],
        correctIndex: 1,
        explanation:
          'Plants use carbon dioxide, water, and sunlight to make sugars.',
      },
    ]
  : suppliedQuestions

const questionIndex = ref(0)
const selectedAnswer = ref(null)
const answered = ref(false)
const score = ref(0)
const finished = ref(false)
const questionHeading = ref(null)

const question = computed(() => questions[questionIndex.value])

const answerIsCorrect = computed(
  () => selectedAnswer.value === question.value.correctIndex,
)

const answerColors = ['red', 'yellow', 'green', 'blue']
const answerLetters = ['A', 'B', 'C', 'D']

function chooseAnswer(index) {
  if (answered.value || finished.value) return

  selectedAnswer.value = index
  answered.value = true

  if (index === question.value.correctIndex) {
    score.value++
  }
}

function answerClasses(index) {
  return [
    `answer-${answerColors[index]}`,
    {
      'is-correct':
        answered.value && index === question.value.correctIndex,
      'is-wrong':
        answered.value &&
        index === selectedAnswer.value &&
        index !== question.value.correctIndex,
      'is-muted':
        answered.value &&
        index !== selectedAnswer.value &&
        index !== question.value.correctIndex,
    },
  ]
}

async function nextQuestion() {
  if (!answered.value) return

  if (questionIndex.value === questions.length - 1) {
    finished.value = true
  } else {
    questionIndex.value++
    selectedAnswer.value = null
    answered.value = false
  }

  await nextTick()
  questionHeading.value?.focus({ preventScroll: true })
}

function returnToDeck() {
  if (!demoMode && finished.value) {
    writeStored('sessionStorage', 'studydex-surprise-result', {
      encounterId: encounter?.id,
      score: score.value,
      total: questions.length,
      completedAt: new Date().toISOString(),
    })

    try {
      sessionStorage.removeItem('studydex-surprise-encounter')
    } catch {
      // Navigation remains available.
    }
  }

  router.push(returnPath)
}

/* ───────────── POKÉMON ───────────── */

const forestPokemon = [
  10, 13, 16, 19, 25, 43, 46, 48, 69, 102, 123, 133,
].filter((id) => id !== buddyId)

const wildId =
  forestPokemon[Math.floor(Math.random() * forestPokemon.length)]

const buddy = ref(null)
const wild = ref(null)
const pokemonLoading = ref(true)
const pokemonError = ref('')

const reducedMotion = ref(false)

const buddyUseStatic = ref(false)
const wildUseStatic = ref(false)

const buddyImageFailed = ref(false)
const wildImageFailed = ref(false)

const buddyBottomPadding = ref(0)
const wildBottomPadding = ref(0)

let pokemonController
let motionQuery

const buddyName = computed(
  () => savedBuddy?.name || buddy.value?.name || 'Your buddy',
)

const wildName = computed(() => wild.value?.name || 'Wild Pokémon')

function animatedSprites(pokemon) {
  return pokemon?.sprites?.versions?.['generation-v']?.[
    'black-white'
  ]?.animated
}

const buddySprite = computed(() => {
  if (reducedMotion.value || buddyUseStatic.value) {
    return buddy.value?.sprites?.back_default
  }

  return (
    animatedSprites(buddy.value)?.back_default ||
    buddy.value?.sprites?.back_default
  )
})

const wildSprite = computed(() => {
  if (reducedMotion.value || wildUseStatic.value) {
    return wild.value?.sprites?.front_default
  }

  return (
    animatedSprites(wild.value)?.front_default ||
    wild.value?.sprites?.front_default
  )
})

async function getPokemon(id, signal) {
  const cacheKey = `studydex-pokemon-${id}`
  const cached = readStored('sessionStorage', cacheKey)

  if (cached?.id === id && cached?.sprites) {
    return cached
  }

  const response = await fetch(
    `https://pokeapi.co/api/v2/pokemon/${id}/`,
    { signal },
  )

  if (!response.ok) {
    throw new Error('Unable to load Pokémon.')
  }

  const data = await response.json()
  writeStored('sessionStorage', cacheKey, data)

  return data
}

async function loadPokemon() {
  pokemonController?.abort()

  const controller = new AbortController()
  pokemonController = controller

  pokemonLoading.value = true
  pokemonError.value = ''
  buddyImageFailed.value = false
  wildImageFailed.value = false
  buddyUseStatic.value = false
  wildUseStatic.value = false
  buddyBottomPadding.value = 0
  wildBottomPadding.value = 0

  try {
    const [buddyData, wildData] = await Promise.all([
      getPokemon(buddyId, controller.signal),
      getPokemon(wildId, controller.signal),
    ])

    if (controller.signal.aborted) return

    buddy.value = buddyData
    wild.value = wildData
  } catch (error) {
    if (error.name !== 'AbortError') {
      pokemonError.value =
        'Pokémon could not load. Check your connection and try again.'
    }
  } finally {
    if (pokemonController === controller) {
      pokemonLoading.value = false
    }
  }
}

function handleSpriteError(isBuddy) {
  const pokemon = isBuddy ? buddy.value : wild.value
  const staticSprite = isBuddy
    ? pokemon?.sprites?.back_default
    : pokemon?.sprites?.front_default

  const currentSprite = isBuddy
    ? buddySprite.value
    : wildSprite.value

  if (staticSprite && currentSprite !== staticSprite) {
    if (isBuddy) {
      buddyUseStatic.value = true
      buddyBottomPadding.value = 0
    } else {
      wildUseStatic.value = true
      wildBottomPadding.value = 0
    }
  } else if (isBuddy) {
    buddyImageFailed.value = true
  } else {
    wildImageFailed.value = true
  }
}

// Removes the apparent gap caused by transparent pixels below a sprite.
// The Pokémon stays on its grass patch instead of bobbing vertically.

function groundSprite(event, isBuddy) {
  const image = event.target
  let padding = 0

  try {
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    const context = canvas.getContext('2d', {
      willReadFrequently: true,
    })

    if (!context || !canvas.width || !canvas.height) return

    context.drawImage(image, 0, 0)

    const { data } = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    )

    let bottomRow = canvas.height - 1

    findBottom: for (let y = canvas.height - 1; y >= 0; y--) {
      for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] > 32) {
          bottomRow = y
          break findBottom
        }
      }
    }

    padding = (canvas.height - 1 - bottomRow) / canvas.height
  } catch {
    padding = 0
  }

  if (isBuddy) {
    buddyBottomPadding.value = padding
  } else {
    wildBottomPadding.value = padding
  }
}

function updateMotionPreference(event) {
  reducedMotion.value = event.matches
}

/* ───────────── DAY / NIGHT ───────────── */

const now = ref(new Date())
const previewHour = ref(null)
const showPreview = import.meta.env.DEV

let clockInterval

const hour = computed(() => {
  if (previewHour.value !== null) return previewHour.value

  return (
    now.value.getHours() +
    now.value.getMinutes() / 60 +
    now.value.getSeconds() / 3600
  )
})

const timeFrames = [
  [0, '#03091c', '#142744', 0.5, 0.8, 0.3, 1],
  [5.5, '#081229', '#354564', 0.38, 0.7, 0.38, 0.8],
  [8, '#258be0', '#c7eeff', 1, 1.06, 1, 0],
  [12, '#1685df', '#c4efff', 1.04, 1.1, 1, 0],
  [15.5, '#579bd5', '#ffe0ad', 1.02, 1.08, 0.95, 0],
  [18.5, '#67518e', '#ffad7b', 0.82, 1.05, 0.78, 0.03],
  [19.25, '#30345f', '#a77b9d', 0.58, 0.85, 0.58, 0.35],
  [20.5, '#101f43', '#405477', 0.43, 0.75, 0.4, 0.75],
  [22, '#03091c', '#142744', 0.5, 0.8, 0.3, 1],
  [24, '#03091c', '#142744', 0.5, 0.8, 0.3, 1],
]

function lerp(start, end, progress) {
  return start + (end - start) * progress
}

function mixColor(start, end, progress) {
  const channels = [1, 3, 5].map((index) =>
    Math.round(
      lerp(
        parseInt(start.slice(index, index + 2), 16),
        parseInt(end.slice(index, index + 2), 16),
        progress,
      ),
    ),
  )

  return `rgb(${channels.join(', ')})`
}

const atmosphere = computed(() => {
  const h = hour.value

  const index = timeFrames.findIndex(
    (frame, i) =>
      i < timeFrames.length - 1 &&
      h >= frame[0] &&
      h < timeFrames[i + 1][0],
  )

  const start = timeFrames[Math.max(0, index)]
  const end = timeFrames[Math.max(0, index) + 1]

  const progress = Math.max(
    0,
    Math.min(1, (h - start[0]) / (end[0] - start[0])),
  )

  const smooth = progress * progress * (3 - 2 * progress)

  return {
    top: mixColor(start[1], end[1], smooth),
    horizon: mixColor(start[2], end[2], smooth),
    brightness: lerp(start[3], end[3], smooth),
    saturation: lerp(start[4], end[4], smooth),
    clouds: lerp(start[5], end[5], smooth),
    stars: lerp(start[6], end[6], smooth),
  }
})

const skyStyle = computed(() => ({
  background: `linear-gradient(
    to bottom,
    ${atmosphere.value.top} 0%,
    ${atmosphere.value.horizon} 65%,
    ${atmosphere.value.horizon} 100%
  )`,
}))

const forestStyle = computed(() => ({
  filter: `brightness(${atmosphere.value.brightness})
    saturate(${atmosphere.value.saturation})`,
}))

const pokemonStyle = computed(() => ({
  filter: `brightness(${Math.max(
    0.75,
    atmosphere.value.brightness,
  )})`,
}))

function celestialStyle(isMoon) {
  const progress = isMoon
    ? ((hour.value - 19 + 24) % 24) / 11
    : (hour.value - 6) / 13

  const p = Math.max(0, Math.min(1, progress))
  const visible = progress > 0 && progress < 1

  return {
    left: `${12 + p * 76}%`,
    top: `${25 - Math.sin(p * Math.PI) * 19}%`,
    opacity: visible ? Math.min(1, p * 10, (1 - p) * 10) : 0,
  }
}

function refreshClock() {
  now.value = new Date()
}

/* ───────────── LIFECYCLE ───────────── */

onMounted(() => {
  loadPokemon()

  motionQuery = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  )

  reducedMotion.value = motionQuery.matches
  motionQuery.addEventListener('change', updateMotionPreference)

  clockInterval = window.setInterval(refreshClock, 1000)
  document.addEventListener('visibilitychange', refreshClock)
})

onUnmounted(() => {
  pokemonController?.abort()
  window.clearInterval(clockInterval)

  motionQuery?.removeEventListener(
    'change',
    updateMotionPreference,
  )

  document.removeEventListener('visibilitychange', refreshClock)
})
</script>

<template>
  <main class="battle-page" :style="skyStyle">
    <div class="battle-scene">
      <!-- Sky behind the transparent forest -->
      <div class="layer sky" :style="skyStyle"></div>

      <!-- Sun and moon behind clouds and stars -->
      <img
        class="celestial sun"
        :src="ASSETS.sun"
        :style="celestialStyle(false)"
        alt=""
        aria-hidden="true"
      />

      <img
        class="celestial moon"
        :src="ASSETS.moon"
        :style="celestialStyle(true)"
        alt=""
        aria-hidden="true"
      />

      <img
        class="layer stars"
        :src="ASSETS.stars"
        :style="{ opacity: atmosphere.stars }"
        alt=""
        aria-hidden="true"
      />

      <div
        class="layer cloud-layer"
        :style="{ opacity: atmosphere.clouds }"
      >
        <img :src="ASSETS.clouds" alt="" aria-hidden="true" />
      </div>

      <img
        class="layer forest"
        :src="ASSETS.forest"
        :style="forestStyle"
        alt=""
        aria-hidden="true"
      />

      <!-- Wild Pokémon: far grass patch -->
      <div class="pokemon wild-pokemon" :style="pokemonStyle">
        <div class="ground-shadow"></div>

        <img
          v-if="wildSprite && !wildImageFailed"
          :key="wildSprite"
          class="pokemon-image"
          :src="wildSprite"
          :alt="wildName"
          crossorigin="anonymous"
          :style="{
            transform: `translateY(${wildBottomPadding * 100}%)`,
          }"
          @load="groundSprite($event, false)"
          @error="handleSpriteError(false)"
        />

        <span v-else class="pokemon-placeholder">
          {{ pokemonLoading ? 'Loading…' : 'Sprite unavailable' }}
        </span>

        <span class="pokemon-name">{{ wildName }}</span>
      </div>

      <!-- Active buddy: near grass patch, rear view -->
      <div class="pokemon buddy-pokemon" :style="pokemonStyle">
        <div class="ground-shadow"></div>

        <img
          v-if="buddySprite && !buddyImageFailed"
          :key="buddySprite"
          class="pokemon-image"
          :src="buddySprite"
          :alt="`${buddyName}, rear view`"
          crossorigin="anonymous"
          :style="{
            transform: `translateY(${buddyBottomPadding * 100}%)`,
          }"
          @load="groundSprite($event, true)"
          @error="handleSpriteError(true)"
        />

        <span v-else class="pokemon-placeholder">
          {{ pokemonLoading ? 'Loading…' : 'Rear sprite unavailable' }}
        </span>

        <span class="pokemon-name">{{ buddyName }}</span>
      </div>

      <!-- Only the question appears on the wooden board -->
      <section
        class="board-question"
        aria-labelledby="question-title"
      >
        <h1
          id="question-title"
          ref="questionHeading"
          tabindex="-1"
        >
          {{ finished ? 'Encounter complete!' : question.prompt }}
        </h1>
      </section>

      <!-- Four coloured answer buttons -->
      <section
        class="battle-controls"
        aria-label="Battle answers"
      >
        <template v-if="!finished">
          <header class="controls-header">
            <span>
              {{ demoMode ? 'PRACTICE ENCOUNTER' : 'CHOOSE YOUR ANSWER' }}
            </span>

            <span class="question-count">
              {{ questionIndex + 1 }} / {{ questions.length }}
            </span>
          </header>

          <div
            class="answer-grid"
            role="group"
            aria-labelledby="question-title"
          >
            <button
              v-for="(option, index) in question.options"
              :key="`${questionIndex}-${index}`"
              type="button"
              class="answer-button"
              :class="answerClasses(index)"
              :disabled="answered"
              @click="chooseAnswer(index)"
            >
              <span class="answer-letter">
                {{ answerLetters[index] }}
              </span>

              <span class="answer-text">{{ option }}</span>

              <span
                v-if="answered && index === question.correctIndex"
                class="answer-result"
                aria-label="Correct answer"
              >
                ✓
              </span>

              <span
                v-else-if="answered && index === selectedAnswer"
                class="answer-result"
                aria-label="Incorrect answer"
              >
                ✕
              </span>
            </button>
          </div>

          <div class="feedback-region" aria-live="polite">
            <div v-if="answered" class="feedback">
              <p>
                <strong>
                  {{ answerIsCorrect ? 'Correct!' : 'Keep learning!' }}
                </strong>

                {{
                  question.explanation ||
                  `The correct answer is ${
                    question.options[question.correctIndex]
                  }.`
                }}
              </p>

              <button
                type="button"
                class="primary-button"
                @click="nextQuestion"
              >
                {{
                  questionIndex === questions.length - 1
                    ? 'Finish encounter'
                    : 'Next question'
                }}
                →
              </button>
            </div>
          </div>
        </template>

        <div v-else class="completion">
          <span class="completion-eyebrow">WELL DONE, TRAINER</span>

          <p class="completion-score">
            {{ score }} / {{ questions.length }}
          </p>

          <p>You have completed this encounter.</p>

          <button
            type="button"
            class="primary-button"
            @click="returnToDeck"
          >
            Continue studying →
          </button>
        </div>
      </section>
    </div>



    <div v-if="pokemonError" class="error-notice" role="alert">
      <span>{{ pokemonError }}</span>

      <button type="button" @click="loadPokemon">Retry</button>
    </div>

    <!-- Development only: removed automatically in production -->
    <nav
      v-if="showPreview"
      class="time-preview"
      aria-label="Preview time of day"
    >
      <button
        type="button"
        :aria-pressed="previewHour === null"
        @click="previewHour = null"
      >
        Live
      </button>

      <button
        type="button"
        :aria-pressed="previewHour === 12"
        @click="previewHour = 12"
      >
        Day
      </button>

      <button
        type="button"
        :aria-pressed="previewHour === 18.5"
        @click="previewHour = 18.5"
      >
        Sunset
      </button>

      <button
        type="button"
        :aria-pressed="previewHour === 22"
        @click="previewHour = 22"
      >
        Night
      </button>
    </nav>
  </main>
</template>

<style scoped>
.battle-page {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #fff9e7;
  font-family: 'Trebuchet MS', system-ui, sans-serif;
}

.battle-page *,
.battle-page *::before,
.battle-page *::after {
  box-sizing: border-box;
}

button {
  font: inherit;
  cursor: pointer;
}

button:focus-visible {
  outline: 3px solid #ffe27a;
  outline-offset: 4px;
}

.battle-scene {
  position: relative;
  width: min(100vw, calc(100dvh * 1672 / 941));
  aspect-ratio: 1672 / 941;
  isolation: isolate;
  container-type: inline-size;

  /* Adjust these percentages if your forest image changes. */
  --board-left: 13%;
  --board-top: 11.5%;
  --board-width: 37%;
  --board-height: 22.5%;
  --buddy-left: 28%;
  --buddy-ground: 75%;
  --wild-left: 76%;
  --wild-ground: 60%;
}

/* ───────────── BACKGROUND LAYERS ───────────── */

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

.sky {
  z-index: 0;
}

.celestial {
  position: absolute;
  z-index: 1;
  width: 10%;
  height: auto;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.moon {
  width: 7%;
}

.stars {
  z-index: 2;
}

.cloud-layer {
  z-index: 3;
  overflow: hidden;
}

.cloud-layer img {
  position: absolute;
  inset: 0 auto 0 -5%;
  width: 110%;
  height: 100%;
  object-fit: fill;
  animation: cloud-drift 80s ease-in-out infinite alternate;
}

.forest {
  z-index: 4;
}

@keyframes cloud-drift {
  from {
    transform: translateX(-2%);
  }

  to {
    transform: translateX(2%);
  }
}

/* ───────────── POKÉMON ───────────── */

.pokemon {
  position: absolute;
  z-index: 5;
  height: 0;
  transform: translateX(-50%);
}

.wild-pokemon {
  left: var(--wild-left);
  top: var(--wild-ground);
  width: 12%;
}

.buddy-pokemon {
  left: var(--buddy-left);
  top: var(--buddy-ground);
  width: 18%;
}

.pokemon-image {
  position: absolute;
  z-index: 1;
  left: 0;
  bottom: 0;
  display: block;
  width: 100%;
  height: auto;
  max-width: none;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 1px rgb(0 0 0 / 20%));
}

.ground-shadow {
  position: absolute;
  left: 25%;
  top: -0.35cqw;
  width: 50%;
  height: 0.8cqw;
  min-height: 5px;
  border-radius: 50%;
  background: rgb(12 34 15 / 48%);
  filter: blur(3px);
}

.pokemon-name {
  position: absolute;
  top: 1cqw;
  left: 50%;
  transform: translateX(-50%);
  padding: 5px 12px;
  border: 1px solid rgb(255 255 255 / 35%);
  border-radius: 999px;
  background: rgb(15 42 29 / 85%);
  color: #fff9e7;
  font-size: clamp(10px, 0.9cqw, 14px);
  font-weight: 700;
  text-transform: capitalize;
  white-space: nowrap;
}

.pokemon-placeholder {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: #fff2cf;
  color: #24452e;
  font-size: 12px;
  text-align: center;
}

/* ───────────── QUESTION ON BOARD ───────────── */

.board-question {
  position: absolute;
  z-index: 8;
  left: var(--board-left);
  top: var(--board-top);
  width: var(--board-width);
  height: var(--board-height);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.2cqw;
  overflow: auto;
  text-align: center;
  scrollbar-width: thin;
  scrollbar-color: #dcb969 transparent;
}

.board-question h1 {
  max-width: 100%;
  margin: auto 0;
  color: #fff9e7;
  font-size: clamp(17px, 1.85cqw, 32px);
  font-weight: 800;
  line-height: 1.35;
  overflow-wrap: anywhere;
  text-shadow: 0 2px 3px rgb(0 0 0 / 45%);
}

.board-question h1:focus {
  outline: none;
}

/* ───────────── ANSWER CONTROLS ───────────── */

.battle-controls {
  position: absolute;
  z-index: 9;
  right: 3%;
  bottom: 3%;
  width: 43%;
  max-height: 35%;
  padding: 12px;
  overflow-y: auto;
  border: 3px solid #d9bb72;
  border-radius: 20px;
  background: linear-gradient(145deg, #243e35, #10271f);
  box-shadow:
    0 7px 0 rgb(11 28 20 / 65%),
    0 12px 28px rgb(0 0 0 / 25%),
    inset 0 1px 0 rgb(255 255 255 / 12%);
  scrollbar-width: thin;
  scrollbar-color: #d9bb72 #142b22;
}

.controls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: #f7e7b9;
  font-size: clamp(10px, 0.8cqw, 13px);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.question-count {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgb(255 255 255 / 10%);
  letter-spacing: normal;
}

.answer-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.answer-button {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 60px;
  padding: 10px 12px;
  border: 2px solid rgb(255 255 255 / 35%);
  border-radius: 13px;
  background: linear-gradient(var(--button-top), var(--button-bottom));
  color: var(--button-text, #fff);
  box-shadow:
    0 4px 0 var(--button-shadow),
    inset 0 1px 0 rgb(255 255 255 / 25%);
  text-align: left;
  transition:
    transform 140ms ease,
    filter 140ms ease,
    opacity 140ms ease;
}

.answer-red {
  --button-top: #d65364;
  --button-bottom: #a9243e;
  --button-shadow: #68182a;
}

.answer-yellow {
  --button-top: #ffe18a;
  --button-bottom: #e6ad37;
  --button-shadow: #90641c;
  --button-text: #382905;
}

.answer-green {
  --button-top: #42864f;
  --button-bottom: #256336;
  --button-shadow: #153c24;
}

.answer-blue {
  --button-top: #367fac;
  --button-bottom: #215680;
  --button-shadow: #14364f;
}

.answer-button:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.12);
}

.answer-button:active:not(:disabled) {
  transform: translateY(2px);
}

.answer-button:disabled {
  cursor: default;
}

.answer-letter {
  display: grid;
  flex: 0 0 28px;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid currentColor;
  border-radius: 8px;
  background: rgb(0 0 0 / 10%);
  font-size: 13px;
  font-weight: 900;
}

.answer-text {
  flex: 1;
  min-width: 0;
  font-size: clamp(12px, 1cqw, 17px);
  font-weight: 800;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.answer-result {
  flex-shrink: 0;
  font-size: 20px;
  font-weight: 900;
}

.answer-button.is-correct {
  outline: 3px solid #ffe67c;
  outline-offset: 1px;
}

.answer-button.is-wrong {
  border-style: dashed;
}

.answer-button.is-muted {
  opacity: 0.5;
}

.feedback {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgb(255 255 255 / 18%);
}

.feedback p {
  margin: 0 0 10px;
  font-size: clamp(12px, 0.9cqw, 15px);
  line-height: 1.5;
}

.feedback strong {
  color: #ffe28a;
}

.primary-button {
  min-height: 42px;
  padding: 9px 14px;
  border: 2px solid #b8872b;
  border-radius: 10px;
  background: #ffdc78;
  color: #44340f;
  font-size: clamp(12px, 0.9cqw, 15px);
  font-weight: 800;
}

.primary-button:hover {
  background: #ffe9a5;
}

.completion {
  padding: 8px;
  text-align: center;
}

.completion-eyebrow {
  color: #f7df9a;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.completion-score {
  margin: 8px 0;
  color: #ffe28a;
  font-size: clamp(28px, 3cqw, 48px);
  font-weight: 900;
}

.completion > p:not(.completion-score) {
  margin: 0 0 14px;
  font-size: 14px;
}

/* ───────────── NAVIGATION / STATUS ───────────── */


.error-notice {
  position: absolute;
  z-index: 11;
  left: 16px;
  bottom: 70px;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(420px, calc(100% - 32px));
  padding: 12px 14px;
  border-radius: 12px;
  background: #fff2cf;
  color: #25472f;
  font-size: 13px;
}

.error-notice button {
  min-height: 36px;
  padding: 6px 10px;
  border: 1px solid #25472f;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font-weight: 800;
}

.time-preview {
  position: fixed;
  z-index: 12;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 4px;
  padding: 5px;
  border: 1px solid #bda668;
  border-radius: 10px;
  background: #173629;
}

.time-preview button {
  min-height: 34px;
  padding: 5px 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #fff3cf;
  font-size: 12px;
  font-weight: 700;
}

.time-preview button[aria-pressed='true'] {
  background: #ffdc78;
  color: #44340f;
}

/* ───────────── SMALL SCREENS ───────────── */

/*
  On phones, the question and answers move below the forest
  so they stay readable and do not cover the Pokémon.
*/

@media (max-width: 700px) {
  .battle-page {
    display: block;
    overflow-y: auto;
  }

  .battle-scene {
    display: flow-root;
    width: 100%;
    margin-top: 66px;
    margin-bottom: 80px;
    aspect-ratio: auto;
  }

  .battle-scene > .layer {
    height: calc(100vw * 941 / 1672);
  }

  .celestial {
    display: none;
  }

  .wild-pokemon {
    top: calc(100vw * 941 / 1672 * 0.60);
    width: 14%;
  }

  .buddy-pokemon {
    top: calc(100vw * 941 / 1672 * 0.75);
    width: 20%;
  }

  .pokemon-name {
    padding: 4px 8px;
    font-size: 10px;
  }

  .board-question {
    position: relative;
    top: auto;
    left: auto;
    width: calc(100% - 24px);
    height: auto;
    min-height: 100px;
    margin: calc(100vw * 941 / 1672 + 16px) 12px 0;
    padding: 20px;
    overflow: visible;
    border: 3px solid #d9bb72;
    border-radius: 16px;
    background: #172e3c;
  }

  .board-question h1 {
    font-size: 21px;
  }

  .battle-controls {
    position: relative;
    right: auto;
    bottom: auto;
    width: calc(100% - 24px);
    max-height: none;
    margin: 12px;
    padding: 12px;
    overflow: visible;
  }

  .controls-header {
    font-size: 11px;
  }

  .answer-button {
    min-height: 70px;
    gap: 7px;
    padding: 10px 8px;
  }

  .answer-letter {
    flex-basis: 24px;
    width: 24px;
    height: 24px;
    font-size: 11px;
  }

  .answer-text {
    font-size: 14px;
  }

  .feedback p,
  .primary-button {
    font-size: 14px;
  }

  .error-notice {
    position: relative;
    left: auto;
    bottom: auto;
    margin: 12px 12px 80px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cloud-layer img {
    animation: none;
  }

  .answer-button {
    transition: none;
  }
}
</style>