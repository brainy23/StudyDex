<script setup>
import { ref, useId } from 'vue'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import { motion, useReducedMotion } from 'motion-v'
import { displayTitle } from '../../utils/displayText'

const props = defineProps({
  concepts: { type: Array, required: true },
  current: { type: Number, default: -1 },
  readIds: { type: Array, default: () => [] },
  reviewIds: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
})
const emit = defineEmits(['select'])
const expanded = ref(false)
const reducedMotion = useReducedMotion()
const indicatorId = useId()

function status(item, index) {
  return [
    props.current === index ? 'Current concept' : '',
    props.readIds.includes(item.id) ? 'Read' : 'Not read yet',
    props.reviewIds.includes(item.id) ? 'Revisit' : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

function select(index) {
  emit('select', index)
}
</script>

<template>
  <nav
    class="study-roadmap"
    :class="{ 'study-roadmap-compact': compact }"
    aria-label="Concept roadmap"
  >
    <CollapsibleRoot v-model:open="expanded">
      <div class="study-roadmap-heading">
        <h3>Concept roadmap</h3>
        <CollapsibleTrigger v-if="compact" class="study-roadmap-toggle">
          {{ expanded ? 'Hide concept names' : 'Show concept names' }}
          <span class="study-disclosure-chevron" aria-hidden="true">⌄</span>
        </CollapsibleTrigger>
        <span v-else class="study-note">{{ concepts.length }} concepts</span>
      </div>
      <p v-if="!compact" class="study-note">
        Choose a concept to explore, or start at the beginning.
      </p>
      <p v-if="reviewIds.length" class="study-note">
        Concepts to revisit are marked. You can explore any concept.
      </p>
      <ol v-if="compact" class="study-roadmap-steps">
        <li v-for="(item, index) in concepts" :key="item.id">
          <motion.button
            type="button"
            :aria-label="`Concept ${index + 1}: ${displayTitle(item.title)} · ${status(item, index)}`"
            :aria-current="current === index ? 'step' : undefined"
            :title="displayTitle(item.title)"
            :class="{ 'is-read': readIds.includes(item.id) }"
            :while-hover="reducedMotion ? undefined : { y: -2 }"
            :while-press="reducedMotion ? undefined : { scale: 0.95 }"
            @click="select(index)"
          >
            <motion.span
              v-if="current === index"
              class="study-step-active"
              :layout-id="`${indicatorId}-active`"
              :transition="{ duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' }"
              aria-hidden="true"
            />
            <span class="study-step-number" aria-hidden="true">{{ index + 1 }}</span>
            <motion.span
              v-if="readIds.includes(item.id)"
              class="study-step-read"
              :initial="reducedMotion ? false : { scale: 0.6, opacity: 0 }"
              :animate="{ scale: 1, opacity: 1 }"
              :transition="{ duration: reducedMotion ? 0 : 0.2 }"
              aria-hidden="true"
              >✓</motion.span
            >
            <span
              v-else-if="reviewIds.includes(item.id)"
              class="study-step-revisit"
              aria-hidden="true"
              >•</span
            >
          </motion.button>
        </li>
      </ol>
      <p v-if="compact" class="study-roadmap-caption study-note">
        Concept {{ current + 1 }} of {{ concepts.length }}<span aria-hidden="true"> · </span>
        {{ readIds.length }} read<span aria-hidden="true"> · </span>✓ means read
      </p>
      <component :is="compact ? CollapsibleContent : 'div'" class="study-roadmap-names">
        <ol class="study-roadmap-list">
          <li v-for="(item, index) in concepts" :key="item.id">
            <motion.button
              type="button"
              :aria-current="current === index ? 'step' : undefined"
              :class="{ 'is-read': readIds.includes(item.id) }"
              :while-hover="reducedMotion ? undefined : { y: -2 }"
              :while-press="reducedMotion ? undefined : { scale: 0.98 }"
              @click="select(index)"
            >
              <span class="study-roadmap-number" aria-hidden="true">{{ index + 1 }}</span>
              <span class="study-roadmap-label">
                <span>{{ displayTitle(item.title) }}</span>
                <span class="study-roadmap-status">{{ status(item, index) }}</span>
              </span>
              <span v-if="readIds.includes(item.id)" class="study-roadmap-check" aria-hidden="true"
                >✓</span
              >
            </motion.button>
          </li>
        </ol>
      </component>
    </CollapsibleRoot>
  </nav>
</template>
