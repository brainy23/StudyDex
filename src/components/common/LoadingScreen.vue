<script setup>
defineProps({
  show: { type: Boolean, default: false },
  message: { type: String, default: 'Loading…' },
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="loading-screen"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div class="pokeball" aria-hidden="true">
        <span class="pokeball-button"></span>
      </div>

      <p>{{ message }}</p>
    </div>
  </Teleport>
</template>

<style scoped>
.loading-screen {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: #fff;
  color: #26364b;
  font-family: system-ui, sans-serif;
}

.pokeball {
  position: relative;
  width: 72px;
  height: 72px;
  box-sizing: border-box;
  overflow: hidden;
  border: 4px solid #26364b;
  border-radius: 50%;
  background: linear-gradient(
    to bottom,
    #ef4055 0%,
    #ef4055 46%,
    #26364b 46%,
    #26364b 54%,
    #fff 54%,
    #fff 100%
  );
  animation: pokeball-spin 1.2s linear infinite;
}

.pokeball-button {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  border: 4px solid #26364b;
  border-radius: 50%;
  background: #fff;
  transform: translate(-50%, -50%);
}

.loading-screen p {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

@keyframes pokeball-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pokeball {
    animation: none;
  }
}
</style>