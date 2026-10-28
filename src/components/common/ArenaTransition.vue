<script setup>
import { computed, nextTick, onUnmounted, watch } from 'vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { motion, useReducedMotion } from 'motion-v'
import {
  useArenaTransition,
  ARENA_ANTICIPATION_MS,
  ARENA_REVEAL_MS,
} from '../../composables/useArenaTransition'
import { displayTitle } from '../../utils/displayText'

const { state, presented, skip, reduceMotion, cancel } = useArenaTransition()
const reducedMotion = useReducedMotion()
const revealing = computed(() => state.phase === 'reveal')
const status = computed(() =>
  revealing.value
    ? 'Welcome to Poké Arena!'
    : state.navigating
      ? 'Opening Poké Arena…'
      : state.phase === 'battle'
        ? 'Your next challenge is ahead.'
        : 'Entering the Arena…',
)

watch(reducedMotion, (reduce) => {
  if (reduce && state.active) reduceMotion()
})
watch(
  () => [state.active, state.sequence],
  async ([active, sequence]) => {
    if (!active || state.reducedMotion) return
    await nextTick()
    // Give the portal a real painted frame before starting its two-second sequence.
    requestAnimationFrame(() => requestAnimationFrame(() => presented(sequence)))
  },
  { flush: 'post' },
)
onUnmounted(cancel)

function onOpenChange(open) {
  if (!open && state.active) skip()
}
</script>

<template>
  <DialogRoot :open="state.active && !state.reducedMotion" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="arena-transition-overlay" />
      <DialogContent
        class="arena-transition"
        :data-phase="state.phase"
        @escape-key-down.prevent="skip"
        @interact-outside.prevent
        @close-auto-focus.prevent
      >
        <motion.div
          class="arena-transition-backdrop"
          :initial="{ opacity: 1 }"
          :animate="{ opacity: revealing ? 0 : 1 }"
          :transition="{ duration: ARENA_REVEAL_MS / 1000, ease: 'easeInOut' }"
          aria-hidden="true"
        />
        <motion.div
          class="arena-transition-shutter arena-transition-shutter-top"
          :initial="{ x: '-105%', y: '0%' }"
          :animate="{ x: '0%', y: revealing ? '-110%' : '0%' }"
          :transition="{
            duration: (revealing ? ARENA_REVEAL_MS : ARENA_ANTICIPATION_MS) / 1000,
            ease: [0.22, 1, 0.36, 1],
          }"
          aria-hidden="true"
        />
        <motion.div
          class="arena-transition-shutter arena-transition-shutter-bottom"
          :initial="{ x: '105%', y: '0%' }"
          :animate="{ x: '0%', y: revealing ? '110%' : '0%' }"
          :transition="{
            duration: (revealing ? ARENA_REVEAL_MS : ARENA_ANTICIPATION_MS) / 1000,
            ease: [0.22, 1, 0.36, 1],
          }"
          aria-hidden="true"
        />
        <motion.div
          class="arena-transition-card"
          :initial="{ opacity: 0, y: 16, scale: 0.94 }"
          :animate="
            state.phase === 'anticipation'
              ? { opacity: 0, y: 16, scale: 0.94 }
              : revealing
                ? { opacity: 0, y: -16, scale: 1.04 }
                : { opacity: 1, y: 0, scale: 1 }
          "
          :transition="{ duration: revealing ? 0.25 : 0.15, ease: 'easeOut' }"
        >
          <motion.div
            class="arena-transition-ball"
            :initial="{ rotate: -38, scale: 0.72 }"
            :animate="
              state.phase === 'battle'
                ? { rotate: [-38, 22, -7, 0], scale: [0.72, 1.1, 0.98, 1] }
                : { rotate: revealing ? 15 : -38, scale: revealing ? 1.2 : 0.72 }
            "
            :transition="{ duration: revealing ? 0.25 : 0.8, ease: 'easeOut' }"
            aria-hidden="true"
          >
            <span class="arena-ball-center" />
          </motion.div>
          <div class="arena-transition-message">
            <p class="arena-transition-eyebrow">
              Poké Lab <span aria-hidden="true">→</span> Poké Arena
            </p>
            <DialogTitle>A Challenge Awaits!</DialogTitle>
            <DialogDescription>
              <span v-if="state.topicName" class="arena-transition-topic">{{
                displayTitle(state.topicName)
              }}</span>
              Choose your next step in Topic Quiz.
            </DialogDescription>
          </div>
        </motion.div>
        <div class="arena-transition-controls">
          <p class="arena-transition-status" role="status">{{ status }}</p>
          <button
            class="arena-transition-skip"
            :disabled="state.navigating && !revealing"
            @click="skip"
          >
            Skip Transition
          </button>
          <span class="arena-transition-key" aria-hidden="true">or press Esc</span>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.arena-transition-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
}
.arena-transition {
  position: fixed;
  inset: 0;
  z-index: 12001;
  display: grid;
  place-items: center;
  padding: 24px 24px 140px;
  overflow: hidden;
  isolation: isolate;
  color: #fff;
  font-family: 'Fredoka', sans-serif;
}
.arena-transition-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: #112b45;
}
.arena-transition-shutter {
  position: absolute;
  left: -5%;
  width: 110%;
  height: 57%;
  z-index: 1;
  overflow: hidden;
}
.arena-transition-shutter-top {
  top: 0;
  background: #e45f61;
  clip-path: polygon(0 0, 100% 0, 100% 83%, 0 100%);
}
.arena-transition-shutter-bottom {
  bottom: 0;
  background: #eff5ff;
  clip-path: polygon(0 17%, 100% 0, 100% 100%, 0 100%);
}
.arena-transition-shutter::after {
  content: '';
  position: absolute;
  left: -5%;
  width: 110%;
  height: 10px;
  transform: rotate(-5deg);
}
.arena-transition-shutter-top::after {
  bottom: 16%;
  background: #ffd841;
  box-shadow: 0 -18px 0 #17324d22;
}
.arena-transition-shutter-bottom::after {
  top: 16%;
  background: #17324d;
  box-shadow: 0 18px 0 #17324d15;
}
.arena-transition-card {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: clamp(24px, 4vw, 48px);
  width: min(100%, 850px);
  padding: clamp(26px, 4vw, 44px);
  border-block: 4px solid #ffd841;
  border-radius: 18px 4px;
  background: #17324d;
  box-shadow: 0 16px 40px #112b4544;
}
.arena-transition-ball {
  position: relative;
  flex: 0 0 clamp(124px, 20vmin, 172px);
  width: clamp(124px, 20vmin, 172px);
  aspect-ratio: 1;
  border: 8px solid #10283e;
  border-radius: 50%;
  background: linear-gradient(#ef686b 0 44%, #10283e 44% 56%, #f6f9ff 56%);
  box-shadow:
    0 0 0 3px #ffdf5d,
    0 8px 24px #08192955;
}
.arena-ball-center {
  position: absolute;
  inset: 31%;
  border: 7px solid #10283e;
  border-radius: 50%;
  background: #f6f9ff;
}
.arena-ball-center::after {
  content: '';
  position: absolute;
  inset: 20%;
  border-radius: 50%;
  background: #ffd841;
}
.arena-transition-message {
  min-width: 0;
}
.arena-transition-eyebrow {
  margin: 0 0 10px;
  color: #ffe276;
  font-size: 14px;
  font-weight: 550;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.arena-transition-eyebrow span {
  padding-inline: 8px;
}
.arena-transition h2 {
  margin: 0 0 16px;
  color: #fff;
  font-family: inherit;
  font-size: clamp(32px, 4.5vw, 56px);
  font-weight: 650;
  line-height: 1.08;
  text-wrap: balance;
}
.arena-transition-topic {
  display: block;
  margin-bottom: 8px;
  color: #ffe276;
  font-weight: 550;
  line-height: 1.4;
}
.arena-transition-message p:last-child {
  margin-bottom: 0;
  font-size: 15px;
}
.arena-transition-controls {
  position: absolute;
  z-index: 2;
  bottom: max(20px, env(safe-area-inset-bottom));
  left: 20px;
  right: 20px;
  display: grid;
  justify-items: center;
  gap: 8px;
  color: #17324d;
  text-align: center;
}
.arena-transition-status {
  margin: 0;
  padding: 5px 14px;
  border-radius: 12px;
  background: #17324d;
  color: #fff;
  font-size: 14px;
}
.arena-transition-skip {
  min-height: 44px;
  padding: 10px 24px;
  border: 2px solid #a98608;
  border-radius: 12px;
  background: #ffd841;
  color: #302700;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    background-color 0.12s ease;
}
.arena-transition-skip:hover {
  background: #fff1b6;
}
.arena-transition-skip:active {
  transform: scale(0.97);
}
.arena-transition-skip:focus-visible {
  outline: 3px solid #2454bf;
  outline-offset: 4px;
  box-shadow: 0 0 0 7px #fff;
}
.arena-transition-skip:disabled {
  opacity: 0.65;
  cursor: wait;
}
.arena-transition-key {
  padding: 1px 8px;
  border-radius: 6px;
  background: #f6f9ff;
  font-size: 12px;
}
@media (max-width: 576px) {
  .arena-transition {
    padding: 18px 18px 140px;
  }
  .arena-transition-card {
    flex-direction: column;
    gap: 20px;
    padding: 24px 18px;
    text-align: center;
  }
  .arena-transition-ball {
    flex-basis: auto;
    width: clamp(100px, 22vmin, 132px);
  }
  .arena-transition h2 {
    font-size: clamp(29px, 8vw, 38px);
  }
  .arena-transition-eyebrow {
    font-size: 11px;
    letter-spacing: 1px;
  }
  .arena-transition-message p:last-child {
    font-size: 14px;
  }
}
@media (max-height: 600px) and (min-width: 577px) {
  .arena-transition {
    padding-bottom: 120px;
  }
  .arena-transition-card {
    padding: 20px 30px;
  }
  .arena-transition-ball {
    flex-basis: 100px;
    width: 100px;
  }
  .arena-transition h2 {
    font-size: 34px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .arena-transition *,
  .arena-transition *::before,
  .arena-transition *::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
