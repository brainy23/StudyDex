<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRewardInventory } from '../../composables/useRewardInventory'

const props = defineProps({
  current: { type: String, default: '' },
  sleeping: { type: Boolean, default: false },
  routes: { type: Object, default: () => ({ town: '/home', study: '/study-decks', quiz: '/quiz', bag: '/trainer' }) },
})
const { count: packCount, label: packLabel, notice: packNotice } = useRewardInventory()
const router = useRouter()
const route = useRoute()
const opened = ref(false)
const root = ref(null)
const toggle = ref(null)
const message = ref('')
const busy = ref(false)
const items = [
  { id: 'town',  label: 'Town',  x: 0,     y: -1,     tile: 'linear-gradient(160deg, #fff3b0, #ffd15a)' },
  { id: 'study', label: 'Study', x: .3827, y: -.9239, tile: 'linear-gradient(#a2edda, #54c5ac)' },
  { id: 'quiz',  label: 'Quiz',  x: .7071, y: -.7071, tile: 'linear-gradient(#ffcf92, #f6a95e)' },
  { id: 'todos', label: 'To-Do', x: .9239, y: -.3827, tile: 'linear-gradient(#b4ecd2, #5fbf95)' },
  { id: 'bag',   label: 'Bag',   x: 1,     y: 0,      tile: 'linear-gradient(#e0cbff, #b496e7)' },
]
const selected = computed(() => props.current || items.find(item => props.routes[item.id] === route.path)?.id)
const unavailable = item => (selected.value === item.id && !(item.id === 'bag' && packCount.value > 0)) || (props.sleeping && ['study', 'quiz'].includes(item.id))
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
    const destination = item.id === 'bag' && packCount.value > 0 ? '/rewards'
      : item.id === 'todos' ? props.routes.town : props.routes[item.id]
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
      <span class="visually-hidden" role="status" aria-live="polite">{{ packNotice }}</span>
      <div class="bubble-halo" aria-hidden="true"></div>
      <button v-for="(item, index) in items" :key="item.id" type="button"
        class="bubble-item" :class="{ 'is-current': selected === item.id, 'is-town': item.id === 'town' }"
        :style="{ '--x': item.x, '--y': item.y, '--tile': item.tile, '--delay': `${index * 35}ms` }"
        :disabled="unavailable(item) || busy" :tabindex="opened ? 0 : -1"
        :aria-hidden="!opened" :aria-current="selected === item.id ? 'page' : undefined"
        :aria-label="`${item.label}${item.id === 'bag' && packCount > 0 ? `, ${packCount} unopened packs, open Rewards` : ''}${selected === item.id ? ', current page' : ''}${sleeping && ['study','quiz'].includes(item.id) ? ', buddy sleeping' : ''}`"
        @click="navigate(item)">

        <span v-if="item.id === 'bag' && packCount > 0" class="reward-badge" aria-hidden="true">{{ packLabel }}</span>
        <!-- Town: the same CSS Pokéball as the town navbar -->
        <span v-if="item.id === 'town'" class="sd-pokeball" aria-hidden="true"></span>

        <!-- Others: coloured icon tile -->
        <span v-else class="icon-tile" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <template v-if="item.id === 'study'">
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
        </span>

        <span class="bubble-label">{{ item.label }}</span>
      </button>
      <button ref="toggle" type="button" class="bubble-toggle" :aria-expanded="opened"
        :aria-label="opened ? 'Close navigation' : 'Open navigation'" @click="expand">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path v-if="opened" d="m10 10 12 12m0-12L10 22" />
          <g v-else fill="currentColor" stroke="none"><circle cx="11" cy="11" r="3" /><circle cx="21" cy="11" r="3" /><circle cx="11" cy="21" r="3" /><circle cx="21" cy="21" r="3" /></g>
        </svg>
        <span class="bubble-label">{{ opened ? 'Close' : 'Menu' }}</span>
      </button>
      <p v-if="message" class="bubble-message" role="alert">{{ message }}</p>
    </nav>
  </Teleport>
</template>

<style scoped>
.reward-badge { position: absolute; top: -5px; right: -5px; z-index: 2; min-width: 22px; padding: 2px 5px; border-radius: 12px; background: #b52434; color: white; font-size: 12px; font-weight: 800; }
/* Same colours and style town navbar */
.bubble-nav {
  --size: 72px; --radius: 214px;
  position: fixed; left: max(20px, env(safe-area-inset-left)); bottom: max(20px, env(safe-area-inset-bottom));
  width: var(--size); height: var(--size); z-index: 1040; isolation: isolate;
  font-family: ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif;
}
.bubble-nav *, .bubble-nav *::before, .bubble-nav *::after { box-sizing: border-box; }

/* every bubble  blue glass, like the town navbar */
.bubble-nav button {
  appearance: none; margin: 0; width: var(--size); height: var(--size); border-radius: 50%;
  position: absolute; left: 0; bottom: 0; padding: 6px 3px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  color: #fff; cursor: pointer;
  border: 2px solid rgba(207, 234, 255, 0.78);
  background: linear-gradient(180deg, rgba(81, 125, 179, 0.62), rgba(22, 48, 87, 0.78));
  backdrop-filter: blur(20px) saturate(140%); -webkit-backdrop-filter: blur(20px) saturate(140%);
  box-shadow: 0 12px 28px rgba(6, 19, 44, 0.3), 0 4px 0 rgba(15, 36, 70, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  font: inherit;
  transition: translate 160ms ease, filter 160ms ease;
}

.bubble-label {
  font-size: 11px; font-weight: 800; line-height: 1.1; white-space: nowrap;
  text-shadow: 0 2px 3px rgba(5, 20, 45, 0.6);
}

/* coloured icon tiles */
.icon-tile {
  display: grid; place-items: center; width: 34px; height: 32px; border-radius: 10px;
  background: var(--tile);
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 3px 0 rgba(7, 23, 49, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.icon-tile svg {
  width: 25px; height: 25px; fill: none; stroke: #263d63; stroke-width: 1.8;
  stroke-linecap: round; stroke-linejoin: round;
}

/* Town bubble = gold button with Pokéball */
.bubble-nav .bubble-item.is-town {
  border: 3px solid #fff0ae;
  background: var(--tile);
  color: #243c68;
  box-shadow: 0 5px 0 #b77d2c, 0 9px 18px rgba(7, 20, 45, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.8);
}
.bubble-item.is-town .bubble-label { color: #243c68; text-shadow: none; }

.sd-pokeball {
  position: relative; display: block; width: 32px; height: 32px; flex-shrink: 0; overflow: hidden;
  border: 3px solid #263d63; border-radius: 50%;
  background: linear-gradient(to bottom, #ff626c 0%, #ed3d50 44%, #263d63 44%, #263d63 56%, #fff 56%, #e5edf9 100%);
}
.sd-pokeball::after {
  content: ""; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 11px; height: 11px; border: 3px solid #263d63; border-radius: 50%; background: #fff;
}

/* menu button */
.bubble-nav .bubble-toggle { z-index: 2; }
.bubble-toggle svg {
  width: 28px; height: 28px; fill: none; stroke: #ffe17a; stroke-width: 2.4; stroke-linecap: round;
  color: #ffe17a; transition: transform .25s;
}
.bubble-nav.is-open .bubble-toggle svg { transform: rotate(90deg); }

/* at the start animation */
.bubble-nav .bubble-item {
  opacity: 0; visibility: hidden; pointer-events: none; transform: translate(0, 0) scale(.3);
  transition: transform .4s cubic-bezier(.2, .8, .2, 1), opacity .2s, visibility .4s, translate 160ms ease;
}
.bubble-nav.is-open .bubble-item {
  opacity: 1; visibility: visible; pointer-events: auto;
  transform: translate(calc(var(--x) * var(--radius)), calc(var(--y) * var(--radius))) scale(1);
  transition-delay: var(--delay), var(--delay), var(--delay), 0ms;
}

/* current page: yellow ring + small yellow bar */
.bubble-nav .bubble-item.is-current:not(.is-town) { border-color: rgba(255, 226, 137, 0.9); }
.bubble-nav .bubble-item.is-current::after {
  content: ""; position: absolute; bottom: -9px; left: 50%; transform: translateX(-50%);
  width: 16px; height: 4px; border-radius: 999px; background: #ffe17a;
}

/*  unavailable */
.bubble-nav button:disabled { cursor: not-allowed; }
.bubble-nav .bubble-item:disabled:not(.is-current) { filter: grayscale(100%); opacity: .45; }

/* hover */
@media (hover: hover) {
  .bubble-nav button:not(:disabled):hover { translate: 0 -3px; filter: brightness(1.08); }
}
.bubble-nav button:not(:disabled):active { translate: 0 2px; }
.bubble-nav button:focus-visible { outline: 3px solid #fff0a8; outline-offset: 5px; }

.bubble-halo {
  position: absolute; inset: -10px; border-radius: 50%; pointer-events: none;
  border: 2px solid rgba(207, 234, 255, 0.35);
}
.bubble-message {
  position: absolute; bottom: 92px; left: 0; width: 230px; margin: 0; padding: 12px;
  border: 2px solid rgba(207, 234, 255, 0.78); border-radius: 16px;
  background: linear-gradient(180deg, rgba(81, 125, 179, 0.9), rgba(22, 48, 87, 0.95));
  color: white; font: 700 13px/1.4 ui-rounded, system-ui, sans-serif;
}

@media (max-width: 480px), (max-height: 480px) {
  .bubble-nav { --size: 60px; --radius: 168px; left: max(12px, env(safe-area-inset-left)); bottom: max(12px, env(safe-area-inset-bottom)); }
  .icon-tile { width: 28px; height: 27px; border-radius: 8px; }
  .icon-tile svg { width: 21px; height: 21px; }
  .sd-pokeball { width: 26px; height: 26px; }
  .sd-pokeball::after { width: 9px; height: 9px; }
  .bubble-label { font-size: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .bubble-nav .bubble-item, .bubble-nav button, .bubble-toggle svg { transition: none; }
}
</style>
