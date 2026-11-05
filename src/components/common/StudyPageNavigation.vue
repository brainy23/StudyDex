<script setup>
import BackToHome from './BackToHome.vue'
defineProps({ showTopics: { type:Boolean, default:true } })
defineEmits(['topics'])
</script>

<template>
  <nav class="study-page-navigation" aria-label="Page navigation">
    <BackToHome variant="custom" class="study-page-button">
      ‹ Back to town
    </BackToHome>
    <button
      v-if="showTopics"
      type="button"
      class="study-page-button"
      @click="$emit('topics')"
    >Topics</button>
  </nav>
</template>

<style scoped>
.study-page-navigation {
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:10px;
  max-width:100%;
  pointer-events:auto;
}
.study-page-navigation .study-page-button {
  position:static;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  box-sizing:border-box;
  min-height:44px;
  margin:0;
  padding:10px 16px;
  border:1px solid #ffffff66;
  border-radius:14px;
  background:#203956;
  color:#fff;
  font-family:system-ui,sans-serif;
  font-size:16px;
  line-height:1.4;
  font-weight:750;
  text-decoration:none;
  cursor:pointer;
  touch-action:manipulation;
}
.study-page-navigation .study-page-button:hover { background:#31547a; }
.study-page-navigation .study-page-button:focus-visible {
  outline:3px solid #ffe194;
  outline-offset:3px;
}
@media(max-width:1000px) {
  .study-page-navigation .study-page-button {
    padding:8px 12px;
    font-size:13px;
  }
}
</style>
