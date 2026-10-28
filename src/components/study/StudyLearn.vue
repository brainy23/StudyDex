<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import { studyErrorMessage } from '../../services/studyService'
import { displayTitle } from '../../utils/displayText'
import StudyRoadmap from './StudyRoadmap.vue'
import InteractiveConcept from './InteractiveConcept.vue'

const props = defineProps({
  topic: { type: Object, required: true },
  resource: { type: Object, required: true },
  reviewConceptIds: { type: Array, default: () => [] },
  showOverview: { type: Boolean, default: false },
  arenaBusy: { type: Boolean, default: false },
})
const emit = defineEmits(['progress', 'complete', 'mode', 'retry', 'arena'])
const step = ref(-1)
const completedIds = ref([])
const finished = ref(false)
const content = ref(null)
const reducedMotion = useReducedMotion()
const direction = ref(1)
const transitionHeight = ref('')
const transitioning = ref(false)
let focusRequested = false
const lesson = computed(() => props.resource.data)
const concepts = computed(() =>
  [...(lesson.value?.concepts || [])].sort(
    (a, b) => (a.concept_order ?? Infinity) - (b.concept_order ?? Infinity),
  ),
)
const concept = computed(() => concepts.value[step.value])
const revisionConcepts = computed(() =>
  concepts.value.filter((item) => props.reviewConceptIds.includes(item.id)),
)
let appliedContext = ''

watch(
  () => [concepts.value, props.reviewConceptIds, props.showOverview],
  () => {
    if (!concepts.value.length) return
    const context = JSON.stringify([props.reviewConceptIds, props.showOverview])
    if (context === appliedContext) return
    appliedContext = context
    if (props.showOverview || props.reviewConceptIds.length) {
      finished.value = false
      const first =
        !props.showOverview &&
        props.reviewConceptIds.find((id) => concepts.value.some((item) => item.id === id))
      step.value = first ? concepts.value.findIndex((item) => item.id === first) : -1
    }
  },
  { immediate: true },
)

async function focusContent() {
  transitionHeight.value = ''
  transitioning.value = false
  if (!focusRequested) return
  await nextTick()
  const heading = content.value?.querySelector('h2')
  heading?.focus({ preventScroll: true })
  const roadmap = content.value?.querySelector('.study-roadmap-compact')
  const headingBounds = heading?.getBoundingClientRect()
  const roadmapBounds = roadmap?.getBoundingClientRect()
  if (
    headingBounds &&
    ((roadmapBounds?.top ?? headingBounds.top) < 0 || headingBounds.bottom > window.innerHeight)
  ) {
    // Keep the roadmap in view too, unless an expanded list fills the viewport.
    const target = roadmap && roadmapBounds.height < window.innerHeight - 100 ? roadmap : heading
    target.scrollIntoView({ block: 'start', behavior: reducedMotion.value ? 'auto' : 'smooth' })
  }
  focusRequested = false
}

function goTo(index) {
  if (index < -1 || index >= concepts.value.length) return
  direction.value = index < step.value ? -1 : 1
  focusRequested = true
  const unchanged = !finished.value && step.value === index
  finished.value = false
  step.value = index
  if (unchanged) focusContent()
}

function next() {
  if (!concept.value || transitioning.value) return
  direction.value = 1
  focusRequested = true
  if (!completedIds.value.includes(concept.value.id)) completedIds.value.push(concept.value.id)
  emit('progress', { read: completedIds.value.length, total: concepts.value.length })
  if (step.value < concepts.value.length - 1) step.value++
  else {
    finished.value = true
    emit('complete', props.topic.id)
  }
}

function holdHeight(element) {
  transitioning.value = true
  transitionHeight.value = `${element.offsetHeight}px`
}
</script>

<template>
  <div ref="content" class="study-learn">
    <p v-if="resource.loading" class="study-loading" role="status">Loading your lesson…</p>
    <div v-else-if="resource.error" class="study-message" role="alert">
      <p>{{ studyErrorMessage(resource.error, 'Your lesson') }}</p>
      <button class="study-button" @click="$emit('retry')">Try again</button>
    </div>
    <template v-else-if="lesson">
      <div v-if="lesson.errors.concepts" class="study-message" role="alert">
        <p>{{ studyErrorMessage(lesson.errors.concepts, 'Lesson concepts') }}</p>
        <button class="study-button" @click="$emit('retry')">Try again</button>
      </div>
      <template v-else>
        <p
          v-if="reviewConceptIds.length && !revisionConcepts.length"
          class="study-message"
          role="status"
        >
          Those concepts are unavailable in this topic. You can review the entire topic below.
        </p>
        <StudyRoadmap
          v-if="concept && !finished"
          compact
          :concepts="concepts"
          :current="step"
          :read-ids="completedIds"
          :review-ids="reviewConceptIds"
          @select="goTo"
        />
        <div
          class="study-lesson-stage"
          :style="{ minHeight: transitionHeight, '--study-slide': `${direction * 10}px` }"
        >
          <Transition
            name="study-lesson"
            mode="out-in"
            @before-leave="holdHeight"
            @after-enter="focusContent"
            @enter-cancelled="focusContent"
          >
            <div v-if="finished" key="completion" class="study-completion">
              <motion.div
                class="study-completion-emblem"
                :initial="reducedMotion ? false : { scale: 0.8, rotate: -15 }"
                :animate="{ scale: 1, rotate: 0 }"
                :transition="{ duration: reducedMotion ? 0 : 0.3, ease: 'easeOut' }"
                aria-hidden="true"
                >✦</motion.div
              >
              <p class="study-eyebrow">Topic reading complete</p>
              <h2 tabindex="-1">You have explored {{ displayTitle(topic.name) }}!</h2>
              <p>
                {{ completedIds.length }} of {{ concepts.length }} concepts read. Choose your next
                step.
              </p>
              <div class="study-button-row">
                <button class="study-button" @click="$emit('mode', 'flashcards')">
                  Review with Flashcards
                </button>
                <button class="study-button" :disabled="arenaBusy" @click="$emit('arena')">
                  Go to Poké Arena
                </button>
              </div>
              <button class="study-button study-button-secondary" @click="goTo(-1)">
                Revisit Concepts
              </button>
            </div>
            <div v-else-if="step === -1" key="overview" class="study-overview">
              <p class="study-eyebrow">Topic overview</p>
              <h2 tabindex="-1">{{ displayTitle(topic.name) }}</h2>
              <p v-if="topic.description" class="study-copy">{{ topic.description }}</p>
              <h3>Your learning goals</h3>
              <p v-if="lesson.errors.goals" class="study-message" role="alert">
                {{ studyErrorMessage(lesson.errors.goals, 'Learning goals') }}
              </p>
              <ol v-else-if="lesson.goals.length" class="study-goals">
                <li v-for="goal in lesson.goals" :key="goal.id">{{ goal.goal_text }}</li>
              </ol>
              <p v-else class="study-note">
                Learning goals have not been added for this topic yet.
              </p>
              <p v-if="!concepts.length" class="study-message">
                This topic has no lesson concepts yet. Choose another topic or check back later.
              </p>
              <template v-else>
                <StudyRoadmap
                  :concepts="concepts"
                  :read-ids="completedIds"
                  :review-ids="reviewConceptIds"
                  @select="goTo"
                />
                <p class="study-note study-start-note">
                  Learn at your own pace. Opening a concept does not mark it read.
                </p>
                <button class="study-button" @click="goTo(0)">Start Learning</button>
              </template>
            </div>
            <article
              v-else-if="concept"
              :key="concept.id"
              class="study-concept"
              :aria-labelledby="`concept-${concept.id}`"
            >
              <p class="study-eyebrow">Concept {{ step + 1 }} of {{ concepts.length }}</p>
              <h2 :id="`concept-${concept.id}`" tabindex="-1">{{ displayTitle(concept.title) }}</h2>
              <p class="study-copy study-explanation">{{ concept.explanation_text }}</p>
              <InteractiveConcept :topic="topic" :concept="concept" />
              <motion.section
                v-if="concept.example_text"
                class="study-example"
                :initial="reducedMotion ? false : { opacity: 0, y: 6 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{
                  duration: reducedMotion ? 0 : 0.22,
                  delay: reducedMotion ? 0 : 0.06,
                  ease: 'easeOut',
                }"
              >
                <h3>Worked example</h3>
                <p class="study-copy">{{ concept.example_text }}</p>
              </motion.section>
              <div class="study-button-row study-concept-navigation">
                <button
                  class="study-button study-button-secondary"
                  :disabled="transitioning"
                  @click="goTo(step - 1)"
                >
                  {{ step === 0 ? 'Topic Overview' : 'Previous Concept' }}
                </button>
                <button class="study-button" :disabled="transitioning" @click="next">
                  {{ step === concepts.length - 1 ? 'Finish Topic' : 'Next Concept' }}
                </button>
              </div>
            </article>
          </Transition>
        </div>
      </template>
    </template>
  </div>
</template>
