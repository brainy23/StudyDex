<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

const emit = defineEmits(['done'])

// Tutorial dialogue shown by Mewtwo
const tutorialSteps = [
  {
    target: '',
    text: 'Welcome to StudyDex Town! I am Mewtwo, your guide. Let me show you around.'
  },
  {
    target: '.sd-hud',
    text: 'This is the town clock. The town changes from day to night, just like real time.'
  },
  {
    target: '.trainer-hud',
    text: 'This is your Trainer Profile. You can see your name and your buddy here.'
  },
  {
    target: '.town-buddy',
    text: 'This is your Pokémon buddy. Study hard to earn xp and it will grow stronger!'
  },
  {
    target: '.building-button:nth-child(2)',
    text: 'The Poké Lab is where you study your flashcard decks.'
  },
  {
    target: '.building-button:nth-child(1)',
    text: 'The Poké Arena is where you take quizzes and battle bosses.'
  },
  {
    target: '.building-button:nth-child(3)',
    text: 'The Trainer House is where you check your progress.'
  },
  {
    target: '.quest-toggle',
    text: 'Open the Trainer Hub to write your to-dos and choose your buddy.'
  },
  {
    target: '.sd-navbar',
    text: 'Use this navigation bar to jump to Study, Quiz, To-Do List or your Bag.'
  },
  {
    target: '',
    text: 'You can study up to 4 sessions a day. Have fun, and remember to take breaks!'
  }
]

const currentStep = ref(0)
const mewtwoImage = ref('')

// Get Mewtwo artwork from PokéAPI
async function loadMewtwo() {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_POKE_API_URL}/pokemon/mewtwo/`
    )

    mewtwoImage.value =
      response.data.sprites.other['official-artwork'].front_default
  } catch (error) {
    console.error('Unable to load Mewtwo artwork:', error)
  }
}

loadMewtwo()

const highlightedArea = computed(() => {
  const selector = tutorialSteps[currentStep.value].target

  if (!selector) {
    return null
  }

  const element = document.querySelector(selector)

  if (!element) {
    console.error(`Unable to find element: ${selector}`)
    return null
  }

  return element.getBoundingClientRect() // get the highlighted areas numbers
})

function nextStep() {
  if (currentStep.value < tutorialSteps.length - 1) {
    currentStep.value++
  } else {
    endTutorial()
  }
}

function endTutorial() {
  try {
    localStorage.setItem('studydex-tutorial-done', 'true')
  } catch (error) {
    console.error('Unable to save tutorial progress:', error)
  } emit('done')
}
</script>

<template>
  <div class="tutorial" :class="{ dim: !highlightedArea }">

    <div
      v-if="highlightedArea"
      class="spotlight"
      :style="{
        top: highlightedArea.top + 'px',
        left: highlightedArea.left + 'px',
        width: highlightedArea.width + 'px',
        height: highlightedArea.height + 'px'
      }"
    />

    <div
      class="scene"
      :class="{ top: highlightedArea && highlightedArea.top > 300 }"
    >
      <img
        v-if="mewtwoImage"
        :src="mewtwoImage"
        alt="Mewtwo"
        class="teacher"
      />

      <div class="box">
        <span class="name">MEWTWO</span>

        <p>{{ tutorialSteps[currentStep].text }}</p>

        <div class="buttons">
          <span class="count">
            {{ currentStep + 1 }} / {{ tutorialSteps.length }}
          </span>

          <button class="skip" @click="endTutorial">
            Skip
          </button>

          <button
            :disabled="currentStep === 0"
            @click="currentStep--"
          >
            Back
          </button>

          <button
            class="next"
            @click="nextStep"
          >
            {{
              currentStep === tutorialSteps.length - 1
                ? "Let's go!"
                : 'Next'
            }}
          </button>
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
  white-space: nowrap; /* keep "1 / 10" on one line */
}



button {
  min-height: var(--tap-min);
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

/* Below lg: Mewtwo sits small above the dialog, so the sprite never covers
   the Study button or the dock, and the dialog stays inside the screen.
   (At sm-md the full-size sprite still landed on the Study button.) */
@media (max-width: 991.98px) {
  .scene {
    left: 16px;
    right: 16px;
    bottom: 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .scene.top {
    top: 16px;
  }

  .teacher {
    width: 48px;
  }

  .box {
    flex: none;
    width: 100%;
    max-width: calc(100vw - 32px);
    padding: 12px 14px;
  }

  .box p {
    font-size: var(--text-md);
  }

  .buttons {
    align-items: center;
  }
}
</style>
