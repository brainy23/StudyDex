<script setup>
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import axios from 'axios'
import { DialogContent, DialogDescription, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { pokemonUrl } from '../../lib/pokeapi'

const emit = defineEmits(['done'])

// all steps + highlight + mewtwo dialogue
const steps = [
  { target: '', text: 'Welcome to StudyDex Town! I am Mewtwo, your guide. Let me show you around.' },
  { target: '.sd-hud', text: 'This is the town clock. The town changes from day to night, just like real time.' },
  { target: '.trainer-hud', text: 'This is your Trainer Profile. You can see your name and your buddy here.' },
  { target: '.town-buddy', text: 'This is your Pokémon buddy, here to keep you company while you learn.' },
  { target: '.building-button:nth-child(2)', text: 'Visit Poké Lab to learn concepts, explore examples, and revise with flashcards.' },
  { target: '.building-button:nth-child(1)', text: 'Visit Poké Arena to preview Topic Quiz and Boss Battle questions. Grading and rewards are not connected yet.' },
  { target: '.building-button:nth-child(3)', text: 'The Trainer House is where you check your progress.' },
  { target: '.quest-toggle', text: 'Open the Trainer Hub to write your to-dos and choose your buddy.' },
  { target: '.sd-navbar', text: 'Use this navigation bar to jump to Study, Quiz, To-Do List or your Bag.' },
  { target: '', text: 'Aim for four focus blocks a day, with breaks in between. Have fun learning!' },
]
const index = ref(0)

// Mewtwo picture from PokéAPI
const mewtwo = ref('')
const controller = new AbortController()
onMounted(async () => {
  try {
    const { data } = await axios.get(pokemonUrl('mewtwo'), { signal: controller.signal, timeout: 12000 })
    if (!controller.signal.aborted) mewtwo.value = data?.sprites?.other?.['official-artwork']?.front_default || data?.sprites?.front_default || ''
  } catch { /* The tutorial remains usable without its decorative guide image. */ }
})

// Position of the part to highlight
const spot = ref(null)
function updateSpot() {
  const target = steps[index.value].target
  spot.value = target ? document.querySelector(target)?.getBoundingClientRect() : null
}
watch(index, () => nextTick(updateSpot))
onMounted(() => {
  updateSpot()
  window.addEventListener('resize', updateSpot)
  window.addEventListener('scroll', updateSpot, true)
})
onUnmounted(() => {
  controller.abort()
  window.removeEventListener('resize', updateSpot)
  window.removeEventListener('scroll', updateSpot, true)
})

function next() {
  if (index.value < steps.length - 1) index.value++
  else finish()
}

function finish() {
  try { localStorage.setItem('studydex-tutorial-done', 'true') } catch { /* Completion also works without storage. */ }
  emit('done')
}
</script>

<template>
  <DialogRoot :open="true">
  <DialogPortal>
  <DialogContent class="tutorial" :class="{ dim: !spot }" @escape-key-down.prevent="finish" @interact-outside.prevent>
    <DialogTitle class="visually-hidden">StudyDex Town Tutorial</DialogTitle>
    <!-- yellow highlight -->
    <div
      v-if="spot"
      class="spotlight"
      :style="{ top: spot.top + 'px', left: spot.left + 'px', width: spot.width + 'px', height: spot.height + 'px' }"
    ></div>

    <!-- Mewtwo + text box (moves to the top if the highlight is low on the screen) -->
    <div class="scene" :class="{ top: spot && spot.top > 300 }">
      <img v-if="mewtwo" :src="mewtwo" alt="Mewtwo" class="teacher" />

      <div class="box">
        <span class="name">MEWTWO</span>
        <DialogDescription aria-live="polite">{{ steps[index].text }}</DialogDescription>

        <div class="buttons">
          <span class="count">{{ index + 1 }} / {{ steps.length }}</span>
          <button class="skip" @click="finish">Skip</button>
          <button :disabled="index === 0" @click="index--">Back</button>
          <button class="next" @click="next">
            {{ index === steps.length - 1 ? "Let's go!" : 'Next' }} </button>
        </div>
      </div>
    </div>
  </DialogContent>
  </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.tutorial {
  position: fixed;
  inset: 0;
  z-index: 3000;
  font-family: 'Fredoka', sans-serif;
}

@media (prefers-reduced-motion: reduce) {
  .spotlight { transition: none !important; animation: none !important; }
}
@media (max-width: 600px) {
  .scene { left: 12px; right: 12px; bottom: 12px; gap: 0; }
  .teacher { display: none; }
  .box { min-width: 0; padding: 16px; }
  .box p { font-size: 16px; }
  .buttons { flex-wrap: wrap; }
  .buttons button { min-height: 44px; padding: 8px 12px; }
}

/* darken the screen when nothing is highlighted */
.tutorial.dim {
  background: rgba(3, 9, 28, 0.4);
}

/* yellow outline + huge shadow that darkens everything else */
.spotlight {
  position: absolute;
  border-radius: 16px;
  outline: 3px solid #ffd117;
  outline-offset: 6px;
  box-shadow: 0 0 0 9999px rgba(3, 9, 28, 0.4);

  /* slide to the next part, and pulse while waiting */
  transition: top 0.4s, left 0.4s, width 0.4s, height 0.4s;
  animation: pulse 1.5s ease-in-out infinite;
}



.scene {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 24px;
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.scene.top {
  top: 24px;
  bottom: auto;
}

.teacher {
  width: 200px;
}

.box {
  flex: 1;
  padding: 16px 20px;
  border: 2px solid #ffd117;
  border-radius: 16px;
  background: rgba(7, 37, 120, 0.72);
  backdrop-filter: blur(10px);
  box-shadow: 3px 3px 6px #232323;
  color: white;
}

.name {
  padding: 2px 12px;
  border-radius: 10px;
  background: #ffd117;
  color: #072578;
  font-weight: 700;
}

.box p {
  font-size: 19px;
  margin: 10px 0;
}

.buttons {
  display: flex;
  gap: 8px;
}

.count {
  margin-right: auto;
  color: #ffd117;
}

button {
  padding: 6px 16px;
  border: 2px solid #ffd117;
  border-radius: 12px;
  background: rgba(7, 37, 120, 0.6);
  color: white;
  font-family: 'Fredoka', sans-serif;
}

button.next {
  background: #ffd117;
  color: #072578;
}

button.skip {
  border: none;
  background: none;
  text-decoration: underline;
}

button:disabled {
  opacity: 0.4;
}
</style>
