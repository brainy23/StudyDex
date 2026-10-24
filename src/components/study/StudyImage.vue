<script setup>
import { computed, ref, watch } from 'vue'
import { resolveStudyImage } from '../../services/studyService'

const props = defineProps({
  path: { type: String, default: '' },
  alt: { type: String, required: true },
})
const failed = ref(false)
const source = computed(() => resolveStudyImage(props.path))
watch(
  () => props.path,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <template v-if="path">
    <img
      v-if="source && !failed"
      :src="source"
      :alt="alt"
      class="study-content-image"
      @error="failed = true"
    />
    <span v-else class="study-note">This illustration is unavailable.</span>
  </template>
</template>
