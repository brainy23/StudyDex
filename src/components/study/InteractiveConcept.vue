<script setup>
import { computed, ref, useId } from 'vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { motion, useReducedMotion } from 'motion-v'
import { interactiveConceptKind } from '../../utils/interactiveConcepts'

const props = defineProps({
  topic: { type: Object, required: true },
  concept: { type: Object, required: true },
})
const kind = computed(() => interactiveConceptKind(props.topic, props.concept))
const water = ref('enough')
const enoughWater = computed(() => water.value === 'enough')
const reducedMotion = useReducedMotion()
const headingId = useId()
const observation = computed(() =>
  enoughWater.value
    ? 'With enough water, the plant stays firm and upright.'
    : 'Without enough water over time, the plant may wilt. Its stem and leaves become droopy.',
)

function setWater(value) {
  if (['enough', 'dry'].includes(value)) water.value = value
}
</script>

<template>
  <section v-if="kind === 'plant-water'" class="study-interactive" :aria-labelledby="headingId">
    <p class="study-eyebrow">Try it out · Observe a change</p>
    <h3 :id="headingId">Living Things Need Water</h3>
    <p>Change the water supply. What happens to the same plant over time?</p>
    <ToggleGroupRoot
      type="single"
      :model-value="water"
      class="study-water-controls"
      aria-label="Water supply"
      @update:model-value="setWater"
    >
      <ToggleGroupItem value="enough" class="study-button study-button-secondary"
        >Enough Water</ToggleGroupItem
      >
      <ToggleGroupItem value="dry" class="study-button study-button-secondary"
        >Not Enough Water</ToggleGroupItem
      >
    </ToggleGroupRoot>
    <div class="study-water-scene" :class="{ 'is-dry': !enoughWater }">
      <svg
        class="study-plant-diagram"
        viewBox="0 0 320 240"
        role="img"
        :aria-label="
          enoughWater
            ? 'A healthy plant with firm, upright leaves and enough water'
            : 'A plant with droopy leaves after insufficient water over time'
        "
      >
        <ellipse cx="181" cy="218" rx="66" ry="9" fill="#17324d" opacity=".07" />
        <circle cx="181" cy="112" r="91" fill="#e9f4e9" class="study-plant-backdrop" />
        <g aria-hidden="true">
          <rect
            class="study-water-gauge"
            x="40"
            y="96"
            width="30"
            height="83"
            rx="10"
            fill="#fff"
            stroke="#8eb5cc"
            stroke-width="2"
          />
          <rect
            class="study-water-level"
            x="45"
            y="101"
            width="20"
            height="73"
            rx="6"
            fill="#69b7dd"
          />
          <path
            d="M55 67 C55 67 45 79 45 84 A10 10 0 0 0 65 84 C65 79 55 67 55 67Z"
            fill="#4297c2"
          />
          <path
            d="M77 139 H105 M98 132 L105 139 98 146"
            fill="none"
            stroke="#8eb5cc"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </g>
        <g class="study-plant-stem">
          <path
            d="M181 184 C180 153 175 122 181 70"
            fill="none"
            stroke="#4b8050"
            stroke-width="7"
            stroke-linecap="round"
          />
          <g class="study-plant-leaf study-plant-leaf-left">
            <path d="M178 125 C150 87 120 88 119 96 C118 125 151 146 178 125Z" fill="#67a762" />
            <path
              d="M175 126 L132 105"
              fill="none"
              stroke="#447a47"
              stroke-width="2"
              stroke-linecap="round"
            />
          </g>
          <g class="study-plant-leaf study-plant-leaf-right">
            <path d="M179 102 C202 64 237 62 241 70 C245 99 210 121 179 102Z" fill="#4d9256" />
            <path
              d="M183 101 L227 79"
              fill="none"
              stroke="#366f42"
              stroke-width="2"
              stroke-linecap="round"
            />
          </g>
          <g class="study-plant-leaf study-plant-leaf-top">
            <path d="M181 78 C161 59 167 38 173 36 C194 40 201 63 181 78Z" fill="#81b66a" />
          </g>
        </g>
        <path
          d="M146 180 H216 L208 214 Q181 224 154 214Z"
          fill="#dca67d"
          stroke="#a87252"
          stroke-width="2"
        />
        <rect
          x="141"
          y="172"
          width="80"
          height="16"
          rx="5"
          fill="#eebd93"
          stroke="#a87252"
          stroke-width="2"
        />
        <path d="M153 173 H209" stroke="#72543d" stroke-width="4" stroke-linecap="round" />
      </svg>
      <div class="study-water-observation">
        <span class="study-observation-label">What you can observe</span>
        <div role="status" aria-live="polite" aria-atomic="true">
          <motion.p
            :key="water"
            :initial="reducedMotion ? false : { opacity: 0, y: 4 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: reducedMotion ? 0 : 0.25 }"
            >{{ observation }}</motion.p
          >
        </div>
        <p class="study-note">Only the water supply changes. The other conditions stay the same.</p>
      </div>
    </div>
    <p class="study-note study-model-note">
      Changes happen over time. This model speeds them up so you can compare.
    </p>
  </section>
</template>
