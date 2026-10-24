<script setup>
import { computed, reactive, ref } from 'vue'
import { studyErrorMessage } from '../../services/studyService'
import StudyQuestion from './StudyQuestion.vue'

const props = defineProps({
  resource: { type: Object, required: true },
  purpose: { type: String, default: 'quiz' },
  locked: { type: Boolean, default: false },
})
defineEmits(['retry', 'mode'])
const index = ref(0)
const answers = reactive({})
const reviewing = ref(false)
const questions = computed(() => props.resource.data || [])
const current = computed(() => questions.value[index.value])
const title = computed(() => (props.purpose === 'boss_battle' ? 'Boss Battle' : 'Topic Quiz'))
const allChosen = computed(
  () => questions.value.length && questions.value.every((question) => answers[question.id]),
)

function reviewQuestions() {
  reviewing.value = false
  index.value = 0
}
</script>

<template>
  <div class="study-quiz">
    <div class="study-button-row study-quiz-types" aria-label="Question set">
      <button
        class="study-button study-button-secondary"
        :aria-pressed="purpose === 'quiz'"
        @click="$emit('mode', 'quiz')"
      >
        Topic Quiz
      </button>
      <button
        class="study-button study-button-secondary"
        :aria-pressed="purpose === 'boss_battle'"
        @click="$emit('mode', 'boss_battle')"
      >
        Boss Battle
      </button>
    </div>
    <h2>{{ title }}</h2>
    <div v-if="locked" class="study-empty">
      <p>Finish this topic in Poké Lab to unlock its quiz.</p>
      <button class="study-button" @click="$emit('mode', 'study')">Study this topic</button>
    </div>
    <p v-else-if="resource.loading" role="status">Loading questions…</p>
    <div v-else-if="resource.error" class="study-message" role="alert">
      <p>{{ studyErrorMessage(resource.error, title) }}</p>
      <button class="study-button" @click="$emit('retry')">Try again</button>
    </div>
    <div v-else-if="!questions.length" class="study-empty">
      <p>
        {{
          purpose === 'boss_battle'
            ? 'There is no Boss Battle for this topic yet.'
            : 'There are no regular quiz questions for this topic yet.'
        }}
      </p>
      <div class="study-button-row">
        <button
          class="study-button"
          @click="$emit('mode', purpose === 'quiz' ? 'boss_battle' : 'learn')"
        >
          {{ purpose === 'quiz' ? 'View Boss Battle' : 'Revise in Poké Lab' }}
        </button>
      </div>
    </div>
    <template v-else>
      <p class="study-message">
        Assessment preview: answers are not graded or saved. Scores and rewards are not available yet.
      </p>
      <template v-if="reviewing">
        <h3>Your answer choices</h3>
        <ol class="study-answer-summary">
          <li v-for="question in questions" :key="question.id">
            <strong>{{ question.question_text }}</strong>
            <p>
              {{
                question.options.find((option) => option.id === answers[question.id])
                  ?.option_text || 'No answer chosen'
              }}
            </p>
          </li>
        </ol>
        <p class="study-note">
          Choices are kept for this visit only. They have not been submitted or graded.
        </p>
        <button class="study-button" @click="reviewQuestions">Review questions</button>
      </template>
      <template v-else-if="current">
        <p class="study-eyebrow">Question {{ index + 1 }} of {{ questions.length }}</p>
        <StudyQuestion
          :question="current"
          :selected="answers[current.id]"
          @select="answers[current.id] = $event"
        />
        <div class="study-button-row">
          <button
            class="study-button study-button-secondary"
            :disabled="index === 0"
            @click="index--"
          >
            Previous
          </button>
          <button
            v-if="index < questions.length - 1"
            class="study-button"
            :disabled="!answers[current.id]"
            @click="index++"
          >
            Next question
          </button>
          <button v-else class="study-button" :disabled="!allChosen" @click="reviewing = true">
            Review my choices
          </button>
        </div>
      </template>
    </template>
  </div>
</template>
