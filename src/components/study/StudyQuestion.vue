<script setup>
defineProps({
  question: { type: Object, required: true },
  selected: { type: String, default: '' },
})
defineEmits(['select'])
</script>

<template>
  <fieldset class="study-question">
    <legend>{{ question.question_text }}</legend>
    <label
      v-for="option in question.options"
      :key="option.id"
      class="study-option"
      :class="{ 'is-selected': selected === option.id }"
    >
      <input
        type="radio"
        :name="`question-${question.id}`"
        :value="option.id"
        :checked="selected === option.id"
        @change="$emit('select', option.id)"
      />
      <span>{{ option.option_text }}</span>
    </label>
    <p v-if="!question.options.length" class="study-note">
      Answer options are not available for this question yet.
    </p>
    <p v-if="selected" class="study-note" role="status">
      Choice noted for this visit. This answer has not been graded.
    </p>
  </fieldset>
</template>
