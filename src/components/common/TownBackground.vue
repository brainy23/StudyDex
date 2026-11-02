<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useTimeOfDay } from '@/composables/useTimeOfDay'

const props = defineProps({
  scene: {
    type: String,
    default: 'town',
    validator: value => ['town', 'room', 'lab', 'arena', 'boss'].includes(value)
  },
  live: { type: Boolean, default: true },
  previewHour: { type: Number, default: 12 },
  paused: { type: Boolean, default: false },
  rainActive: { type: Boolean, default: false },
  // Optional compatibility with existing town pages.
  buddySleeping: { type: Boolean, default: null }
})

const emit = defineEmits(['sleep-change', 'image-error'])
const pausedHour = ref(12)
watch(() => props.paused, paused => {
  if (!paused) return
  const now = new Date()
  pausedHour.value = props.live
    ? now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
    : props.previewHour
}, { immediate: true })
const { hour, lighting } = useTimeOfDay({
  live: computed(() => props.live && !props.paused),
  previewHour: computed(() => props.paused ? pausedHour.value : props.previewHour)
})

// One time source for the background and the HomeView sleeping signal.
const sleepingByTime = computed(() => hour.value >= 0 && hour.value < 7)
const isSleeping = computed(() => props.buddySleeping ?? sleepingByTime.value)
watch(sleepingByTime, sleeping => emit('sleep-change', sleeping), { immediate: true })

const base = import.meta.env.BASE_URL
const asset = `${base}town/`
const images = {
  arena: `${base}poke-arena/poke-arena4.png`,
  boss: `${base}surprise-boss/forest2.png`,
  room: `${base}trainer-home/trainer-home-v3.png`,
  landscape: `${base}trainer-home/window-landscape-clean.png`,
  sun: `${asset}bg_sun.png`,
  moon: `${asset}bg_moon.png`,
  stars: `${asset}bg_stars.png`,
  clouds: `${asset}bg_clouds.png`
}

function reportImageError(event) {
  emit('image-error', event)
}

const worldStyle = computed(() => ({
  filter: `brightness(${lighting.value.brightness}) saturate(${lighting.value.saturation})`
}))

// Original town movement formulas.
function celestialStyle(isMoon) {
  const h = hour.value
  const progress = isMoon ? ((h - 19 + 24) % 24) / 11 : (h - 6) / 13
  const visible = progress > 0 && progress < 1 && !props.rainActive
  const p = Math.max(0, Math.min(1, progress))
  return {
    left: `${12 + p * 76}%`,
    top: `${25 - Math.sin(p * Math.PI) * 19}%`,
    opacity: visible ? Math.min(1, p * 10, (1 - p) * 10) : 0
  }
}

// Original room rendering and movement formulas.
const skyStyle = computed(() => ({
  background: `linear-gradient(
    to bottom,
    ${lighting.value.top} 0%,
    ${lighting.value.horizon} 55%,
    ${lighting.value.horizon} 100%
  )`
}))

const landscapeStyle = computed(() => ({
  filter: `
    brightness(${lighting.value.brightness})
    saturate(${lighting.value.saturation})
  `
}))

const cloudStyle = computed(() => ({
  opacity: lighting.value.cloud,
  filter: `brightness(${lighting.value.brightness})`
}))

const roomStyle = computed(() => ({
  filter: `
    brightness(${0.55 + lighting.value.brightness * 0.45})
    saturate(${0.9 + lighting.value.saturation * 0.1})
  `
}))

const sunsetStrength = computed(() =>
  Math.max(0, 1 - Math.abs(hour.value - 18.3) / 2)
)

function roomCelestialStyle(isMoon) {
  const progress = isMoon
    ? ((hour.value - 19 + 24) % 24) / 11
    : (hour.value - 6) / 13

  const visible = progress > 0 && progress < 1 && !props.rainActive
  const position = Math.max(0, Math.min(1, progress))

  return {
    left: `${18 + position * 64}%`,
    top: `${48 - Math.sin(position * Math.PI) * 36}%`,
    opacity: visible
      ? Math.min(1, position * 12, (1 - position) * 12)
      : 0
  }
}


// Study room: retain its original assets, lighting strength and fallback effects.
const labBackground = `${base}poke-lab/poke-lab-interior.png`
const landscapeImage = images.landscape
const landscapeFailed = ref(false)
const skyImages = images
const skyImageFailed = reactive({ sun: false, moon: false, clouds: false, stars: false })
const labSkyStyle = computed(() => ({
  background: `linear-gradient(to bottom, ${lighting.value.top} 0%, ${lighting.value.horizon} 30%)`
}))
const roomLighting = computed(() => ({
  filter: `brightness(${Math.max(.78, lighting.value.brightness)}) saturate(${Math.max(.9, lighting.value.saturation)})`
}))
const skyStars = Array.from({ length: 65 }, (_, index) => ({
  left: `${(index * 37.3 + 7) % 100}%`, top: `${(index * 19.7 + 3) % 65}%`,
  width: `${index % 3 + 1}px`, height: `${index % 3 + 1}px`
}))

// Floodlights: 7pm until midnight.
const arenaLightsOn = computed(() => hour.value >= 19)

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

// The latest arena artwork has two visible outer floodlight banks.
// Adjust these percentages if you change the background image.
const floodlights = [
  { id: 'left', left: 8.7, top: 16.8, angle: -24 },
  { id: 'right', left: 91.3, top: 16.8, angle: 24 },
]


const arenaSkyStyle = computed(() => ({ background: `linear-gradient(to bottom, ${lighting.value.top} 0%, ${lighting.value.horizon} 30%)` }))

</script>

<template>
  <div class="town-background" :class="{ 'arena-background': scene === 'arena' || scene === 'boss', 'room-background': scene === 'room', 'lab-background': scene === 'lab', 'is-paused': paused }" aria-hidden="true">
    <template v-if="scene === 'arena' || scene === 'boss'">
      <!-- SKY -->
      <div
        class="layer sky"
        :style="arenaSkyStyle"
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
        :src="scene === 'boss' ? images.boss : images.arena"
        :style="arenaStyle"
        :alt="scene === 'boss' ? 'StudyDex boss forest' : 'StudyDex quiz arena'"
        draggable="false"
      />

      <!-- EVENING FLOODLIGHTS -->
      <div
        v-if="scene === 'arena'"
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


    </template>
    <template v-else-if="scene === 'lab'">
        <div class="lab-sky" :style="labSkyStyle" aria-hidden="true">
          <div class="lab-celestial lab-sun" :style="celestialStyle(false)">
            <img v-if="!skyImageFailed.sun" :src="skyImages.sun" alt="" @error="skyImageFailed.sun = true" />
            <span v-else class="sun-fallback"></span>
          </div>
          <div class="lab-celestial lab-moon" :style="celestialStyle(true)">
            <img v-if="!skyImageFailed.moon" :src="skyImages.moon" alt="" @error="skyImageFailed.moon = true" />
            <span v-else class="moon-fallback"></span>
          </div>
          <div class="lab-stars" :style="{ opacity: lighting.stars }">
            <img v-if="!skyImageFailed.stars" :src="skyImages.stars" alt="" @error="skyImageFailed.stars = true" />
            <div v-else class="fallback-stars"><i v-for="(star, index) in skyStars" :key="index" :style="star"></i></div>
          </div>
          <div class="lab-clouds" :style="cloudStyle">
            <img v-if="!skyImageFailed.clouds" :src="skyImages.clouds" alt="" @error="skyImageFailed.clouds = true" />
            <div v-else class="fallback-clouds"><i></i><i></i><i></i></div>
          </div>
          <img
            v-if="!landscapeFailed"
            class="lab-landscape"
            :src="landscapeImage"
            :style="landscapeStyle"
            alt=""
            draggable="false"
            @error="landscapeFailed = true"
          />
        </div>
        <img class="lab-room" :src="labBackground" :style="roomLighting" alt="" @error="reportImageError" />

    </template>
    <template v-else-if="scene === 'room'">
      <div class="window-view" aria-hidden="true">

        <div
          class="outdoor-layer sky-layer"
          :style="skyStyle"
        ></div>

        <div
          class="outdoor-layer stars-layer"
          :style="{ opacity: rainActive ? 0 : lighting.stars }"
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
          :style="roomCelestialStyle(false)"
          alt=""
          draggable="false"
          @error="reportImageError"
        />

        <img
          class="celestial moon-image"
          :src="images.moon"
          :style="roomCelestialStyle(true)"
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
        alt=""
        draggable="false"
        @error="reportImageError"
      />
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

    </template>
    <template v-else>
      <div class="layer sky" :style="{
        background: `linear-gradient(to bottom, ${lighting.top} 0%, ${lighting.horizon} 30%)`
      }"></div>
      <img class="celestial sun" :src="images.sun" :style="celestialStyle(false)" alt="" draggable="false" @error="reportImageError" />
      <img class="celestial moon" :src="images.moon" :style="celestialStyle(true)" alt="" draggable="false" @error="reportImageError" />
      <div class="layer" :style="{ opacity: rainActive ? 0 : lighting.stars }">
        <img class="layer stars" :src="images.stars" alt="" draggable="false" @error="reportImageError" />
      </div>
      <div class="layer" :style="{ opacity: lighting.cloud, filter: `brightness(${lighting.brightness})` }">
        <img class="layer clouds" :src="images.clouds" alt="" draggable="false" @error="reportImageError" />
      </div>
      <img class="layer" :src="asset + 'building_img.png'" :style="worldStyle" alt="" draggable="false" @error="reportImageError" />
      <img class="layer building-lights" :src="asset + 'bg_buildinglights.png'" :style="{ opacity: isSleeping ? 0 : lighting.lights * 0.45 }" alt="" draggable="false" @error="reportImageError" />
      <div class="layer" :style="{ opacity: rainActive ? 0 : lighting.fireflies }">
        <img class="layer fireflies" :src="asset + 'bg_firefly.png'" alt="" draggable="false" @error="reportImageError" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.town-background { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.town-background.is-paused * { animation-play-state: paused !important; transition: none !important; }
.layer { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
img.layer { object-fit: fill; }
.building-lights { filter: saturate(0.65); }
.celestial { position: absolute; width: 10%; height: auto; transform: translate(-50%, -50%); pointer-events: none; transition: opacity 1.5s ease; }
.moon { width: 7%; }
.clouds { inset: auto; top: 0; left: -5%; width: 110%; height: 100%; max-width: none; object-fit: fill; animation: cloud-drift 80s ease-in-out infinite alternate; }
.stars { animation: star-twinkle 5s ease-in-out infinite alternate; }
.fireflies { animation: firefly-float 5s ease-in-out infinite alternate; }
.window-view { position: absolute; left: 32.5%; top: 16.5%; width: 30.5%; height: 33%; z-index: 0; isolation: isolate; overflow: hidden; pointer-events: none; }

.outdoor-layer { position: absolute; inset: 0; width: 100%; height: 100%; }

.sky-layer { z-index: 0; }

.stars-layer { z-index: 2; }

.stars-image { display: block; width: 100%; height: 100%; max-width: none; object-fit: fill; animation: star-twinkle 5s ease-in-out infinite alternate; }

.clouds-layer { z-index: 2; }

.clouds-image { position: absolute; top: 0; left: -6%; display: block; width: 112%; height: 70%; max-width: none; object-fit: fill; animation: cloud-drift 70s ease-in-out infinite alternate; }

.room-background .celestial { position: absolute; z-index: 1; display: block; height: auto; max-width: none; transform: translate(-50%, -50%); pointer-events: none; }

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


/* Room celestial images retain their original immediate opacity changes. */
.room-background .celestial { transition: none; }
@keyframes cloud-drift {
from { transform: translateX(-2%); }

to { transform: translateX(2%); }
}

@keyframes star-twinkle {
from { opacity: 0.65; }

to { opacity: 1; }
}


@keyframes firefly-float {
  from { transform: translateY(0); opacity: 0.55; }
  to { transform: translateY(-0.8%); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .clouds, .stars, .fireflies, .clouds-image, .stars-image { animation: none; }
}

/* Lab artwork stays aligned with the study controls. */
.town-background.lab-background { bottom: auto; height: auto; aspect-ratio: 1672 / 941; }
.lab-room { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; z-index: 1; pointer-events: none; }
.lab-sky { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.lab-celestial { position: absolute; z-index: 1; width: 10%; transform: translate(-50%, -50%); transition: opacity 1.5s ease; }
.lab-moon { width: 7%; }
.lab-celestial img { width: 100%; height: auto; display: block; }
.lab-stars, .lab-clouds { position: absolute; inset: 0; }
.lab-stars { z-index: 2; }
.lab-clouds { z-index: 3; }
.lab-stars > img, .lab-clouds > img { position: absolute; inset: 0; width: 100%; height: 100%; max-width: none; object-fit: fill; }
.lab-clouds > img, .fallback-clouds { left: -5%; width: 110%; animation: lab-cloud-drift 80s ease-in-out infinite alternate; }
.lab-stars > img, .fallback-stars { animation: lab-twinkle 5s ease-in-out infinite alternate; }
.fallback-stars, .fallback-clouds { position: absolute; inset: 0; }
.fallback-stars i { position: absolute; background: #fff; border-radius: 50%; box-shadow: 0 0 4px #fff; }
.sun-fallback, .moon-fallback { display: block; width: 100%; aspect-ratio: 1; border-radius: 50%; }
.sun-fallback { background: radial-gradient(circle, #fff7b4 25%, #ffdb6e 70%); box-shadow: 0 0 35px #ffe79b88; }
.moon-fallback { background: radial-gradient(circle at 35% 35%, #fffdeb, #c1d4eb); box-shadow: 0 0 20px #d3e7ff55; }
.fallback-clouds i { position: absolute; width: 25%; height: 8%; background: #ffffffaa; border-radius: 50%; filter: blur(8px); }
.fallback-clouds i:nth-child(1) { left: 4%; top: 17%; }
.fallback-clouds i:nth-child(2) { left: 45%; top: 6%; width: 35%; }
.fallback-clouds i:nth-child(3) { left: 80%; top: 32%; }
@keyframes lab-cloud-drift { from { transform: translateX(-2%); } to { transform: translateX(2%); } }
@keyframes lab-twinkle { from { opacity: .7; } to { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .lab-clouds > img, .fallback-clouds, .lab-stars > img, .fallback-stars { animation: none; }
  .lab-celestial { transition: none; }
}

.lab-landscape {
  position: absolute;
  z-index: 4;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 85%;
  max-width: none;
  object-fit: fill;
  pointer-events: none;
}



.arena-background .layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.arena-background img.layer {
  display: block;
  object-fit: fill;
  user-select: none;
}
.arena-background .sky {
  z-index: 0;
}
.arena-background .celestial {
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
.arena-background .moon {
  width: 7%;
}
.arena-background .stars-layer {
  z-index: 2;
}
.arena-background .clouds-layer {
  z-index: 3;
}
.arena-background .clouds {
  inset: auto;
  top: 0;
  left: -5%;
  width: 110%;
  height: 100%;
  max-width: none;
  animation: cloud-drift 80s ease-in-out infinite alternate;
}
.arena-background .stars {
  animation: star-twinkle 5s ease-in-out infinite alternate;
}
.arena-background .arena-image {
  z-index: 4;
  transition: filter 1s ease;
}
.arena-background .arena-light-effects {
  z-index: 5;
  opacity: 0;
  transition: opacity 1s ease;
}
.arena-background .arena-light-effects.is-on {
  opacity: 1;
}
.arena-background .floodlight {
  position: absolute;
  width: 0;
  height: 0;
}
.arena-background .floodlight-halo {
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
.arena-background .floodlight-bulbs {
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
.arena-background .floodlight-beam {
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
.arena-background .court-light-pool {
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


@media (prefers-reduced-motion: reduce) { .arena-background .clouds, .arena-background .stars { animation: none; } .arena-background .celestial, .arena-background .arena-image, .arena-background .arena-light-effects { transition: none; } }
</style>
