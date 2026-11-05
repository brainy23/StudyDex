<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  review: { type: Object, default: null },
  loading: Boolean,
  error: { type: String, default: '' },
})
const emit = defineEmits(['close', 'retry'])
const dialog = ref(null)
let previousFocus
const questions = computed(() => (props.review?.questions ?? []).map(question => {
  const answer = props.review?.review?.find(item => item.question_id === question.id)
  const optionText = id => question.options?.find(option => option.id === id)?.option_text
  return {
    id: question.id,
    text: question.question_text,
    userAnswer: optionText(answer?.selected_option_id) || 'Answer unavailable',
    correctAnswer: optionText(answer?.correct_option_id),
    correct: answer?.selected_option_id && answer?.correct_option_id
      ? answer.selected_option_id === answer.correct_option_id : null,
    explanation: answer?.explanation || 'No explanation was provided for this question.',
  }
}))
onMounted(async () => {
  previousFocus = document.activeElement
  await nextTick()
  dialog.value?.showModal()
})
onUnmounted(() => { if (previousFocus?.isConnected) previousFocus.focus() })
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="quiz-review-modal" aria-label="Quiz answer review"
      @cancel.prevent="emit('close')" @close="emit('close')"
      @click="event => { if (event.target === dialog) emit('close') }">
      <header class="review-header">
        <div>
          <p class="review-eyebrow">QUIZ PERFORMANCE</p>
          <h2>Quiz name: {{ review?.quizName || 'Quiz review' }}</h2>
          <p v-if="review && !loading && !error" class="review-score">
            {{ review.correct }} / {{ review.total }} correct · {{ review.scorePercent }}%
          </p>
        </div>
        <button type="button" class="review-close" aria-label="Close quiz review" autofocus @click="emit('close')">×</button>
      </header>
      <div class="review-body" :aria-busy="loading">
        <p v-if="loading" role="status">Loading your quiz answers…</p>
        <div v-else-if="error" role="alert">
          <p>{{ error }}</p>
          <button type="button" class="review-retry" @click="emit('retry')">Try again</button>
        </div>
        <template v-else-if="review">
          <p v-if="review.notice" class="review-notice">{{ review.notice }}</p>
          <ol v-if="questions.length" class="review-questions">
            <li v-for="(question, index) in questions" :key="question.id" class="review-question">
              <div class="review-question-heading">
                <h3>{{ index + 1 }}. {{ question.text }}</h3>
                <span class="review-verdict" :class="question.correct === null ? 'unavailable' : question.correct ? 'correct' : 'incorrect'">
                  {{ question.correct === null ? 'Result unavailable' : question.correct ? 'Correct' : 'Wrong' }}
                </span>
              </div>
              <p><strong>Your answer:</strong> {{ question.userAnswer }}</p>
              <p v-if="question.correct === false && question.correctAnswer"><strong>Correct answer:</strong> {{ question.correctAnswer }}</p>
              <p class="review-explanation"><strong>Explanation:</strong> {{ question.explanation }}</p>
            </li>
          </ol>
          <p v-else>No saved answers are available for this attempt.</p>
        </template>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.quiz-review-modal { width: min(760px, calc(100vw - 32px)); max-height: calc(100dvh - 40px); padding: 0; border: 3px solid #273d5b; border-radius: 22px; background: #fffdf4; color: #243850; box-shadow: 0 20px 70px #0005; font-family: 'Fredoka', sans-serif; }
.quiz-review-modal::backdrop { background: #102039b3; }
.review-header { position: sticky; top: 0; z-index: 1; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 20px 24px; background: #ffec9e; border-bottom: 2px solid #e6cf77; }
h2, h3, p { margin: 0; overflow-wrap: anywhere; }
h2 { font-size: 23px; line-height: 1.3; }
.review-eyebrow { margin-bottom: 6px; font-size: 12px; letter-spacing: .1em; }
.review-score { margin-top: 8px; }
.review-close, .review-retry { cursor: pointer; font: inherit; color: inherit; border: 2px solid #273d5b; background: white; border-radius: 10px; }
.review-close { flex: 0 0 36px; height: 36px; font-size: 26px; line-height: 1; }
.review-retry { margin-top: 12px; padding: 8px 16px; }
button:focus-visible { outline: 3px solid #3469aa; outline-offset: 3px; }
.review-body { padding: 20px 24px; }
.review-questions { list-style: none; padding: 0; margin: 0; display: grid; gap: 16px; }
.review-question { padding: 18px; border: 1px solid #d4dce2; border-radius: 14px; background: white; }
.review-question-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
h3 { font-size: 18px; line-height: 1.4; }
.review-question p + p { margin-top: 10px; }
.review-verdict { padding: 4px 10px; border-radius: 20px; font-size: 14px; white-space: nowrap; }
.correct { background: #d9f1dc; color: #23532b; }
.incorrect { background: #ffe1df; color: #8a2828; }
.unavailable { background: #ebedf0; }
.review-explanation { line-height: 1.5; }
.review-notice { margin-bottom: 16px; }
@media (max-width: 540px) { .review-header, .review-body { padding: 16px; } .review-question-heading { flex-direction: column; } h2 { font-size: 20px; } }
</style>
