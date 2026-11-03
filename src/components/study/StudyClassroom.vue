<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useTimeOfDay } from '../../composables/useTimeOfDay'
let alive = true
onUnmounted(() => {
  alive = false
})
const POKE_API_BASE = 'https://pokeapi.co/api/v2'
const rainActive = ref(false)
const { hour: learnHour, lighting: learnLighting } = useTimeOfDay({
  live: ref(true),
  previewHour: ref(12),
})
const learnBase = import.meta.env.BASE_URL
const learnImages = {
  room: `${learnBase}poke-lab/learn-classroom.png`,
  landscape: `${learnBase}trainer-home/window-landscape-clean.png`,
  sun: `${learnBase}town/bg_sun.png`,
  moon: `${learnBase}town/bg_moon.png`,
  stars: `${learnBase}town/bg_stars.png`,
  clouds: `${learnBase}town/bg_clouds.png`,
}
const learnRoomFailed = ref(false)
const learnSkyStyle = computed(() => ({
  background: `linear-gradient(to bottom, ${learnLighting.value.top} 0%, ${learnLighting.value.horizon} 30%)`,
}))
const learnLandscapeStyle = computed(() => ({
  filter: `brightness(${learnLighting.value.brightness}) saturate(${learnLighting.value.saturation})`,
}))
const learnRoomStyle = computed(() => ({
  filter: `brightness(${Math.max(0.78, learnLighting.value.brightness)}) saturate(${Math.max(0.9, learnLighting.value.saturation)})`,
}))
function learnCelestialStyle(isMoon) {
  const h = learnHour.value
  const progress = isMoon ? ((h - 19 + 24) % 24) / 11 : (h - 6) / 13
  const p = Math.max(0, Math.min(1, progress))
  return {
    left: `${12 + p * 76}%`,
    top: `${25 - Math.sin(p * Math.PI) * 19}%`,
    opacity:
      progress > 0 && progress < 1 && !rainActive.value ? Math.min(1, p * 10, (1 - p) * 10) : 0,
  }
}
function hideDecorativeImage(event) {
  event.target.style.visibility = 'hidden'
}
// Use the existing external professor artwork.
const professorSprite = `${import.meta.env.BASE_URL}poke-lab/professor-mewtwo.png`
const professorFailed = ref(false)
const learnerFailed = ref(false)
const classroomSnorlax = ref(null)
const stoolHome = { x: 11, y: 87 }
const stoolPosition = reactive({ ...stoolHome })
const stoolCanvas = ref(null)
const stoolImage = new Image()
stoolImage.src = `${import.meta.env.BASE_URL}poke-lab/pixel-stool.png`
function paintStool() {
  const canvas = stoolCanvas.value
  if (!canvas || !stoolImage.complete || !stoolImage.naturalWidth) return
  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingEnabled = false
  context.drawImage(stoolImage, 0, 0, canvas.width, canvas.height)
}
stoolImage.onload = paintStool
watch(stoolCanvas, paintStool, { flush: 'post' })
onUnmounted(() => {
  stoolImage.onload = null
})
const stoolFloor = ref(null)
const stoolDragging = ref(false)
let stoolPointer = null
let stoolGrabOffset = { x: 0, y: 0 }
const stoolMoved = computed(
  () => Math.hypot(stoolPosition.x - stoolHome.x, stoolPosition.y - stoolHome.y) > 4,
)
const learnerSprite = computed(() => {
  const sprites = classroomSnorlax.value?.sprites
  const gen5 = sprites?.versions?.['generation-v']?.['black-white']
  return stoolMoved.value
    ? gen5?.front_default || sprites?.front_default || ''
    : gen5?.back_default || sprites?.back_default || ''
})

const buddyCanvas = ref(null)
let buddyPaintVersion = 0
// Crop invisible sprite padding so the visible feet rest on the seat.
watch(
  [learnerSprite, buddyCanvas],
  async ([url, canvas]) => {
    const version = ++buddyPaintVersion
    if (!url || !canvas) return
    const sprite = new Image()
    sprite.crossOrigin = 'anonymous'
    try {
      sprite.src = url
      await sprite.decode()
      if (version !== buddyPaintVersion) return
      const scratch = document.createElement('canvas')
      scratch.width = sprite.naturalWidth
      scratch.height = sprite.naturalHeight
      const ctx = scratch.getContext('2d')
      ctx.drawImage(sprite, 0, 0)
      let left = scratch.width,
        top = scratch.height,
        right = -1,
        bottom = -1
      try {
        const pixels = ctx.getImageData(0, 0, scratch.width, scratch.height).data
        for (let y = 0; y < scratch.height; y++)
          for (let x = 0; x < scratch.width; x++) {
            if (pixels[(y * scratch.width + x) * 4 + 3] > 16) {
              left = Math.min(left, x)
              top = Math.min(top, y)
              right = Math.max(right, x)
              bottom = Math.max(bottom, y)
            }
          }
      } catch {
        left = 0
        top = 0
        right = scratch.width - 1
        bottom = scratch.height - 1
      }
      if (right < left) return
      canvas.width = right - left + 1
      canvas.height = bottom - top + 1
      const output = canvas.getContext('2d')
      output.imageSmoothingEnabled = false
      output.drawImage(
        sprite,
        left,
        top,
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height,
      )
      learnerFailed.value = false
    } catch {
      if (version === buddyPaintVersion) learnerFailed.value = true
    }
  },
  { flush: 'post' },
)
onUnmounted(() => {
  buddyPaintVersion++
})
const stoolStyle = computed(() => ({ left: `${stoolPosition.x}%`, top: `${stoolPosition.y}%` }))
function floorPoint(event) {
  const rect = stoolFloor.value?.getBoundingClientRect()
  if (!rect?.width || !rect?.height) return null
  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
  }
}
function moveStool(x, y) {
  stoolPosition.x = Math.max(6, Math.min(94, x))
  stoolPosition.y = Math.max(68, Math.min(90, y))
}
function grabStool(event) {
  if (event.button !== 0 || stoolPointer !== null) return
  const point = floorPoint(event)
  if (!point) return
  stoolPointer = event.pointerId
  stoolGrabOffset = { x: point.x - stoolPosition.x, y: point.y - stoolPosition.y }
  event.currentTarget.setPointerCapture(event.pointerId)
  stoolDragging.value = true
}
function dragStool(event) {
  if (event.pointerId !== stoolPointer) return
  const point = floorPoint(event)
  if (point) moveStool(point.x - stoolGrabOffset.x, point.y - stoolGrabOffset.y)
}
function releaseStool(event) {
  if (event.pointerId !== stoolPointer) return
  stoolPointer = null
  stoolDragging.value = false
  if (event.currentTarget.hasPointerCapture(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId)
  if (!stoolMoved.value) Object.assign(stoolPosition, stoolHome)
}
function returnStool() {
  Object.assign(stoolPosition, stoolHome)
}
function stoolKey(event) {
  const offsets = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }
  if (event.key === 'Home' || event.key === 'Escape') {
    event.preventDefault()
    returnStool()
    return
  }
  const offset = offsets[event.key]
  if (offset) {
    event.preventDefault()
    moveStool(stoolPosition.x + offset[0], stoolPosition.y + offset[1])
  }
}

const controller = new AbortController()
onUnmounted(() => controller.abort())
onMounted(async () => {
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(`${POKE_API_BASE}/pokemon/143/`, { signal: controller.signal })
    if (!response.ok) throw new Error('Snorlax unavailable')
    const data = await response.json()
    if (alive) classroomSnorlax.value = data
  } catch {
    if (alive) learnerFailed.value = true
  } finally {
    clearTimeout(timeout)
  }
})
</script>
<template>
  <section class="inline-classroom" aria-label="Learn with Mewtwo">
    <div class="inline-learn-scene">
      <div class="inline-learn-sky" :style="learnSkyStyle" aria-hidden="true">
        <img
          draggable="false"
          class="learn-celestial"
          :src="learnImages.sun"
          :style="learnCelestialStyle(false)"
          alt=""
          @error="hideDecorativeImage"
        />
        <img
          draggable="false"
          class="learn-celestial learn-moon"
          :src="learnImages.moon"
          :style="learnCelestialStyle(true)"
          alt=""
          @error="hideDecorativeImage"
        />
        <img
          draggable="false"
          class="learn-sky-layer"
          :src="learnImages.stars"
          :style="{ opacity: rainActive ? 0 : learnLighting.stars }"
          alt=""
          @error="hideDecorativeImage"
        />
        <img
          draggable="false"
          class="learn-sky-layer learn-clouds"
          :src="learnImages.clouds"
          :style="{
            opacity: learnLighting.cloud,
            filter: `brightness(${learnLighting.brightness})`,
          }"
          alt=""
          @error="hideDecorativeImage"
        />
        <img
          draggable="false"
          class="learn-landscape"
          :src="learnImages.landscape"
          :style="learnLandscapeStyle"
          alt=""
          @error="hideDecorativeImage"
        />
      </div>
      <img
        draggable="false"
        v-if="!learnRoomFailed"
        class="inline-learn-room"
        :src="learnImages.room"
        :style="learnRoomStyle"
        alt=""
        @error="learnRoomFailed = true"
      />
      <img
        draggable="false"
        v-if="professorSprite && !professorFailed"
        class="inline-professor"
        :src="professorSprite"
        alt="Mewtwo teaching beside the whiteboard"
        @error="professorFailed = true"
      />
      <div ref="stoolFloor" class="classroom-play-floor">
        <canvas
          v-show="learnerSprite && !learnerFailed"
          ref="buddyCanvas"
          class="stool-buddy"
          :class="{ 'is-protesting': stoolMoved }"
          role="img"
          :aria-label="
            stoolMoved
              ? 'Snorlax asking for his stool back'
              : 'Snorlax resting on the stool, facing the whiteboard'
          "
        ></canvas>
        <button
          class="pixel-stool"
          :class="{ 'is-dragging': stoolDragging }"
          :style="stoolStyle"
          type="button"
          aria-label="Move Snorlax’s stool. Drag, or use arrow keys. Press Home to return it."
          @pointerdown="grabStool"
          @pointermove="dragStool"
          @pointerup="releaseStool"
          @pointercancel="releaseStool"
          @lostpointercapture="releaseStool"
          @keydown="stoolKey"
          @dblclick="returnStool"
        >
          <canvas ref="stoolCanvas" width="440" height="530" aria-hidden="true"></canvas>
        </button>
        <div v-if="stoolMoved" class="stool-speech" role="status" aria-live="polite">
          <span class="stool-speaker">SNORLAX</span>
          <strong>Hey, focus! Give me back my stool!!!</strong>
          <button type="button" @click="returnStool">Give it back</button>
        </div>
      </div>
      <article class="inline-whiteboard" tabindex="0" aria-label="Lesson content">
        <p v-if="learnRoomFailed" role="status">
          Classroom image unavailable. Your lesson is still available.
        </p>
        <slot />
      </article>
    </div>
  </section>
</template>
<style scoped>
.inline-classroom {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #12233b;
}
.inline-learn-scene {
  position: relative;
  width: 100%;
  height: 100%;
  container-type: inline-size;
  isolation: isolate;
}
.inline-learn-sky {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}
.learn-celestial {
  position: absolute;
  width: 10%;
  transform: translate(-50%, -50%);
}
.learn-moon {
  width: 7%;
}
.learn-sky-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.learn-clouds {
  width: 110%;
  left: -5%;
}
.learn-landscape {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 85%;
  object-fit: fill;
}
.inline-learn-room {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  z-index: 1;
  pointer-events: none;
}
.inline-professor,
.inline-learner {
  position: absolute;
  z-index: 2;
  object-fit: contain;
  object-position: center bottom;
  image-rendering: pixelated;
  pointer-events: none;
}
.inline-professor {
  left: 73%;
  top: 31%;
  width: 27%;
  height: 53%;
  object-fit: fill;
}
.inline-learner {
  left: 10%;
  top: 60%;
  width: 18%;
  height: 28%;
  object-fit: fill;
}
.inline-whiteboard {
  position: absolute;
  z-index: 3;
  left: 25%;
  top: 11.5%;
  width: 49%;
  height: 41%;
  box-sizing: border-box;
  padding: clamp(12px, 1.4cqw, 28px);
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  background: #fffdf4f2;
  border-radius: 8px;
  color: #24364c;
  font-size: clamp(15px, 1.15cqw, 22px);
  line-height: 1.65;
}
.inline-whiteboard h1 {
  font-size: clamp(22px, 2cqw, 36px);
  color: #24364c;
  margin: 0 0 16px;
}
.inline-whiteboard h2 {
  font-size: 1.2em;
  color: #24364c;
}
.inline-whiteboard h3 {
  font-size: 1em;
  color: #24364c;
}
.learn-copy {
  white-space: pre-line;
  color: #24364c;
}
.learn-eyebrow {
  font-size: 0.7em;
  letter-spacing: 0.12em;
  font-weight: 800;
  color: #886a35;
}
.inline-concept {
  border-top: 1px solid #d8cba9;
  padding: 18px 0;
}
.inline-example,
.learn-goals {
  background: #f1eddf;
  border-radius: 12px;
  padding: 12px 16px;
}
.learn-note {
  font-size: 0.8em;
}
@media (max-width: 1000px) {
  .inline-classroom {
    overflow-y: auto;
    padding-top: 220px;
  }
  .inline-learn-scene {
    height: auto;
    min-height: 0;
    padding-top: 56.28%;
  }
  .inline-learn-sky,
  .inline-learn-room,
  .classroom-play-floor {
    height: 56.28cqw;
  }
  .inline-professor {
    top: 17.45cqw;
    height: 29.83cqw;
  }
  .inline-learner {
    top: 33.77cqw;
    height: 15.76cqw;
  }
  .inline-whiteboard {
    position: relative;
    inset: auto;
    width: auto;
    height: auto;
    margin: 12px;
    padding: 20px;
    border: 2px solid #c4ab6d;
    border-radius: 16px;
    font-size: 16px;
  }
}

/* A code-drawn pixel stool: touch, mouse and keyboard controls. */
.classroom-play-floor {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}
.pixel-stool {
  position: absolute;
  width: 7%;
  min-width: 42px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  transform: translate(-50%, -50%);
  cursor: grab;
  touch-action: none;
  user-select: none;
  pointer-events: auto;
  -webkit-user-select: none;
}
.pixel-stool canvas {
  display: block;
  width: 100%;
  height: auto;
  background: transparent;
  filter: none;
}
.pixel-stool:hover {
  background: transparent;
}
.pixel-stool.is-dragging {
  cursor: grabbing;
}
.pixel-stool:focus-visible {
  outline: 3px dashed #ffdd72;
  outline-offset: 6px;
}
.stool-buddy {
  position: absolute;
  left: 7%;
  top: 43%;
  width: 24%;
  height: 36%;
  object-fit: contain;
  object-position: center bottom;
  image-rendering: pixelated;
  pointer-events: none;
  transition: top 0.18s ease;
}
.stool-buddy.is-protesting {
  top: 51%;
}
.stool-speech {
  position: absolute;
  left: 5%;
  bottom: 43%;
  max-width: 260px;
  padding: 12px 16px;
  background: #fff8df;
  color: #26384e;
  border: 3px solid #34465e;
  box-shadow: 4px 4px 0 #172a3e55;
  font-size: clamp(13px, 1.1vw, 19px);
  line-height: 1.4;
  pointer-events: auto;
}
.stool-speech::after {
  content: '';
  position: absolute;
  left: 45%;
  bottom: -12px;
  width: 16px;
  height: 16px;
  background: #fff8df;
  border-right: 3px solid #34465e;
  border-bottom: 3px solid #34465e;
  transform: rotate(45deg);
}
.stool-speech button {
  display: block;
  margin-top: 8px;
  padding: 5px 10px;
  border: 2px solid #34465e;
  border-radius: 6px;
  color: #26384e;
  background: #ffdf7b;
  font: inherit;
  cursor: pointer;
}
@media (prefers-reduced-motion: reduce) {
  .stool-buddy {
    transition: none;
  }
}

button.pixel-stool,
button.pixel-stool:hover,
button.pixel-stool:active,
button.pixel-stool:focus {
  appearance: none;
  -webkit-appearance: none;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  filter: none !important;
  min-height: 0;
  min-width: 0;
  width: 7%;
  line-height: 0;
  z-index: 1;
}
button.pixel-stool::before,
button.pixel-stool::after {
  content: none !important;
}
.classroom-play-floor .stool-buddy {
  left: 19%;
  top: auto;
  bottom: calc(17% + 2.8cqw);
  width: 10cqw;
  height: 11cqw;
  transform: translateX(-50%);
  object-fit: contain;
  object-position: center bottom;
  z-index: 2;
  transition: bottom 0.18s ease;
  background: transparent;
}
.classroom-play-floor .stool-buddy.is-protesting {
  top: auto;
  bottom: 9%;
}
@media (prefers-reduced-motion: reduce) {
  .classroom-play-floor .stool-buddy {
    transition: none;
  }
}

/* Block browser image ghost dragging; stool uses pointer events independently. */
:deep(img) {
  -webkit-user-drag: none;
  user-select: none;
  -webkit-user-select: none;
}
.inline-learn-sky {
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}

/* Coordinates match the enlarged-board classroom artwork. */
@media (min-width: 1001px) {
  .inline-whiteboard {
    left: 18.7%;
    top: 8%;
    width: 62.7%;
    height: 50.5%;
    padding: clamp(16px, 1.6cqw, 32px);
    background: #fffdf6;
  }
  .study-clock {
    position: fixed;
    top: 82px;
    left: 16px;
    width: max-content;
    transform: scale(0.65);
    transform-origin: top left;
  }
  .return-flashcards {
    position: fixed;
    right: 20px;
    bottom: 20px;
    top: auto;
    font-size: clamp(12px, 1vw, 18px);
  }
}
.inline-learn-scene .inline-professor {
  left: 84%;
  top: 52%;
  width: 15%;
  height: 39%;
  object-fit: contain;
  object-position: center bottom;
}
.classroom-play-floor .stool-buddy {
  left: 11%;
  bottom: calc(13% + 2.8cqw);
  width: 8cqw;
  height: 9cqw;
}
.classroom-play-floor .stool-buddy.is-protesting {
  bottom: 7%;
}
.classroom-play-floor .stool-speech {
  left: 1%;
  top: 62%;
  bottom: auto;
  width: 20%;
  max-width: none;
  box-sizing: border-box;
  padding: clamp(10px, 1cqw, 20px);
  border: 3px solid #36577c;
  border-radius: clamp(20px, 2cqw, 38px);
  background: #fffdf2;
  color: #304d70;
  box-shadow: 0 4px 0 #213c5422;
  text-align: center;
  font-family: inherit;
  font-size: clamp(12px, 0.95cqw, 18px);
  line-height: 1.3;
  z-index: 5;
}
.stool-speaker {
  display: block;
  margin-bottom: 0.5em;
  color: #936d16;
  letter-spacing: 0.15em;
  font-size: 0.72em;
  font-weight: 900;
}
.stool-speech strong {
  display: block;
  font-weight: 800;
}
.classroom-play-floor .stool-speech::after {
  left: calc(50% - 9px);
  bottom: -11px;
  width: 18px;
  height: 18px;
  background: #fffdf2;
  border-color: #36577c;
}
.stool-speech button {
  display: inline-block;
  margin: 8px auto 0;
  padding: 3px 8px;
  background: transparent;
  color: #304d70;
  border: 0;
  box-shadow: none;
  backdrop-filter: none;
  font-size: 0.8em;
  text-decoration: underline;
  min-height: 0;
}
@media (max-width: 1000px) {
  .inline-learn-scene .inline-professor {
    top: 29.27cqw;
    height: 21.95cqw;
  }
  .classroom-play-floor .stool-speech {
    width: 30%;
    left: 1%;
    top: 57%;
    padding: 8px;
    border-radius: 18px;
    font-size: clamp(10px, 1.5cqw, 14px);
  }
}

.redesigned-picker {
  position: fixed;
  inset: 0;
  padding: 0;
  background: #fff;
  color: #303557;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

/* Navigation stays together in both classroom and flashcard modes. */
.study-header {
  position: fixed;
  top: max(16px, env(safe-area-inset-top));
  left: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  z-index: 30;
  pointer-events: none;
}
.study-navigation {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  pointer-events: auto;
}
.study-navigation .home-link {
  position: static;
  margin: 0;
  padding: 10px 16px;
  border: 1px solid #ffffff66;
  border-radius: 14px;
  background: #203956;
  color: #fff;
  font: inherit;
  font-weight: 750;
  text-decoration: none;
  cursor: pointer;
}
.study-navigation .home-link:disabled {
  opacity: 0.55;
  cursor: wait;
}
.study-navigation .home-link:focus-visible {
  outline: 3px solid #ffe194;
  outline-offset: 3px;
}
.study-header > .study-clock {
  position: static;
  width: auto;
  max-width: 100%;
  transform: none;
  pointer-events: auto;
}
@media (min-width: 1001px) {
  .poke-lab-page.study-clock {
    zoom: 0.65;
  }
}
/* A wider image box lets Mewtwo grow without stretching the artwork. */
.inline-learn-scene .inline-professor {
  left: auto;
  right: 1%;
  top: auto;
  bottom: 3%;
  width: 24%;
  height: 42%;
  object-fit: contain;
  object-position: right bottom;
}
@media (max-width: 1000px) {
  .inline-learn-scene .inline-professor {
    right: 1%;
    top: 30.95cqw;
    bottom: auto;
    width: 24%;
    height: 23.64cqw;
  }
  .study-navigation .home-link {
    padding: 8px 12px;
    font-size: 13px;
  }
}

.inline-classroom {
  position: relative;
  inset: auto;
  width: 100%;
  height: calc(100dvh - 150px);
  min-height: 560px;
}
.inline-whiteboard {
  color: #17324d;
}
.inline-whiteboard :deep(.classroom-controls) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
@media (max-width: 1000px) {
  .inline-whiteboard :deep(.classroom-controls) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .inline-whiteboard :deep(.classroom-controls [role='timer']) {
    grid-column: 1 / -1;
    text-align: center;
  }
  .inline-whiteboard :deep(.classroom-controls button) {
    min-width: 0;
    white-space: normal;
    padding: 10px;
    font-size: 14px;
    line-height: 1.4;
  }
}
@media (max-width: 1000px) {
  .inline-classroom {
    height: auto;
    min-height: 0;
    padding-top: 0;
    overflow: visible;
  }
}
</style>
