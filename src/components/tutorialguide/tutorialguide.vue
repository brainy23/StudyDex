<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const emit = defineEmits(['done'])

// Each tutorial step: page highlight n mewtwo dialogue
const steps = [
  { target: '', text: 'Welcome to StudyDex Town! I am Mewtwo, your guide. Let me show you around.' },
  { target: '.sd-hud', text: 'This is the town clock. The town changes from day to night, just like real time.' },
  { target: '.trainer-hud', text: 'This is your Trainer Profile. You can see your name and your buddy here.' },
  { target: '.town-buddy', text: 'This is your Pokémon buddy! Study hard and it will grow stronger.' },
  { target: '.building-button:nth-child(2)', text: 'The Poké Lab is where you study your flashcard decks.' },
  { target: '.building-button:nth-child(1)', text: 'The Poké Arena is where you take quizzes and battle bosses.' },
  { target: '.building-button:nth-child(3)', text: 'The Trainer House is where you check your progress.' },
  { target: '.quest-toggle', text: 'Open the Trainer Hub to write your to-dos and choose your buddy.' },
  { target: '.sd-navbar', text: 'Use this bar to jump to Study, Quiz, To-Do List or your Bag.' },
  { target: '', text: 'You can study up to 4 sessions a day. Have fun, Trainer!' },
]

// mewtwo from the api
const POKE_API_URL = import.meta.env.VITE_POKE_API_URL || 'https://pokeapi.co/api/v2'
const mewtwo = ref('')

onMounted(async () => {
  try {
    const { data } = await axios.get(`${POKE_API_URL}/pokemon/mewtwo/`)
    mewtwo.value = data.sprites.other['official-artwork'].front_default
  } catch (error) {
    console.error('Unable to load Mewtwo:', error)
  }
})

const index = ref(0)
const step = computed(() => steps[index.value])

// Find where the highlighted part is on the screen
const spot = computed(() => {
  const el = step.value.target && document.querySelector(step.value.target)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 }
})

// If the highlight is low on the screen, show the text box at the top instead
const showAtTop = computed(() => spot.value && spot.value.top > window.innerHeight / 2)

function next() {
  if (index.value < steps.length - 1) index.value++
  else finish()
}

function back() {
  if (index.value > 0) index.value--
}

function finish() {
  localStorage.setItem('studydex-tutorial-done', 'true')
  emit('done')
}
</script>

<template>
  <div class="tutorial">
    <!-- dark screen (when nothing is highlighted) -->
    <div class="dark" :class="{ 'is-dim': !spot }"></div>

    <!-- yellow highlight box -->
    <div
      v-if="spot"
      class="spotlight"
      :style="{ top: spot.top + 'px', left: spot.left + 'px', width: spot.width + 'px', height: spot.height + 'px' }"
    ></div>

    <!-- Mewtwo + text box -->
    <div class="scene" :class="{ 'at-top': showAtTop }">
      <img v-if="mewtwo" class="teacher" :src="mewtwo" alt="Mewtwo" />

      <div class="box">
        <span class="name">MEWTWO</span>
        <p>{{ step.text }}</p>

        <div class="buttons">
          <span class="count">{{ index + 1 }} / {{ steps.length }}</span>
          <button class="skip" @click="finish">Skip</button>
          <button :disabled="index === 0" @click="back">Back</button>
          <button class="next" @click="next">{{ index === steps.length - 1 ? "Let's go!" : 'Next' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tutorial {
  position: fixed;
  inset: 0;
  z-index: 3000;
  font-family: 'Fredoka', sans-serif;
}

.dark {
  position: absolute;
  inset: 0;
}

.dark.is-dim {
  background: rgba(3, 9, 28, 0.4);
}

/* the big shadow darkens everything except the highlight */
.spotlight {
  position: absolute;
  border: 3px solid #ffd117;
  border-radius: 18px;
  box-shadow: 0 0 0 9999px rgba(3, 9, 28, 0.4);
  transition: all 0.3s;
}

.scene {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 24px;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  max-width: 950px;
  margin: 0 auto;
}

.scene.at-top {
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
  font-size: 14px;
  font-weight: 700;
}

.box p {
  margin: 10px 0 14px;
  font-size: 19px;
}

.buttons {
  display: flex;
  align-items: center;
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
  font: 500 16px 'Fredoka', sans-serif;
  cursor: pointer;
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