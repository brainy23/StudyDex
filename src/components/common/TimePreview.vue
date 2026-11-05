<script setup>
import { computed, onUnmounted } from 'vue'
import {
  useTimeOfDay,
  useTimePreview,
} from '../../composables/useTimeOfDay'

const { hour } = useTimeOfDay()
const { isPreview, setPreviewHour, resetPreview } = useTimePreview()

const presets = [
  { label: 'Morning', hour: 8 },
  { label: 'Day', hour: 12 },
  { label: 'Sunset', hour: 18.5 },
  { label: 'Night', hour: 22 },
  { label: 'Midnight', hour: 0 },
]

const timeValue = computed(() => {
  const minutes = Math.floor(hour.value * 60)
  const hoursText = String(Math.floor(minutes / 60)).padStart(2, '0')
  const minutesText = String(minutes % 60).padStart(2, '0')

  return `${hoursText}:${minutesText}`
})

function changeTime(event) {
  const value = event.target.value
  if (!value) return

  const [hours, minutes] = value.split(':').map(Number)
  setPreviewHour(hours + minutes / 60)
}

function changeSlider(event) {
  setPreviewHour(Number(event.target.value) / 60)
}

// Removing the testing component clears its global override.
onUnmounted(resetPreview)
</script>

<template>
  <Teleport to="body">
    <aside class="time-preview" aria-label="Time preview testing controls">
      <div class="preview-heading">
        <strong>Time preview</strong>
        <span role="status">{{ isPreview ? 'Testing' : 'Live' }}</span>
      </div>

      <div class="preview-controls">
        <input
          type="time"
          aria-label="Preview time"
          :value="timeValue"
          @input="changeTime"
        />

        <button
          type="button"
          :class="{ active: !isPreview }"
          @click="resetPreview"
        >
          Live
        </button>
      </div>

      <input
        class="preview-slider"
        type="range"
        min="0"
        max="1439"
        step="1"
        :value="Math.floor(hour * 60)"
        aria-label="Time of day"
        :aria-valuetext="timeValue"
        @input="changeSlider"
      />

      <div class="preview-presets">
        <button
          v-for="preset in presets"
          :key="preset.label"
          type="button"
          @click="setPreviewHour(preset.hour)"
        >
          {{ preset.label }}
        </button>
      </div>
    </aside>
  </Teleport>
</template>

<style scoped>
.time-preview {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 10000;
  box-sizing: border-box;
  width: min(330px, calc(100vw - 24px));
  padding: 12px;
  border: 1px solid #7d91aa;
  border-radius: 16px;
  background: #172b43;
  color: #fff5dc;
  box-shadow: 0 6px 24px #0005;
  font: 14px/1.4 system-ui, sans-serif;
}

.preview-heading,
.preview-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.preview-heading span {
  color: #ffe08a;
  font-size: 12px;
}

.preview-controls input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid #7d91aa;
  border-radius: 8px;
  background: white;
  color: #172b43;
  font: inherit;
}

.preview-slider {
  display: block;
  width: 100%;
  margin: 10px 0 14px;
  accent-color: #ffe08a;
}

.preview-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

button {
  padding: 6px 10px;
  border: 1px solid #7d91aa;
  border-radius: 8px;
  background: #29435e;
  color: white;
  font: inherit;
  cursor: pointer;
}

button:hover,
button.active {
  background: #ffe08a;
  color: #172b43;
}

button:focus-visible,
input:focus-visible {
  outline: 2px solid #ffe08a;
  outline-offset: 3px;
}
</style>