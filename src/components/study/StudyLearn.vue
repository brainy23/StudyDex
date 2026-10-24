<script setup>
import { computed, reactive, ref } from 'vue'
import { studyErrorMessage } from '../../services/studyService'
import StudyQuestion from './StudyQuestion.vue'

const props = defineProps({
  topic: { type: Object, required: true },
  resource: { type: Object, required: true },
})
const emit = defineEmits(['progress', 'complete', 'mode', 'retry', 'arena'])
const step = ref(-1)
const completedIds = ref([])
const answers = reactive({})
const finished = ref(false)
const lesson = computed(() => props.resource.data)
const concepts = computed(() => lesson.value?.concepts || [])
const concept = computed(() => concepts.value[step.value])
const checks = computed(() =>
  (lesson.value?.questions || []).filter((question) => question.concept_id === concept.value?.id),
)
const needsChoice = computed(() =>
  checks.value.some((question) => question.options.length && !answers[question.id]),
)

function next() {
  if (!concept.value || needsChoice.value) return
  if (!completedIds.value.includes(concept.value.id)) completedIds.value.push(concept.value.id)
  emit('progress', { read: completedIds.value.length, total: concepts.value.length })
  if (step.value < concepts.value.length - 1) step.value++
  else {
    finished.value = true
    emit('complete', props.topic.id)
  }
}

function readAgain() {
  finished.value = false
  step.value = -1
}
</script>

<template>
  <div class="study-learn">
    <p v-if="resource.loading" role="status">Loading your lesson…</p>
    <div v-else-if="resource.error" class="study-message" role="alert">
      <p>{{ studyErrorMessage(resource.error, 'Your lesson') }}</p>
      <button class="study-button" @click="$emit('retry')">Try again</button>
    </div>
    <template v-else-if="lesson">
      <div v-if="lesson.errors.concepts" class="study-message" role="alert">
        <p>{{ studyErrorMessage(lesson.errors.concepts, 'Lesson concepts') }}</p>
        <button class="study-button" @click="$emit('retry')">Try again</button>
      </div>
      <div v-else-if="finished" class="study-completion">
        <p class="study-eyebrow">Topic reading complete</p>
        <h2>You have explored {{ topic.name }}!</h2>
        <p>{{ completedIds.length }} of {{ concepts.length }} concepts read. Ready to practise?</p>
        <div class="study-button-row">
          <button class="study-button" @click="$emit('mode', 'flashcards')">
            Flashcard Revision
          </button>
          <button class="study-button" @click="$emit('arena')">Quiz me!</button>
          <button class="study-button study-button-secondary" @click="readAgain">Read again</button>
        </div>
      </div>
      <div v-else-if="step === -1" class="study-overview">
        <p class="study-eyebrow">Topic overview</p>
        <h2>{{ topic.name }}</h2>
        <p v-if="topic.description" class="study-copy">{{ topic.description }}</p>
        <h3>Your learning goals</h3>
        <p v-if="lesson.errors.goals" class="study-message" role="alert">
          {{ studyErrorMessage(lesson.errors.goals, 'Learning goals') }}
        </p>
        <ol v-else-if="lesson.goals.length" class="study-goals">
          <li v-for="goal in lesson.goals" :key="goal.id">{{ goal.goal_text }}</li>
        </ol>
        <p v-else class="study-note">Learning goals have not been added for this topic yet.</p>
        <p v-if="!concepts.length" class="study-message">
          This topic has no lesson concepts yet. Choose another topic or check back later.
        </p>
        <template v-else>
          <p class="study-note">{{ concepts.length }} concepts · Learn at your own pace</p>
          <button class="study-button" @click="step = 0">Start learning</button>
        </template>
      </div>
      <article v-else-if="concept" class="study-concept" :aria-labelledby="`concept-${concept.id}`">
        <p class="study-eyebrow">Concept {{ step + 1 }} of {{ concepts.length }}</p>
        <h2 :id="`concept-${concept.id}`">{{ concept.title }}</h2>
        <p class="study-copy">{{ concept.explanation_text }}</p>
        <section v-if="concept.example_text" class="study-example">
          <h3>Worked example</h3>
          <p class="study-copy">{{ concept.example_text }}</p>
        </section>
        <section class="study-check" aria-label="Understanding check">
          <h3>Quick check</h3>
          <p v-if="lesson.errors.questions" class="study-message" role="alert">
            {{ studyErrorMessage(lesson.errors.questions, 'Quick checks') }}
          </p>
          <template v-else-if="checks.length">
            <p class="study-note">
              Choose an answer to think it through. These understanding checks are ungraded.
            </p>
            <StudyQuestion
              v-for="question in checks"
              :key="question.id"
              :question="question"
              :selected="answers[question.id]"
              @select="answers[question.id] = $event"
            />
          </template>
          <p v-else class="study-note">There is no quick check for this concept yet.</p>
        </section>
        <div class="study-button-row study-concept-navigation">
          <button class="study-button study-button-secondary" @click="step--">
            {{ step === 0 ? 'Topic overview' : 'Previous concept' }}
          </button>
          <button class="study-button" :disabled="needsChoice" @click="next">
            {{ step === concepts.length - 1 ? 'Finish topic' : 'Next concept' }}
          </button>
        </div>
        <p v-if="needsChoice" class="study-note">Choose an answer above to continue.</p>
      </article>
    </template>
  </div>
</template>
