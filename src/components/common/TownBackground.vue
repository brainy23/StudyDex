<script setup>
import { useTimeOfDay } from '@/composables/useTimeofDay';
import { computed, toRef, watch } from 'vue'

const props = defineProps({
  scene: {
    type: String,
    default: 'town',
    validator: value => ['town', 'room'].includes(value)
  },
  live: { type: Boolean, default: true },
  previewHour: { type: Number, default: 12 },
  rainActive: { type: Boolean, default: false },
  // Optional compatibility with existing town pages.
  buddySleeping: { type: Boolean, default: null }
})

const emit = defineEmits(['sleep-change', 'image-error'])
const { hour, lighting } = useTimeOfDay({
  live: toRef(props, 'live'),
  previewHour: toRef(props, 'previewHour')
})

// One time source for the background and the HomeView sleeping signal.
const sleepingByTime = computed(() => hour.value >= 0 && hour.value < 7)
const isSleeping = computed(() => props.buddySleeping ?? sleepingByTime.value)
watch(sleepingByTime, sleeping => emit('sleep-change', sleeping), { immediate: true })

const base = import.meta.env.BASE_URL
const asset = `${base}town/`
const images = {
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

</script>

<template>
  <div class="town-background" :class="{ 'room-background': scene === 'room' }" aria-hidden="true">
    <template v-if="scene === 'room'">
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
</style>
