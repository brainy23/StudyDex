<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useFlashcardReview } from '../../composables/useFlashcardReview'
import { studyErrorMessage } from '../../services/studyService'
import StudyImage from './StudyImage.vue'

const props = defineProps({
  resource: { type: Object, required: true },
  arenaBusy: { type: Boolean, default: false },
})
defineEmits(['retry', 'mode', 'arena', 'topics'])
const content = ref(null)
const { cards, queue, remembered, reviews, flipped, current, complete, start, rate } =
  useFlashcardReview()
const cardNumber = computed(() => cards.value.findIndex((card) => card.id === current.value?.id) + 1)
watch(
  () => props.resource.data,
  (source) => {
    if (source) start(source)
  },
  { immediate: true },
)

async function focusCard() {
  await nextTick()
  content.value?.querySelector('.study-flip-card, .study-completion h3')?.focus()
}

function reviewCard(choice) {
  rate(choice)
  focusCard()
}

function restartDeck() {
  start(cards.value)
  focusCard()
}
</script>

<template>
  <div ref="content" class="study-flashcards">
    <h2>Flashcard Revision</h2>
    <p v-if="resource.loading" class="study-loading" role="status">Loading flashcards…</p>
    <div v-else-if="resource.error" class="study-message" role="alert">
      <p>{{ studyErrorMessage(resource.error, 'Flashcards') }}</p>
      <button class="study-button" @click="$emit('retry')">Try again</button>
    </div>
    <div v-else-if="!cards.length" class="study-empty">
      <p>There are no flashcards for this topic yet.</p>
      <p>You can keep learning from its concepts and worked examples.</p>
      <button class="study-button" @click="$emit('mode', 'learn')">Back to Learn</button>
    </div>
    <div v-else-if="complete" class="study-completion">
      <h3 tabindex="-1">Flashcards Completed!</h3>
      <p>{{ remembered.length }} unique cards remembered · {{ reviews }} total review attempts</p>
      <p>Great practice! Take your next step when you feel ready.</p>
      <p class="study-note">This revision progress is kept for this visit only.</p>
      <div class="study-button-row">
        <button class="study-button" @click="$emit('topics')">Revise Another Topic</button>
        <button class="study-button" :disabled="arenaBusy" @click="$emit('arena')">Go to Poké Arena</button>
      </div>
      <button class="study-button study-button-secondary" @click="restartDeck">Restart Deck</button>
    </div>
    <template v-else-if="current">
      <p class="study-card-position">Card {{ cardNumber }} of {{ cards.length }}</p>
      <p class="study-review-progress">
        {{ remembered.length }} / {{ cards.length }} remembered · {{ queue.length }} still to review
      </p>
      <progress :value="remembered.length" :max="cards.length" aria-label="Cards remembered" />
      <button
        type="button"
        class="study-flip-card"
        :class="{ 'is-flipped': flipped }"
        :aria-pressed="flipped"
        :aria-label="
          flipped ? `${current.back_text}. Show question` : `${current.front_text}. Reveal answer`
        "
        @click="flipped = !flipped"
      >
        <span :key="current.id" class="study-card-inner">
          <span class="study-card-face study-card-front" :aria-hidden="flipped">
            <span class="study-eyebrow">Question</span>
            <span class="study-card-text">{{ current.front_text }}</span>
            <StudyImage :path="current.front_image_path || ''" alt="Question illustration" />
            <span class="study-note">Click or press Enter to reveal the answer</span>
          </span>
          <span class="study-card-face study-card-back" :aria-hidden="!flipped">
            <span class="study-eyebrow">Answer</span>
            <span class="study-card-text">{{ current.back_text }}</span>
            <StudyImage :path="current.back_image_path || ''" alt="Answer illustration" />
            <span class="study-note">How well did you remember it?</span>
          </span>
        </span>
      </button>
      <div v-if="flipped" class="study-button-row study-ratings">
        <button class="study-button study-remembered" @click="reviewCard('remembered')">
          I Remembered
        </button>
        <button class="study-button study-button-secondary" @click="reviewCard('practise')">
          Practise Again
        </button>
      </div>
      <p class="study-note">
        Reveal the answer, then choose I Remembered or Practise Again.
      </p>
      <p class="study-note">Revision progress is kept for this visit only.</p>
    </template>
  </div>
</template>
