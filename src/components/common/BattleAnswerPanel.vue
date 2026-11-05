<script setup>
const props = defineProps({
  options: { type: Array, default: () => [] },
  selectedId: { type: [String, Number], default: null },
  correctId: { type: [String, Number], default: null },
  graded: { type: Boolean, default: false },
  finished: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  allowAnswerChange: { type: Boolean, default: false },
  questionId: { type: String, default: 'arena-question' },
})
const emit = defineEmits(['select'])

function selectOption(id) {
  if (props.disabled || props.finished ||
      (props.selectedId !== null && (!props.allowAnswerChange || props.graded))) return
  emit('select', id)
}
</script>

<template>
  <section class="battle-dock" aria-label="Battle answer controls">
    <div class="battle-dialogue" aria-live="polite">
      <slot name="dialogue" />
    </div>
    <div v-if="finished" class="battle-end-actions">
      <slot name="actions" />
    </div>
    <div v-else class="demo-answers" role="group" :aria-labelledby="questionId">
      <button
        v-for="(option, index) in options"
        :key="option.id"
        type="button"
        :class="[
          'demo-answer-' + (index % 4),
          {
            'preview-selected': !graded && selectedId === option.id,
            correct: graded && selectedId !== null && correctId === option.id,
            wrong: graded && selectedId === option.id && correctId !== option.id,
          },
        ]"
        :aria-pressed="selectedId === option.id"
        :disabled="disabled || (selectedId !== null && (!allowAnswerChange || graded))"
        @click="selectOption(option.id)"
      >
        <b class="choice-letter">{{ String.fromCharCode(65 + index) }}</b>
        <span class="choice-text">{{ option.text }}</span>
        <span
          v-if="graded && selectedId !== null && correctId === option.id"
          aria-label="Correct answer"
        >✓</span>
        <span
          v-else-if="graded && selectedId === option.id"
          aria-label="Incorrect answer"
        >✕</span>
        <span
          v-else-if="selectedId === option.id"
          aria-label="Selected option"
        >●</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.battle-dock * { box-sizing: border-box; }

.battle-dock { position: absolute;
  z-index: 9;
  left: 2%;
  right: 2%;
  bottom: 1.5%;
  height: 28%;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 12px;
  padding: 14px;
  border: 3px solid #344652;
  border-radius: 18px;
  background: #ede8d7;
  box-shadow: 0 5px 0 #192735, inset 0 0 0 2px #fff9dc;
  color: #263548; }
.battle-dialogue { min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
  border: 3px solid #d6b254;
  border-radius: 9px;
  background: #183047;
  box-shadow: inset 0 0 0 2px #080f1d;
  color: #fff5dc; }
.battle-dialogue :deep(.dialogue-kicker) { color: #ffdc83;
  font-size: clamp(9px, .7cqw, 12px);
  font-weight: 900;
  letter-spacing: .1em; }
.battle-dialogue :deep(p) { margin: 8px 0;
  font-size: clamp(15px, 1.4cqw, 23px);
  line-height: 1.3; }
.battle-dialogue :deep(strong) { text-transform: capitalize; }
.battle-dialogue :deep(small) { font-size: clamp(10px, .85cqw, 14px);
  color: #d7e5ec; }
.battle-dialogue :deep(.battle-explanation) { font-size: clamp(12px, 1cqw, 17px); }
.demo-answers { display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 12px;
  min-height: 0; }
.demo-answers button { display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 18px;
  line-height: 1.4;
  border: 3px solid #fff4d2;
  outline: 2px solid #45515b;
  border-radius: 18px;
  color: white;
  font: inherit;
  font-size: clamp(14px, 1.2cqw, 20px);
  font-weight: 800;
  text-align: left;
  cursor: pointer;
  box-shadow: inset 0 -5px 0 #0002, inset 0 2px 0 #fff6; }
.choice-letter { display: grid;
  place-items: center;
  flex: 0 0 25px;
  height: 25px;
  border-radius: 50%;
  background: #0002;
  font-size: 12px; }
.choice-text { white-space: pre-wrap;
  flex: 1;
  overflow-wrap: anywhere; }
.demo-answer-0 { background: #be4358; }.demo-answer-1 { background: #dfb94e;
  color: #26334a !important; }.demo-answer-2 { background: #488247; }.demo-answer-3 { background: #396d99; }
.demo-answers button:hover:not(:disabled) { filter: brightness(1.15); }
.demo-answers button:disabled { cursor: default; }
.demo-answers .preview-selected, .demo-answers .correct { outline: 3px solid #ffe270;
  border-color: #ffe270; }
.demo-answers .wrong { border-style: dashed; }
.battle-dock :deep(.battle-next), .battle-end-actions :deep(button) { padding: 8px 12px;
  border: 2px solid #b58d32;
  border-radius: 9px;
  background: #ffe08a;
  color: #26334a;
  font: inherit;
  font-weight: 800;
  cursor: pointer; }
.battle-dock :deep(.battle-next) { font-size: 12px; }
.battle-end-actions { display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px; }
.battle-dock :deep(button:focus-visible) { outline: 3px solid #fff;
  outline-offset: -6px; }
@media (max-width: 700px) {
  .battle-dock { position: relative;
  left: auto;
  right: auto;
  bottom: auto;
  width: calc(100% - 24px);
  height: auto;
  margin: 12px 12px 180px;
  grid-template-columns: 1fr; }
  .battle-dialogue { max-height: 180px; }
  .demo-answers { grid-template-rows: auto; }
  .demo-answers button { min-height: 100px;
  font-size: 14px;
  overflow: visible; }
  .battle-dialogue :deep(p) { font-size: 18px; }
  .battle-dialogue :deep(.battle-explanation) { font-size: 14px; }
}
</style>
