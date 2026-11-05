<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import XpPrompt from './xpPrompt.vue'

const props = defineProps({ controller: { type: Object, required: true } })
const { timer, session, topic, profile, notice, savedReward, rewardedToday } = props.controller
const { display, running, finished } = timer
const panel = ref(null)
const collapsed = ref(false)
const position = ref(null)
let drag = null
const borderColor = computed(() => !running.value ? '#ff6071' : timer.seconds.value <= 120 ? '#f5c94f' : '#5eae7e')
const style = computed(() => position.value
  ? { left: `${position.value.x}px`, top: `${position.value.y}px`, '--focus-color': borderColor.value }
  : { right: '20px', bottom: '20px', '--focus-color': borderColor.value })
function clamp(x, y) {
  const rect = panel.value?.getBoundingClientRect()
  return { x: Math.max(8, Math.min(x, window.innerWidth - (rect?.width || 280) - 8)),
    y: Math.max(8, Math.min(y, window.innerHeight - (rect?.height || 180) - 8)) }
}
function savePosition() {
  if (!profile.value?.id || !position.value) return
  try { localStorage.setItem(`studydex:timer-position:${profile.value.id}`, JSON.stringify(position.value)) } catch { /* optional layout preference */ }
}
function startDrag(event) {
  if (event.button !== 0) return
  const rect = panel.value.getBoundingClientRect()
  drag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top }
  event.currentTarget.setPointerCapture?.(event.pointerId)
}
function moveDrag(event) {
  if (!drag || event.pointerId !== drag.id) return
  position.value = clamp(event.clientX - drag.dx, event.clientY - drag.dy)
}
function endDrag() { if (drag) { drag = null; savePosition() } }
function moveWithKeys(event) {
  const step = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[event.key]
  if (!step) return
  event.preventDefault()
  const rect = panel.value.getBoundingClientRect()
  position.value = clamp(rect.left + step[0], rect.top + step[1])
  savePosition()
}
async function fit() {
  await nextTick()
  if (position.value) position.value = clamp(position.value.x, position.value.y)
}
watch(() => profile.value?.id, async id => {
  position.value = null
  if (!id) return
  try {
    const saved = JSON.parse(localStorage.getItem(`studydex:timer-position:${id}`))
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) position.value = saved
  } catch { /* Use the default corner. */ }
  await fit()
}, { immediate: true })
watch(collapsed, fit)
onMounted(() => window.addEventListener('resize', fit))
onUnmounted(() => window.removeEventListener('resize', fit))
</script>

<template>
  <Teleport to="body">
    <aside ref="panel" class="floating-study-timer" :style="style" aria-label="Study focus timer">
      <header class="floating-timer-header">
        <button type="button" class="timer-drag-handle" aria-label="Move study timer. Drag or use arrow keys."
          @pointerdown="startDrag" @pointermove="moveDrag" @pointerup="endDrag" @pointercancel="endDrag" @keydown="moveWithKeys">
          <span aria-hidden="true">⠿</span> Focus timer <span v-if="collapsed" class="mini-time">{{ display }}</span>
        </button>
        <button type="button" class="timer-minimize" :aria-expanded="!collapsed" :aria-label="collapsed ? 'Expand study timer' : 'Minimize study timer'" @click="collapsed = !collapsed">{{ collapsed ? '+' : '−' }}</button>
      </header>
      <div v-show="!collapsed" class="floating-timer-body">
        <p class="timer-topic">{{ topic?.name || 'Study focus' }}</p>
        <small class="timer-daily">{{ rewardedToday }} / 4 daily focus XP rewards</small>
        <p class="floating-time" role="timer" aria-live="off">{{ display }}</p>
        <div class="floating-timer-actions">
          <button type="button" :disabled="!session.ready.value || session.busy.value" @click="running ? controller.pause() : controller.start()">{{ running ? 'Pause' : finished ? 'Start next block' : 'Start / Resume' }}</button>
          <button type="button" :disabled="!session.ready.value || session.busy.value" @click="controller.reset()">Reset</button>
        </div>
        <p v-if="session.error.value" class="timer-error" role="alert">{{ session.error.value }} <button type="button" :disabled="session.busy.value" @click="controller.retry()">Retry saving</button></p>
        <p v-else-if="notice" class="timer-notice" role="status">{{ notice }}</p>
        <small v-else>25-minute focus block · Drag to move</small>
      </div>
    </aside>
  </Teleport>
  <XpPrompt :result="savedReward.prompt.value" @close="savedReward.dismiss" />
</template>

<style scoped>
.floating-study-timer { position: fixed; z-index: 1050; width: min(280px, calc(100vw - 16px)); max-height: calc(100dvh - 16px); overflow: auto; box-sizing: border-box; border: 2px solid var(--focus-color); border-radius: 18px; background: #fffdf4; color: #293b55; box-shadow: 0 8px 30px #172b5040; font-family: var(--sd-font-body, 'Fredoka', sans-serif); }
.floating-timer-header { display: flex; align-items: center; gap: 6px; padding: 8px; background: #fff0b6; border-radius: 16px 16px 0 0; }
.floating-study-timer button { font: inherit; color: inherit; cursor: pointer; min-height: 40px; }
.timer-drag-handle { flex: 1; border: 0; background: transparent; text-align: left; font-weight: 700 !important; cursor: grab !important; touch-action: none; user-select: none; }
.timer-drag-handle:active { cursor: grabbing !important; }
.timer-minimize { width: 36px; border: 1px solid #ded1a2; border-radius: 10px; background: white; font-size: 22px !important; }
.floating-timer-body { padding: 10px 14px 14px; text-align: center; }
.timer-topic { margin: 0; font-size: 14px; overflow-wrap: anywhere; }
.floating-time { margin: 4px 0 10px; font-size: 40px; line-height: 1.2; font-variant-numeric: tabular-nums; }
.floating-timer-actions { display: flex; gap: 8px; }
.floating-timer-actions button { flex: 1; border: 1px solid #d7ba56; border-radius: 10px; padding: 6px; background: #ffe58a; }
.floating-study-timer button:disabled { opacity: .55; cursor: wait; }
.floating-study-timer button:focus-visible { outline: 3px solid #487bb0; outline-offset: 1px; }
.timer-notice, .timer-error, small { display: block; margin: 10px 0 0; font-size: 13px; }
.timer-error { color: #9a2f35; }
.mini-time { font-variant-numeric: tabular-nums; }
</style>
