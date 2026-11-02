<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { studyErrorMessage } from '../../services/studyService'
import { displayTitle } from '../../utils/displayText'
import StudyRoadmap from './StudyRoadmap.vue'
import InteractiveConcept from './InteractiveConcept.vue'
import ClassroomPokemon from './ClassroomPokemon.vue'
import ClassroomEnvironment from './ClassroomEnvironment.vue'

const props = defineProps({
  topic: { type: Object, required: true },
  resource: { type: Object, required: true },
  reviewConceptIds: { type: Array, default: () => [] },
  showOverview: { type: Boolean, default: false },
  buddy: { type: Object, default: null },
  live: { type: Boolean, default: true },
  previewHour: { type: Number, default: 12 },
  rainActive: { type: Boolean, default: false },
})
const emit = defineEmits(['progress', 'complete', 'mode', 'retry'])
const step = ref(-1)
const completedIds = ref([])
const finished = ref(false)
const content = ref(null)
const backgroundFailed = ref(false)
const lesson = computed(() => props.resource.data)
const concepts = computed(() => [...(lesson.value?.concepts || [])].sort((a,b) => (a.concept_order ?? Infinity) - (b.concept_order ?? Infinity)))
const concept = computed(() => concepts.value[step.value])
const revisionConcepts = computed(() => concepts.value.filter(item => props.reviewConceptIds.includes(item.id)))
// Use the saved species name, not a collection/database row ID.
const buddyName = computed(() => props.buddy?.pokemon?.name || '')
let context = ''
watch(() => [props.topic.id, concepts.value, props.reviewConceptIds, props.showOverview], () => {
  if (!concepts.value.length) return
  const nextContext = JSON.stringify([props.topic.id, props.reviewConceptIds, props.showOverview])
  if (context === nextContext) return
  context = nextContext
  finished.value = false
  const id = !props.showOverview && props.reviewConceptIds.find(id => concepts.value.some(item => item.id === id))
  step.value = id ? concepts.value.findIndex(item => item.id === id) : -1
}, { immediate: true })
watch(() => props.topic.id, () => { completedIds.value = []; finished.value = false; step.value = -1 })
async function focusContent() {
  await nextTick()
  content.value?.scrollTo({ top: 0, behavior: 'instant' })
  content.value?.querySelector('h2')?.focus({ preventScroll: true })
}
function goTo(index) {
  if (index < -1 || index >= concepts.value.length) return
  finished.value = false
  step.value = index
  focusContent()
}
function next() {
  if (!concept.value || finished.value) return
  if (!completedIds.value.includes(concept.value.id)) completedIds.value.push(concept.value.id)
  emit('progress', { read: completedIds.value.length, total: concepts.value.length })
  if (step.value < concepts.value.length - 1) step.value++
  else { finished.value = true; emit('complete', props.topic.id) }
  focusContent()
}
</script>

<template>
  <section class="learn-classroom" aria-label="Poké Lab classroom">
    <ClassroomEnvironment
      class="classroom-background"
      :live="live"
      :preview-hour="previewHour"
      :rain-active="rainActive"
      @image-error="backgroundFailed = true"
    />
    <div class="classroom-professor">
      <ClassroomPokemon pokemon="mewtwo" label="Mewtwo, your teacher" />
      <span class="professor-label">Professor Mewtwo</span>
    </div>
    <div v-if="buddyName" class="classroom-buddy">
      <ClassroomPokemon :pokemon="buddyName" rear :label="`${displayTitle(buddyName)} learning beside you`" />
    </div>
    <div ref="content" class="classroom-board study-learn" tabindex="0" aria-label="Lesson whiteboard">
      <p v-if="backgroundFailed" class="study-note" role="status">The classroom image could not load. You can still read your lesson.</p>
      <p v-if="resource.loading" role="status">Loading your lesson…</p>
      <div v-else-if="resource.error || lesson?.errors?.concepts" role="alert">
        <p>{{ studyErrorMessage(resource.error || lesson.errors.concepts, 'Your lesson') }}</p>
        <button class="study-button" @click="emit('retry')">Try again</button>
      </div>
      <template v-else-if="lesson">
        <p v-if="reviewConceptIds.length && !revisionConcepts.length" role="status">Those concepts are unavailable. You can review this topic below.</p>
        <template v-if="finished">
          <p class="study-eyebrow">Topic reading complete</p>
          <h2 tabindex="-1">You have explored {{ displayTitle(topic.name) }}!</h2>
          <p>{{ completedIds.length }} of {{ concepts.length }} concepts read.</p>
          <div class="study-button-row">
            <button class="study-button" @click="emit('mode', 'flashcards')">Review with Flashcards</button>
            <button class="study-button study-button-secondary" @click="goTo(-1)">Revisit Concepts</button>
          </div>
        </template>
        <template v-else-if="step === -1">
          <p class="study-eyebrow">Learn with Professor Mewtwo · Topic overview</p>
          <h2 tabindex="-1">{{ displayTitle(topic.name) }}</h2>
          <p v-if="topic.description" class="study-copy">{{ topic.description }}</p>
          <h3>Your learning goals</h3>
          <p v-if="lesson.errors?.goals" role="alert">{{ studyErrorMessage(lesson.errors.goals, 'Learning goals') }}</p>
          <ol v-else-if="lesson.goals?.length"><li v-for="goal in lesson.goals" :key="goal.id">{{ goal.goal_text }}</li></ol>
          <p v-else>Learning goals have not been added yet.</p>
          <template v-if="concepts.length">
            <StudyRoadmap :concepts="concepts" :read-ids="completedIds" :review-ids="reviewConceptIds" @select="goTo" />
            <p class="study-note">Learn at your own pace. Opening a concept does not mark it read.</p>
            <button class="study-button" @click="goTo(0)">Start Learning</button>
          </template>
          <p v-else>This topic has no lesson concepts yet. Choose another topic or check back later.</p>
        </template>
        <article v-else-if="concept" :aria-labelledby="`concept-${concept.id}`">
          <StudyRoadmap compact :concepts="concepts" :current="step" :read-ids="completedIds" :review-ids="reviewConceptIds" @select="goTo" />
          <p class="study-eyebrow">Concept {{ step + 1 }} of {{ concepts.length }}</p>
          <h2 :id="`concept-${concept.id}`" tabindex="-1">{{ displayTitle(concept.title) }}</h2>
          <p class="study-copy study-explanation">{{ concept.explanation_text }}</p>
          <InteractiveConcept :key="concept.id" :topic="topic" :concept="concept" />
          <section v-if="concept.example_text" class="study-example">
            <h3>Worked example</h3><p class="study-copy">{{ concept.example_text }}</p>
          </section>
          <div class="study-button-row">
            <button class="study-button study-button-secondary" @click="goTo(step - 1)">{{ step === 0 ? 'Topic Overview' : 'Previous Concept' }}</button>
            <button class="study-button" @click="next">{{ step === concepts.length - 1 ? 'Finish Topic' : 'Next Concept' }}</button>
          </div>
        </article>
      </template>
      <p v-else role="status">Your lesson is not available yet.</p>
    </div>
  </section>
</template>

<style scoped>
.learn-classroom { position:relative; isolation:isolate; width:100%; aspect-ratio:1672/941; color:#24364c; font-family:ui-rounded,'Arial Rounded MT Bold',system-ui,sans-serif; container-type:inline-size; }
.classroom-background { position:absolute; inset:0; width:100%; height:100%; object-fit:fill; z-index:0; }
.classroom-board { z-index:2; position:absolute; left:25%; top:11.5%; width:49%; height:41%; box-sizing:border-box; padding:1.1cqw; overflow:auto; overscroll-behavior:contain; scrollbar-width:thin; scrollbar-color:#b59b6e transparent; background:rgba(255,253,245,.94); border-radius:8px; font-size:clamp(14px,1.12cqw,21px); line-height:1.55; }
.classroom-board :deep(h2) { font-size:clamp(20px,1.8cqw,32px); line-height:1.2; margin:.25em 0 .55em; color:#22364f; }
.classroom-board :deep(h3) { font-size:1.12em; color:#22364f; }
.classroom-board :deep(.study-copy) { white-space:pre-line; color:#24364c; }
.classroom-board :deep(.study-eyebrow) { color:#80612a; font-size:.72em; font-weight:800; letter-spacing:.1em; }
.classroom-board :deep(.study-note) { color:#536172; font-size:.85em; }
.classroom-board :deep(.study-button-row) { display:flex; gap:8px; flex-wrap:wrap; margin-top:16px; }
.classroom-board :deep(.study-button) { border:1px solid #ad8c48; border-radius:12px; background:#ffe28b; color:#28364b; padding:10px 14px; font:inherit; font-weight:750; cursor:pointer; min-height:44px; }
.classroom-board :deep(.study-button-secondary) { background:#f5f1e6; }
.classroom-board :deep(button:disabled) { opacity:.5; cursor:default; }
.classroom-board :deep(button:focus-visible), .classroom-board:focus-visible { outline:3px solid #237eac; outline-offset:3px; }
.classroom-board :deep(.study-example), .classroom-board :deep(.study-interactive) { background:#eef3ee; border:1px solid #ccd9ce; border-radius:14px; padding:14px; margin:14px 0; }
.classroom-board :deep(.study-plant-diagram) { max-height:220px; width:100%; }
.classroom-professor { z-index:1; position:absolute; left:77%; top:29%; width:19%; height:50%; }
.classroom-buddy { z-index:1; position:absolute; left:4.5%; top:52%; width:20%; height:33%; }
.professor-label { display:block; position:absolute; bottom:-7%; left:0; right:0; text-align:center; border-radius:20px; background:#203249dc; color:#fff0c5; font-size:clamp(10px,1cqw,18px); padding:5px; }
@media(max-width:800px) {
 .learn-classroom { aspect-ratio:auto; min-height:660px; padding-top:54%; padding-bottom:16px; background:#e4ddcd; }
 .classroom-background { bottom:auto; height:56.28cqw; }
 .classroom-board { position:relative; left:auto; top:auto; margin:0 12px; width:auto; height:auto; max-height:none; padding:20px; border:2px solid #b49a66; border-radius:18px; background:#fffdf5; font-size:16px; }
 .classroom-professor { top:13cqw; height:27cqw; }
 .classroom-buddy { top:29cqw; height:18cqw; }
}
</style>
