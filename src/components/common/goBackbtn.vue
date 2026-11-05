<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <button type="button" class="go-back-btn" @click="router.back()">
    <span aria-hidden="true">←</span>
    <slot>Go back</slot>
  </button>
</template>

<style scoped>
.go-back-btn[type='button'] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  max-width: 100%;
  margin: 0;
  padding: 10px 16px;
  border: 1px solid #d6cce0;
  border-radius: 14px;
  background: #fff;
  color: #303557;
  font: inherit;
  font-weight: 750;
  line-height: 1.4;
  text-align: center;
  cursor: pointer;
  touch-action: manipulation;
}
.go-back-btn:hover { background: #f7f3fb; border-color: #bda9d0; }
.go-back-btn:focus-visible { outline: 3px solid #8a56ac; outline-offset: 3px; }
</style>
