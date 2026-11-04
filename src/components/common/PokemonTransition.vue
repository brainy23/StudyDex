<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useId, watch } from 'vue'
import { usePokemonTransition } from '../../composables/usePokemonTransition'

const props = defineProps({ controller: { type: Object, default: () => usePokemonTransition() } })
const { state, presented, skipAnimation, reduceMotion, cancel } = props.controller
const dialog = ref(null)
const skipButton = ref(null)
const id = useId()
let motionQuery
let scrollState
let trigger
const isStatic = computed(() => state.reducedMotion || state.skipping)
const status = computed(() =>
  state.phase === 'reveal'
    ? 'Ready!'
    : state.destination
      ? `Opening ${state.destination}…`
      : 'Getting things ready…',
)

function motionChanged(event) {
  if (event.matches && state.active) reduceMotion()
}
function unlockScroll() {
  if (!scrollState) return
  document.body.style.overflow = scrollState.body
  document.documentElement.style.overflow = scrollState.html
  scrollState = null
}
watch(
  () => [state.active, state.sequence],
  async ([active, sequence], _, onCleanup) => {
    let stopped = false
    let firstFrame, secondFrame
    onCleanup(() => {
      stopped = true
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    })
    if (!active) {
      dialog.value?.close()
      unlockScroll()
      await nextTick()
      if (stopped || state.active) return
      if (state.outcome === 'completed') {
        const heading = document.querySelector('main h1, main h2, main [role="heading"]')
        if (heading) {
          heading.setAttribute('tabindex', '-1')
          heading.focus({ preventScroll: true })
        } else if (trigger?.isConnected) trigger.focus({ preventScroll: true })
      } else if (trigger?.isConnected) trigger.focus({ preventScroll: true })
      return
    }
    trigger = document.activeElement
    if (!scrollState) {
      scrollState = {
        body: document.body.style.overflow,
        html: document.documentElement.style.overflow,
      }
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }
    await nextTick()
    if (stopped) return
    if (!dialog.value.open) dialog.value.showModal()
    if (motionQuery?.matches && !state.reducedMotion) reduceMotion()
    if (skipButton.value && !skipButton.value.disabled) skipButton.value.focus()
    else dialog.value.focus()
    // Begin the task/timeline only after the opaque host has reached a painted frame.
    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (!stopped) presented(sequence)
      })
    })
  },
  { flush: 'post', immediate: true },
)

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionQuery.addEventListener('change', motionChanged)
})
onUnmounted(() => {
  motionQuery?.removeEventListener('change', motionChanged)
  cancel()
  dialog.value?.close()
  unlockScroll()
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="pokemon-transition"
      :class="{ 'is-static': isStatic }"
      :style="{ '--transition-time-scale': state.durationScale }"
      :data-phase="state.phase"
      :aria-labelledby="`${id}-title`"
      :aria-describedby="`${id}-description`"
      @cancel.prevent="skipAnimation"
    >
      <div v-if="state.active" :key="state.sequence" class="transition-content">
        <div class="transition-backdrop" aria-hidden="true"></div>
        <div class="transition-shutter shutter-top" aria-hidden="true"></div>
        <div class="transition-shutter shutter-bottom" aria-hidden="true"></div>
        <section class="transition-card">
          <div class="transition-ball" aria-hidden="true"><span class="ball-center"></span></div>
          <div class="transition-message">
            <p v-if="state.source || state.destination" class="transition-eyebrow">
              <template v-if="state.source"
                >{{ state.source }}
                <span v-if="state.destination" aria-hidden="true">→</span></template
              >
              {{ state.destination }}
            </p>
            <h2 :id="`${id}-title`">{{ state.title }}</h2>
            <p :id="`${id}-description`">
              {{ state.description || 'Your next adventure is getting ready.' }}
            </p>
          </div>
        </section>
        <footer class="transition-controls">
          <p class="transition-status" role="status" aria-live="polite">{{ status }}</p>
          <button
            ref="skipButton"
            type="button"
            :disabled="state.skipping || state.reducedMotion"
            @click="skipAnimation"
          >
            {{ isStatic ? 'Loading…' : 'Skip animation' }}
          </button>
          <span v-if="!isStatic" class="transition-key">or press Esc</span>
        </footer>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.pokemon-transition {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  border: 0;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  padding: 24px 24px 140px;
  overflow: auto;
  isolation: isolate;
  color: #fff;
  background: transparent;
  font-family: 'Fredoka', system-ui, sans-serif;
}
.pokemon-transition:not([open]) {
  display: none;
}
.pokemon-transition::backdrop {
  background: transparent;
}
.transition-content {
  display: contents;
}
.transition-backdrop {
  position: absolute;
  inset: 0;
  background: #112b45;
  transition: opacity calc(0.5s * var(--transition-time-scale, 1)) ease-in-out;
}
.transition-shutter {
  position: absolute;
  left: -5%;
  width: 110%;
  height: 57%;
  z-index: 1;
  overflow: hidden;
  transition: transform calc(0.5s * var(--transition-time-scale, 1)) cubic-bezier(0.22, 1, 0.36, 1);
}
.shutter-top {
  top: 0;
  background: #e45f61;
  clip-path: polygon(0 0, 100% 0, 100% 83%, 0 100%);
  animation: shutter-top-in calc(0.35s * var(--transition-time-scale, 1))
    cubic-bezier(0.22, 1, 0.36, 1) both;
}
.shutter-bottom {
  bottom: 0;
  background: #eff5ff;
  clip-path: polygon(0 17%, 100% 0, 100% 100%, 0 100%);
  animation: shutter-bottom-in calc(0.35s * var(--transition-time-scale, 1))
    cubic-bezier(0.22, 1, 0.36, 1) both;
}
.transition-shutter::after {
  content: '';
  position: absolute;
  left: -5%;
  width: 110%;
  height: 10px;
  transform: rotate(-5deg);
}
.shutter-top::after {
  bottom: 16%;
  background: #ffd841;
  box-shadow: 0 -18px 0 #17324d22;
}
.shutter-bottom::after {
  top: 16%;
  background: #17324d;
  box-shadow: 0 18px 0 #17324d15;
}
.transition-card {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: clamp(24px, 4vw, 48px);
  width: min(100%, 850px);
  box-sizing: border-box;
  padding: clamp(26px, 4vw, 44px);
  border-block: 4px solid #ffd841;
  border-radius: 18px 4px;
  background: #17324d;
  box-shadow: 0 16px 40px #112b4544;
  transition:
    opacity calc(0.15s * var(--transition-time-scale, 1)) ease-out,
    transform calc(0.15s * var(--transition-time-scale, 1)) ease-out;
}
[data-phase='cover'] .transition-card {
  opacity: 0;
  transform: translateY(16px) scale(0.94);
}
.transition-ball {
  position: relative;
  flex: 0 0 clamp(124px, 20vmin, 172px);
  width: clamp(124px, 20vmin, 172px);
  aspect-ratio: 1;
  box-sizing: border-box;
  border: 8px solid #10283e;
  border-radius: 50%;
  background: linear-gradient(#ef686b 0 44%, #10283e 44% 56%, #f6f9ff 56%);
  box-shadow:
    0 0 0 3px #ffdf5d,
    0 8px 24px #08192955;
}
[data-phase='loading'] .transition-ball {
  animation: ball-enter calc(0.8s * var(--transition-time-scale, 1)) ease-out both;
}
.ball-center {
  position: absolute;
  inset: 31%;
  border: 7px solid #10283e;
  border-radius: 50%;
  background: #f6f9ff;
}
.ball-center::after {
  content: '';
  position: absolute;
  inset: 20%;
  border-radius: 50%;
  background: #ffd841;
}
.transition-message {
  min-width: 0;
  overflow-wrap: anywhere;
}
.transition-eyebrow {
  margin: 0 0 10px;
  color: #ffe276;
  font-size: 14px;
  font-weight: 550;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.transition-eyebrow span {
  padding-inline: 8px;
}
h2 {
  margin: 0 0 16px;
  color: #fff;
  font-size: clamp(32px, 4.5vw, 56px);
  font-weight: 650;
  line-height: 1.08;
  text-wrap: balance;
}
.transition-message p:last-child {
  margin-bottom: 0;
  font-size: 15px;
}
.transition-controls {
  position: absolute;
  z-index: 3;
  bottom: max(20px, env(safe-area-inset-bottom));
  left: 20px;
  right: 20px;
  display: grid;
  justify-items: center;
  gap: 8px;
  color: #17324d;
  text-align: center;
}
.transition-status {
  margin: 0;
  padding: 5px 14px;
  border-radius: 12px;
  background: #17324d;
  color: white;
  font-size: 14px;
}
button {
  min-height: 44px;
  padding: 10px 24px;
  border: 2px solid #a98608;
  border-radius: 12px;
  background: #ffd841;
  color: #302700;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: #fff1b6;
}
button:focus-visible {
  outline: 3px solid #2454bf;
  outline-offset: 4px;
  box-shadow: 0 0 0 7px #fff;
}
button:disabled {
  cursor: wait;
}
.transition-key {
  padding: 1px 8px;
  border-radius: 6px;
  background: #f6f9ff;
  font-size: 12px;
}
[data-phase='reveal'] .transition-backdrop {
  opacity: 0;
}
[data-phase='reveal'] .shutter-top {
  animation: none;
  transform: translateY(-110%);
}
[data-phase='reveal'] .shutter-bottom {
  animation: none;
  transform: translateY(110%);
}
[data-phase='reveal'] .transition-card {
  opacity: 0;
  transform: translateY(-16px) scale(1.04);
}
.is-static *,
.is-static *::before,
.is-static *::after {
  animation: none !important;
  transition: none !important;
}
.is-static .transition-card {
  opacity: 1;
  transform: none;
}
@keyframes shutter-top-in {
  from {
    transform: translateX(-105%);
  }
  to {
    transform: translateX(0);
  }
}
@keyframes shutter-bottom-in {
  from {
    transform: translateX(105%);
  }
  to {
    transform: translateX(0);
  }
}
@keyframes ball-enter {
  0% {
    transform: rotate(-38deg) scale(0.72);
  }
  45% {
    transform: rotate(22deg) scale(1.1);
  }
  75% {
    transform: rotate(-7deg) scale(0.98);
  }
  100% {
    transform: rotate(0) scale(1);
  }
}
@media (max-width: 576px) {
  .pokemon-transition {
    padding: 18px 18px 140px;
  }
  .transition-card {
    flex-direction: column;
    gap: 20px;
    padding: 24px 18px;
    text-align: center;
  }
  .transition-ball {
    flex-basis: auto;
    width: clamp(100px, 22vmin, 132px);
  }
  h2 {
    font-size: clamp(29px, 8vw, 38px);
  }
  .transition-eyebrow {
    font-size: 11px;
    letter-spacing: 1px;
  }
}
@media (max-height: 600px) and (min-width: 577px) {
  .pokemon-transition {
    padding-bottom: 120px;
  }
  .transition-card {
    padding: 20px 30px;
  }
  .transition-ball {
    flex-basis: 100px;
    width: 100px;
  }
  h2 {
    font-size: 34px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pokemon-transition *,
  .pokemon-transition *::before,
  .pokemon-transition *::after {
    animation: none !important;
    transition: none !important;
  }
  .transition-card {
    opacity: 1 !important;
    transform: none !important;
  }
}
</style>
