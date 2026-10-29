<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  current: { type: String, default: '' },
  sleeping: { type: Boolean, default: false },
  routes: { type: Object, default: () => ({ town: '/home', study: '/study-decks', quiz: '/quiz', bag: '/trainer' }) },
})
const router = useRouter()
const route = useRoute()
const opened = ref(false)
const root = ref(null)
const toggle = ref(null)
const message = ref('')
const busy = ref(false)
const items = [
  { id: 'town', label: 'Town', x: 0, y: -1, color: '#ffe997' },
  { id: 'study', label: 'Study', x: .3827, y: -.9239, color: '#8df1dc' },
  { id: 'quiz', label: 'Quiz', x: .7071, y: -.7071, color: '#ffcb9b' },
  { id: 'todos', label: 'To-Do', x: .9239, y: -.3827, color: '#acedd9' },
  { id: 'bag', label: 'Bag', x: 1, y: 0, color: '#d8bdff' },
]
const selected = computed(() => props.current || items.find(item => props.routes[item.id] === route.path)?.id)
const unavailable = item => selected.value === item.id || (props.sleeping && ['study', 'quiz', 'bag'].includes(item.id))
function close(restoreFocus = false) {
  opened.value = false
  if (restoreFocus) toggle.value?.focus()
}
async function expand() {
  opened.value = !opened.value
  message.value = ''
  if (opened.value) {
    await nextTick()
    root.value?.querySelector('.bubble-item:not(:disabled)')?.focus()
  }
}
function outside(event) {
  if (!root.value?.contains(event.target)) close()
}
function keyboard(event) {
  if (event.key === 'Escape' && opened.value) { event.preventDefault(); close(true) }
  if (!opened.value || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const buttons = [...root.value.querySelectorAll('.bubble-item:not(:disabled)')]
  const index = buttons.indexOf(document.activeElement)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
    : (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + buttons.length) % buttons.length
  buttons[next]?.focus()
}
// Reuse Town's existing Bootstrap modal trigger after the route has mounted.
// The observer also handles lazy-loaded route components.
function waitForTodoTrigger() {
  return new Promise((resolve, reject) => {
    const selector = '[data-bs-target="#todoModal"]'
    const existing = document.querySelector(selector)
    if (existing) return resolve(existing)
    const observer = new MutationObserver(() => {
      const trigger = document.querySelector(selector)
      if (trigger) { clearTimeout(timeout); observer.disconnect(); resolve(trigger) }
    })
    const timeout = setTimeout(() => { observer.disconnect(); reject(new Error('Town To-Do button was not found.')) }, 5000)
    observer.observe(document.body, { childList: true, subtree: true })
  })
}
async function navigate(item) {
  if (unavailable(item) || busy.value) return
  busy.value = true
  message.value = ''
  try {
    const destination = item.id === 'todos' ? props.routes.town : props.routes[item.id]
    if (!destination) throw new Error('This destination has not been configured.')
    const failure = await router.push(destination)
    if (failure && route.path !== destination) throw new Error('Navigation was cancelled. Please try again.')
    if (item.id === 'todos') {
      await nextTick()
      const trigger = await waitForTodoTrigger()
      trigger.click()
    }
    close()
  } catch (error) {
    message.value = error.message || 'Could not open this page.'
    console.warn('[Studydex navigation]', error)
  } finally { busy.value = false }
}
watch(() => route.fullPath, () => close())
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
</script>

<template>
  <Teleport to="body">
    <nav ref="root" class="bubble-nav" :class="{ 'is-open': opened }" aria-label="Main navigation"
      @keydown="keyboard" @focusout="event => { if (!root?.contains(event.relatedTarget)) close() }">
      <div class="bubble-halo" aria-hidden="true"></div>
      <button v-for="(item, index) in items" :key="item.id" type="button"
        class="bubble-item" :class="{ 'is-current': selected === item.id }"
        :style="{ '--x': item.x, '--y': item.y, '--tint': item.color, '--delay': `${index * 35}ms` }"
        :disabled="unavailable(item) || busy" :tabindex="opened ? 0 : -1"
        :aria-hidden="!opened" :aria-current="selected === item.id ? 'page' : undefined"
        :aria-label="`${item.label}${selected === item.id ? ', current page' : ''}${sleeping && ['study','quiz','bag'].includes(item.id) ? ', buddy sleeping' : ''}`"
        @click="navigate(item)">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <template v-if="item.id === 'town'">
            <circle cx="16" cy="16" r="13" fill="#fff9e8" />
            <path d="M3 16a13 13 0 0 1 26 0Z" fill="#ff6577" />
            <path d="M3 16h26" /><circle cx="16" cy="16" r="4.5" fill="white" />
          </template>
          <template v-else-if="item.id === 'study'">
            <path d="M16 8C12 5 7 5 3 7v19c4-2 9-2 13 1 4-3 9-3 13-1V7c-4-2-9-2-13 1Z" fill="#fff9e8" />
            <path d="M16 8v19M7 11l5 1M7 16l5 1M20 12l5-1M20 17l5-1" />
          </template>
          <template v-else-if="item.id === 'quiz'">
            <path d="m7 3 5 2 13 17-4 4L7 9Zm18 0-5 2L7 22l4 4L25 9Z" fill="#fff9e8" />
            <path d="m4 20 8 8M20 28l8-8M5 28l3-3M24 25l3 3" />
          </template>
          <template v-else-if="item.id === 'todos'">
            <rect x="6" y="4" width="21" height="25" rx="3" fill="#fff9e8" />
            <path d="M11 2v5M22 2v5M16 13h7M16 19h7M16 25h7m-14-13 2 2 3-4m-5 8 2 2 3-4" />
          </template>
          <template v-else>
            <path d="M12 7V5a4 4 0 0 1 8 0v2" />
            <rect x="6" y="7" width="20" height="22" rx="6" fill="#ffcf65" />
            <path d="M6 15h20" /><rect x="10" y="18" width="12" height="7" rx="2" fill="#fff0bb" /><path d="M16 13v4" />
          </template>
        </svg>
        <span>{{ item.label }}</span>
      </button>
      <button ref="toggle" type="button" class="bubble-toggle" :aria-expanded="opened"
        :aria-label="opened ? 'Close navigation' : 'Open navigation'" @click="expand">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path v-if="opened" d="m10 10 12 12m0-12L10 22" />
          <g v-else fill="currentColor" stroke="none"><circle cx="11" cy="11" r="3" /><circle cx="21" cy="11" r="3" /><circle cx="11" cy="21" r="3" /><circle cx="21" cy="21" r="3" /></g>
        </svg>
        <span>{{ opened ? 'Close' : 'Menu' }}</span>
      </button>
      <p v-if="message" class="bubble-message" role="alert">{{ message }}</p>
    </nav>
  </Teleport>
</template>

<style scoped>
.bubble-nav {
  --size: 64px; --radius: 192px;
  position: fixed; left: max(20px, env(safe-area-inset-left)); bottom: max(20px, env(safe-area-inset-bottom));
  width: var(--size); height: var(--size); z-index: 1040; isolation: isolate;
  font-family: var(--studydex-font, ui-rounded, system-ui, sans-serif);
}
.bubble-nav *, .bubble-nav *::before { box-sizing: border-box; }
.bubble-nav button {
  appearance: none; margin: 0; width: var(--size); height: var(--size); border-radius: 50%;
  position: absolute; left: 0; bottom: 0; padding: 7px 3px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  color: #193751; border: 1px solid rgba(255,255,255,.8); cursor: pointer;
  background: linear-gradient(145deg, rgba(255,255,255,.85), rgba(221,242,255,.48) 45%, rgba(188,213,235,.66));
  box-shadow: inset 0 2px 3px #ffffffcc, inset 0 -3px 8px #b6ddf355, 0 6px 18px #071b3940;
  backdrop-filter: blur(18px) saturate(145%); -webkit-backdrop-filter: blur(18px) saturate(145%);
  font: 700 10px/1.1 var(--studydex-font, ui-rounded, system-ui, sans-serif);
  text-shadow: 0 1px 1px #ffffffa6;
}
.bubble-nav button::before {
  content: ''; position: absolute; top: 5px; left: 12px; width: 23px; height: 9px;
  border-radius: 50%; background: #ffffffa6; transform: rotate(-27deg); pointer-events: none;
}
.bubble-nav svg { width: 29px; height: 29px; flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.bubble-nav .bubble-item {
  opacity: 0; visibility: hidden; pointer-events: none; transform: translate(0,0) scale(.3);
  transition: transform .4s cubic-bezier(.2,.8,.2,1), opacity .2s, visibility .4s;
}
.bubble-nav.is-open .bubble-item {
  opacity: 1; visibility: visible; pointer-events: auto;
  transform: translate(calc(var(--x) * var(--radius)), calc(var(--y) * var(--radius))) scale(1);
  transition-delay: var(--delay);
  background: radial-gradient(circle at 80% 90%, var(--tint), transparent 65%), linear-gradient(145deg,#ffffffd9,#e4f3ff88);
}
.bubble-nav .bubble-toggle { z-index: 2; }
.bubble-nav .bubble-toggle svg { transition: transform .25s; }
.bubble-nav.is-open .bubble-toggle svg { transform: rotate(90deg); }
.bubble-nav button:focus-visible { outline: 3px solid #256baf; outline-offset: 4px; }
.bubble-nav button:disabled { cursor: default; }
.bubble-nav .bubble-item.is-current { border: 2px solid #fff2a7; box-shadow: inset 0 0 0 2px #d79f3e88, 0 0 16px #ffdc7166; }
.bubble-nav .bubble-item:disabled:not(.is-current) { filter: grayscale(.8); opacity: .55; }
.bubble-halo { position: absolute; inset: -10px; border: 1px solid #ffffff40; border-radius: 50%; pointer-events: none; }
.bubble-message { position: absolute; bottom: 82px; left: 0; width: 230px; padding: 12px; background: #17334fee; color: white; border-radius: 14px; font: 13px/1.4 system-ui; }
@media (hover: hover) {
  .bubble-nav button:not(:disabled):hover { border-color: white; filter: brightness(1.09); }
}
@media (max-width: 480px), (max-height: 480px) {
  .bubble-nav { --size: 56px; --radius: 166px; left: max(12px, env(safe-area-inset-left)); bottom: max(12px, env(safe-area-inset-bottom)); }
  .bubble-nav svg { width: 25px; height: 25px; }
}
@media (prefers-reduced-motion: reduce) {
  .bubble-nav .bubble-item, .bubble-nav .bubble-toggle svg { transition: none; }
}
@supports not (backdrop-filter: blur(1px)) {
  .bubble-nav button { background-color: #dfedf7; }
}
</style>
