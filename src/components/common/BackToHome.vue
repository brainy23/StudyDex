<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  variant: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'text', 'custom'].includes(value),
  },
})
</script>

<template>
  <RouterLink to="/home" class="back-to-home" :class="`back-to-home--${variant}`">
    <slot><span aria-hidden="true">←</span> Back to Town</slot>
  </RouterLink>
</template>

<style scoped>
.back-to-home {
  max-width: 100%;
  font-family: inherit;
  text-decoration: none;
  touch-action: manipulation;
}
.back-to-home--button,
.back-to-home--text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 650;
  line-height: 1.4;
}
.back-to-home--button {
  min-height: 44px;
  padding: 10px 18px;
  border: 2px solid #a98608;
  border-radius: 12px;
  background: #ffd841;
  color: #302700;
}
.back-to-home--button:hover { background: #ffe987; }
.back-to-home:focus-visible { outline: 3px solid #2454bf; outline-offset: 4px; }
</style>
