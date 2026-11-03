<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import VueTyper from 'vue3-typer'
import { TRAINING_XP_CAP } from '../../data/pokemonProgression'
import 'vue3-typer/dist/vue-typer.css'

// Home owns shared data and persistence. This component only emits changes.
const props = defineProps({
  todos: { type: Array, default: () => [] },
  ownedPokemon: { type: Array, default: () => [] },
  activeBuddy: {
    type: Object,
    default: () => ({ ownedId: null, name: 'No buddy selected' })
  },
  maxXp: { type: Number, default: TRAINING_XP_CAP },
  collectionNotice: { type: String, default: '' },
  collectionBusy: { type: Boolean, default: false },
  starterNeeded: { type: Boolean, default: false },
  pendingXp: { type: Number, default: 0 },
  deviceImage: { type: String, default: '/town/pokedex-goals.png' },
  todoStorageNotice: { type: String, default: '' },
  todoModalTarget: { type: String, default: '#todoModal' }
})
const emit = defineEmits(['toggle-todo', 'select-buddy'])

// TODAY'S STUDY GOALS
const goalsOpen = ref(false)
const questReady = ref(false)
let questBootTimer

watch(goalsOpen, (isOpen) => {
  clearTimeout(questBootTimer)
  questReady.value = false

  if (isOpen) {
    questBootTimer = setTimeout(() => {
      questReady.value = true
    }, 2100)
  }
})
const questTab = ref('todos')

const remainingTodoCount = computed(() =>
  props.todos.filter(todo => !todo.completedAt).length
)
const remainingTodoLabel = computed(() =>
  `${remainingTodoCount.value} to-do${remainingTodoCount.value === 1 ? '' : 's'} remaining`
)
const orderedTodos = computed(() => [
  ...props.todos.filter(todo => !todo.completedAt),
  ...props.todos.filter(todo => todo.completedAt)
])

function closeGoals() {
  goalsOpen.value = false
}

function pokemonSprite(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

onUnmounted(() => clearTimeout(questBootTimer))
</script>

<template>
<aside
    class="quest-dock"
    aria-label="To-dos and Pokémon collection"
    @keydown.esc.stop.prevent="closeGoals"
  >
    <Transition name="quest-slide" type="transition">
      <section
        v-if="goalsOpen"
        id="daily-goals-panel"
        class="quest-phone"
        aria-labelledby="daily-goals-title"
      >

        <img
            class="quest-device-image"
            :src="deviceImage"
            alt=""
            aria-hidden="true"
            draggable="false"
          />

        <!-- RED POKÉDEX FRAME -->
        <div class="quest-device-top" aria-hidden="true">
          <span class="quest-camera"></span>

          <span class="quest-device-name">STUDYDEX</span>

          <span class="quest-device-lights">
            <i></i>
            <i></i>
            <i></i>
          </span>
        </div>

        <!-- PHONE SCREEN -->
        <div class="quest-screen">

        <!-- EXISTING LOADING ANIMATION -->
        <div class="quest-boot" aria-hidden="true">
          <span class="quest-boot-title">STUDYDEX OS</span>

          <p class="quest-loading-text">
            Loading<span class="quest-dots"><span>.</span><span>.</span><span>.</span></span>
          </p>
        </div>

        <!-- CONTENT APPEARS AFTER LOADING -->
        <div v-if="questReady" class="quest-content">


          <header class="quest-device-heading">

            <span class="quest-eyebrow">
              <VueTyper
                text="YOUR DAILY ADVENTURE"
                :repeat="0"
                :type-delay="25"
              />
            </span>

            <h2 id="daily-goals-title">
              <VueTyper
                text="Trainer Hub"
                :repeat="0"
                :type-delay="60"
                :pre-type-delay="300"
              />
            </h2>

          </header>


          <!-- SECTION BUTTONS -->
          <nav class="quest-tabs" aria-label="Trainer hub sections">
            <button
              type="button"
              :class="{ 'is-selected': questTab === 'todos' }"
              :aria-pressed="questTab === 'todos'"
              @click="questTab = 'todos'"
            >
              To-Dos
            </button>

            <button
              type="button"
              :class="{ 'is-selected': questTab === 'pokedex' }"
              :aria-pressed="questTab === 'pokedex'"
              @click="questTab = 'pokedex'"
            >
              Pokédex
              <span class="quest-tab-count">{{ ownedPokemon.length }}</span>
            </button>
          </nav>

          <!-- =====================================
              TO-DOS
          ====================================== -->
          <section v-if="questTab === 'todos'" class="quest-tab-panel">
            <header class="quest-heading">

              <h3 class="quest-section-title">
                <VueTyper
                  text="My To-Dos"
                  :repeat="0"
                  :type-delay="50"
                  :pre-type-delay="100"
                />
              </h3>

              <p>{{ remainingTodoLabel }}</p>

            </header>

            <button class="quest-manage-todos" type="button" data-bs-toggle="modal" :data-bs-target="todoModalTarget">
              + Add / edit to-dos
            </button>
            <p v-if="todoStorageNotice" class="todo-storage-note" role="status">{{ todoStorageNotice }}</p>

            <ul v-if="orderedTodos.length" class="quest-todo-list">
              <li v-for="todo in orderedTodos" :key="todo.id"
                  class="quest-todo-item" :class="{ 'is-done': todo.completedAt }">
                <button type="button" class="todo-check"
                        :aria-label="`Mark ${todo.title} as ${todo.completedAt ? 'incomplete' : 'done'}`"
                        :aria-pressed="!!todo.completedAt" @click="emit('toggle-todo', todo)">
                  <svg v-if="todo.completedAt" viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8" /></svg>
                </button>
                <span class="quest-todo-title">{{ todo.title }}</span>
              </li>
            </ul>
            <p v-else class="quest-empty">A fresh page! Add your first to-do.</p>
            <footer class="quest-footer">Unfinished tasks carry over. Completed tasks clear tomorrow.</footer>
          </section>

          <!-- POKÉDEX -->
          <section v-else class="quest-tab-panel">


            <header class="quest-heading">

              <h3 class="quest-section-title">
                <VueTyper
                  text="Your Pokémon"
                  :repeat="0"
                  :type-delay="50"
                  :pre-type-delay="100"
                />
              </h3>

              <p>
                <VueTyper
                  text="Select a Pokémon to make it your town buddy."
                  :repeat="0"
                  :type-delay="30"
                  :pre-type-delay="500"
                />
              </p>

            </header>


            <!-- CURRENT SELECTION -->
            <div class="pokedex-active" role="status">
              <span class="pokedex-active-dot" aria-hidden="true"></span>
              <span>Town buddy: <strong>{{ activeBuddy.name }}</strong></span>
            </div>

            <p v-if="collectionNotice" role="alert">{{ collectionNotice }}</p>
            <p v-if="collectionBusy" role="status">Checking your Pokémon…</p>
            <p v-if="pendingXp > 0" role="status">{{ pendingXp }} XP saved. Choose a buddy that can keep training.</p>
            <!-- OWNED POKÉMON -->
            <div v-if="ownedPokemon.length" class="pokedex-grid">
              <button
                v-for="pokemon in ownedPokemon"
                :key="pokemon.ownedId"
                type="button"
                class="pokedex-card"
                :class="{ 'is-active': activeBuddy.ownedId === pokemon.ownedId }"
                :aria-pressed="activeBuddy.ownedId === pokemon.ownedId"
                :disabled="collectionBusy"
                :aria-label="`Choose ${pokemon.name} as your town buddy`"
                @click="emit('select-buddy', pokemon)"
              >
                <span class="pokedex-number">
                  #{{ String(pokemon.id).padStart(3, '0') }}
                </span>

                <img
                  :src="pokemonSprite(pokemon.id)"
                  alt=""
                  class="pokedex-sprite"
                  loading="lazy"
                />

                <span class="pokedex-name">{{ pokemon.name }}</span>
                <div class="small" style="font-size: 10px;">
                  Lv. {{ pokemon.level }}
                  <br/>
                  {{ pokemon.xp }} / {{ maxXp }} XP
                </div>

                <span class="pokedex-card-caption">
                  {{ activeBuddy.ownedId === pokemon.ownedId
                    ? '✓ Active buddy'
                    : 'Select buddy'
                  }}
                </span>
              </button>
            </div>

            <p v-else class="quest-empty">
              <RouterLink v-if="starterNeeded" to="/starter">Choose your starter Pokémon</RouterLink>
              <template v-else>No Pokémon yet.</template>
            </p>

            <footer class="quest-footer">
              {{ ownedPokemon.length }} Pokémon collected
            </footer>
          </section>

        </div>
      </div>

        <div class="quest-home-indicator" aria-hidden="true"></div>
      </section>
    </Transition>

    <!-- ALWAYS-VISIBLE OPEN / CLOSE BUTTON -->
    <button
      type="button"
      class="quest-toggle"
      :class="{ 'quest-toggle-open': goalsOpen }"
      :aria-expanded="goalsOpen"
      aria-controls="daily-goals-panel"
      @click="goalsOpen = !goalsOpen"
    >
      <svg
        class="quest-toggle-icon"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect x="5" y="2" width="14" height="20" rx="4" />
        <path d="M10 5h4M9 10h6M9 14h6M11 19h2" />
      </svg>

      <span>{{ goalsOpen ? 'Close Hub' : 'Trainer Hub' }}</span>

      <span class="quest-toggle-count">
        {{ remainingTodoLabel }}
      </span>

      <svg
        class="quest-toggle-chevron"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path d="m5 12 5-5 5 5" />
      </svg>
    </button>
  </aside>
</template>

<style scoped>
.quest-dock {
  position: fixed;
  right: 24px;
  bottom: calc(22px + env(safe-area-inset-bottom, 0px));
  z-index: 120;

  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;

  font-family:
    ui-rounded,
    "Arial Rounded MT Bold",
    system-ui,
    sans-serif;

}

.quest-dock,
.quest-dock * {
  box-sizing: border-box;
}

.quest-device-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

  height: 34px;
  padding: 0 10px 7px;
}

.quest-camera {
  width: 22px;
  height: 22px;

  border: 3px solid #eefaff;
  border-radius: 50%;

  background: radial-gradient(
    circle at 32% 28%,
    #fff 0%,
    #b9f6ff 15%,
    #4ccde9 40%,
    #2473ac 100%
  );

  box-shadow: 0 2px 3px rgba(71, 24, 42, 0.35);
}

.quest-device-name {
  color: #fff5f6;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 2.5px;
}

.quest-device-lights {
  display: flex;
  gap: 5px;
}

.quest-device-lights i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffb4b8;
  box-shadow: inset 0 1px 1px rgba(80, 20, 30, 0.2);
}

.quest-device-lights i:nth-child(2) {
  background: #ffe389;
}

.quest-device-lights i:nth-child(3) {
  background: #a6e6c3;
}

.quest-screen {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;

  padding: 10px 15px 16px;
  border: 2px solid #23334d;
  border-radius: 25px;

  background: linear-gradient(160deg, #f8fbff, #eef3fa);
  color: #263955;
  font-family: 'Silkscreen', monospace;
}

.quest-screen-top {
  display: flex;
  justify-content: center;
  margin-bottom: 15px;
}

.quest-speaker {
  width: 58px;
  height: 6px;
  border-radius: 999px;
  background: #23334d;
}

.quest-heading {
  margin-bottom: 16px;
}

.quest-eyebrow {
  color: #8d5d72;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.quest-heading h2 {
  margin: 5px 0;
  color: #253956;
  font-size: 25px;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.8px;
}

.quest-heading p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.quest-summary {
  margin-bottom: 14px;
  padding: 12px;

  border: 1px solid #d8e4f3;
  border-radius: 16px;
  background: #e8f0fb;
}

.quest-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;

  margin-bottom: 9px;
  font-size: 11px;
  color: #526581;
}

.quest-summary-row strong {
  color: #315b95;
  font-weight: 900;
}

.quest-summary-caption {
  display: block;
  margin-top: 6px;
  color: #657995;
  font-size: 10px;
}

.quest-progress {
  display: block;
  width: 100%;
  height: 6px;
  overflow: hidden;

  appearance: none;
  -webkit-appearance: none;

  border: 0;
  border-radius: 999px;
  background: #e9eef5;
  color: var(--quest-accent, #6489ed);
}

.quest-progress::-webkit-progress-bar {
  background: #e9eef5;
  border-radius: 999px;
}

.quest-progress::-webkit-progress-value {
  background: var(--quest-accent, #6489ed);
  border-radius: 999px;
}

.quest-progress::-moz-progress-bar {
  background: var(--quest-accent, #6489ed);
  border-radius: 999px;
}

.quest-overall-progress {
  height: 8px;
  --quest-accent: #6489ed;
}

.quest-list {
  display: flex;
  flex-direction: column;
  gap: 9px;

  margin: 0;
  padding: 0;
  list-style: none;
}

.quest-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;

  padding: 11px 10px;
  border: 1px solid #e1e7f0;
  border-radius: 15px;

  background: #fff;
  box-shadow: 0 3px 7px rgba(37, 57, 86, 0.035);
}

.quest-number {
  display: grid;
  place-items: center;
  flex-shrink: 0;

  width: 29px;
  height: 31px;
  border-radius: 10px;

  background: #f0f4fa;
  color: var(--quest-accent);
  font-size: 12px;
  font-weight: 900;
}

.quest-number svg {
  width: 19px;
  height: 19px;
  stroke: #27876b;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.quest-card-content {
  flex: 1;
  min-width: 0;
}

.quest-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.quest-subject {
  color: #65748b;
  font-size: 10px;
  font-weight: 700;
}

.quest-card h3 {
  margin: 4px 0 8px;
  color: #2a3d59;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.quest-card-progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quest-card-progress-row .quest-progress {
  flex: 1;
  min-width: 0;
}

.quest-card-count {
  flex-shrink: 0;
  color: #65748b;
  font-size: 10px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.quest-card-status {
  display: block;
  margin-top: 5px;
  color: #748196;
  font-size: 10px;
  line-height: 1.3;
}

.quest-card-done {
  border-color: #cce7db;
  background: #f5fcf8;
}

.quest-card-done .quest-number {
  background: #dcf2e7;
}

.quest-done-label {
  padding: 2px 6px;
  border-radius: 999px;
  background: #dff3e8;
  color: #287b5f;
  font-size: 9px;
  font-weight: 800;
}

.quest-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  margin-top: 15px;
  color: #718097;
  font-size: 10px;
  line-height: 1.4;
  text-align: center;
}

.quest-footer-dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #e5b85b;
}

.quest-home-indicator {
  width: 70px;
  height: 4px;
  flex-shrink: 0;
  margin: 8px auto 0;
  border-radius: 999px;
  background: rgba(105, 20, 43, 0.4);
}

.quest-empty {
  padding: 20px 5px;
  color: #65748b;
  font-size: 13px;
  text-align: center;
}

.quest-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;

  min-height: 48px;
  padding: 10px 14px;

  border: 1.5px solid #ffc0c7;
  border-radius: 17px;
  background: linear-gradient(160deg, #f57583, #d8435b);

  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  box-shadow:
    0 4px 0 #9e3047,
    0 8px 18px rgba(28, 35, 60, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);

  transition: transform 180ms ease;
}

.quest-toggle-icon {
  width: 20px;
  height: 24px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.quest-toggle-count {
  padding: 4px 7px;
  border-radius: 8px;
  background: rgba(112, 24, 45, 0.25);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.quest-toggle-chevron {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 220ms ease;
}

.quest-toggle-open .quest-toggle-chevron {
  transform: rotate(180deg);
}

.quest-toggle:active {
  transform: translateY(2px);
}

.quest-toggle:focus-visible {
  outline: 3px solid #ffe59a;
  outline-offset: 5px;
}

.quest-slide-enter-active,
.quest-slide-leave-active {
  transition:
    opacity 220ms ease,
    transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
  transform-origin: bottom right;
}

.quest-slide-enter-from,
.quest-slide-leave-to {
  opacity: 0;
  transform: translateY(24px) scale(0.96);
}

@media (max-width: 1240px) {
  .quest-dock {
    right: 14px;
    bottom: calc(136px + env(safe-area-inset-bottom, 0px));
  }

  .quest-phone {
    max-height: calc(
      100dvh - 220px - env(safe-area-inset-bottom, 0px)
    );
  }
}

@media (max-width: 600px) {
  .quest-dock {
    right: 12px;
    bottom: calc(110px + env(safe-area-inset-bottom, 0px));
    gap: 10px;
  }

  .quest-phone {
    max-height: calc(
      100dvh - 186px - env(safe-area-inset-bottom, 0px)
    );
  }

  .quest-toggle {
    min-height: 44px;
    padding: 8px 11px;
    font-size: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .quest-slide-enter-active,
.quest-slide-leave-active,
.quest-toggle,
.quest-toggle-chevron {
    transition: none;
  }
}

.quest-phone {
  position: relative;
  display: block;
  flex-shrink: 0;

  /* Fit the device into the available screen height */
  width: min(
    400px,
    calc(100vw - 24px),
    calc((100dvh - 110px - env(safe-area-inset-bottom, 0px)) * 0.666667)
  );

  aspect-ratio: 2 / 3;
  height: auto;
  max-height: none;

  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.quest-device-image {
  position: absolute;
  inset: 0;

  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;

  pointer-events: none;
  user-select: none;

  filter: drop-shadow(0 10px 12px rgba(10, 24, 45, 0.25));
}

.quest-device-top,
.quest-screen-top,
.quest-home-indicator {
  display: none;
}

.quest-screen {
  position: absolute;
  z-index: 1;

  left: 16.5%;
  top: 21.6%;
  width: 71.5%;
  height: 59.2%;

  min-height: 0;
  padding: 12px;

  border: 0;
  border-radius: 14px;

  background: #fcfaed;
  color: #263955;

  overflow-y: auto;
  overscroll-behavior: contain;

  scrollbar-width: thin;
  scrollbar-color: #b9c5cf transparent;
}

.quest-heading {
  margin-bottom: 10px;
}

.quest-heading h2 {
  font-size: 23px;
}

.quest-heading p {
  font-size: 11px;
}

.quest-eyebrow {
  font-size: 8px;
  letter-spacing: 1px;
}

.quest-summary {
  padding: 10px;
  margin-bottom: 10px;
}

.quest-summary-row {
  flex-wrap: wrap;
}

.quest-list {
  gap: 7px;
}

.quest-card {
  gap: 8px;
  padding: 9px 8px;
  border-radius: 12px;
}

.quest-card h3 {
  font-size: 12px;
  margin: 3px 0 6px;
}

.quest-number {
  width: 25px;
  height: 28px;
  font-size: 11px;
}

.quest-footer {
  margin-top: 10px;
}

@media (max-width: 1240px) {
  .quest-phone {
    width: min(
      400px,
      calc(100vw - 24px),
      calc((100dvh - 220px - env(safe-area-inset-bottom, 0px)) * 0.666667)
    );

    max-height: none;
  }
}

@media (max-width: 600px) {
  .quest-phone {
    width: min(
      360px,
      calc(100vw - 24px),
      calc((100dvh - 186px - env(safe-area-inset-bottom, 0px)) * 0.666667)
    );
  }

  .quest-screen {
    padding: 9px;
    border-radius: 10px;
  }

  .quest-heading h2 {
    font-size: 20px;
  }
}
.quest-boot {
  position: absolute;
  inset: 0;
  z-index: 2;

  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;

  border-radius: inherit;
  background: #132b25;
  color: #b4f5b0;
  pointer-events: none;

  /* Hide after 5 seconds */
  animation: quest-boot-hide 0.25s ease 2s forwards;
}

.quest-boot-title {
  color: #ffde59;
  font-family: "Silkscreen", monospace;
  font-size: 13px;
  letter-spacing: 2px;
}

.quest-loading-text {
  margin: 0;
  font-family: "Silkscreen", monospace;
  font-size: 14px;
}
.quest-dots span {
  opacity: 0;
  animation: quest-dot-one 1.2s step-end infinite;
}

.quest-dots span:nth-child(2) {
  animation-name: quest-dot-two;
}

.quest-dots span:nth-child(3) {
  animation-name: quest-dot-three;
}
.quest-content {
  animation: quest-tab-appear 0.25s ease-out;
}

.quest-screen :deep(.vue-typer) {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

.quest-screen :deep(.vue-typer .custom.char) {
  color: inherit;
}

.quest-screen :deep(.vue-typer .custom.caret) {
  background-color: #263955;
  width: 2px;
}

.quest-screen :deep(.vue-typer .custom.caret.complete) {
  display: none;
}


@keyframes quest-dot-one {
  0%, 90%, 100% { opacity: 0; }
  20% { opacity: 1; }
}

@keyframes quest-dot-two {
  0%, 90%, 100% { opacity: 0; }
  40% { opacity: 1; }
}

@keyframes quest-dot-three {
  0%, 90%, 100% { opacity: 0; }
  60% { opacity: 1; }
}

@keyframes quest-boot-hide {
  to {
    opacity: 0;
    visibility: hidden;
  }
}

@keyframes quest-content-show {
  from {
    opacity: 0;
    visibility: hidden;
  }
  to {
    opacity: 1;
    visibility: visible;
  }
}
@media (prefers-reduced-motion: reduce) {
  .quest-boot {
    display: none;
  }

  .quest-content {
    animation: none;
  }
}

.quest-device-heading {
  margin-bottom: 12px;
}

.quest-device-heading h2 {
  margin: 4px 0 0;
  color: #263955;
  font-family: "Silkscreen", monospace;
  font-size: 18px;
}

.quest-tabs {
  display: flex;
  gap: 5px;
  padding: 4px;
  margin-bottom: 14px;
  border: 1px solid #dedbc9;
  border-radius: 10px;
  background: #eeecdf;
}

.quest-tabs button {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 5px;

  min-width: 0;
  min-height: 36px;
  padding: 7px 4px;
  border: 0;
  border-radius: 7px;
  background: transparent;

  color: #626858;
  font-family: "Silkscreen", monospace;
  font-size: 10px;
  cursor: pointer;

  transition: background-color 0.15s ease, color 0.15s ease;
}

.quest-tabs button:hover {
  background: #fff8db;
}

.quest-tabs button.is-selected {
  background: #ffde59;
  color: #30304b;
  box-shadow: 0 2px 0 #d5b83e;
}

.quest-tab-count {
  padding: 2px 4px;
  border-radius: 4px;
  background: rgba(48, 48, 75, 0.09);
  font-size: 9px;
}

.quest-section-title {
  margin: 0 0 5px;
  color: #263955;
  font-size: 15px;
  font-weight: 800;
}

.quest-tab-panel {
  animation: quest-tab-appear 0.2s ease-out;
}

.pokedex-active {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 10px;
  margin-bottom: 12px;

  border: 1px solid #cce7db;
  border-radius: 8px;
  background: #e9f5ec;
  color: #287b5f;

  font-size: 11px;
}

.pokedex-active-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #35936d;
}

.pokedex-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.pokedex-card {
  display: flex;
  flex-direction: column;
  align-items: center;

  min-width: 0;
  padding: 8px 5px 10px;

  border: 2px solid #e2e3d7;
  border-radius: 10px;
  background: #fffef7;
  color: #263955;

  font: inherit;
  cursor: pointer;

  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    transform 0.15s ease;
}

.pokedex-card:hover {
  transform: translateY(-2px);
  border-color: #e4c34b;
  background: #fff9df;
}

.pokedex-card.is-active {
  border-color: #d0a925;
  background: #fff3bd;
}

.pokedex-number {
  align-self: flex-start;
  color: #737b87;
  font-family: "Silkscreen", monospace;
  font-size: 9px;
}

.pokedex-sprite {
  display: block;
  width: 76px;
  max-width: 100%;
  height: 76px;
  object-fit: contain;
  image-rendering: pixelated;
}

.pokedex-name {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.pokedex-card-caption {
  margin-top: 5px;
  color: #737b87;
  font-size: 9px;
}

.pokedex-card.is-active .pokedex-card-caption {
  color: #725912;
  font-weight: 700;
}

.quest-tabs button:focus-visible,
.pokedex-card:focus-visible {
  outline: 2px solid #345b86;
  outline-offset: 3px;
}

@keyframes quest-tab-appear {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .quest-tab-panel {
    animation: none;
  }

  .quest-tabs button,
.pokedex-card {
    transition: none;
  }

  .pokedex-card:hover {
    transform: none;
  }
}

.quest-todo-list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.is-done .quest-todo-title {
  color: #818b88;
  text-decoration: line-through;
}

.todo-check {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  padding: 3px;
  border: 2px solid #a2b0ac;
  border-radius: 50%;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.todo-check[aria-pressed="true"] {
  border-color: #35936d;
  background: #35936d;
}

.todo-check svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.todo-storage-note {
  margin: 10px 0;
  font-size: 12px;
  color: #9b482e;
}

.quest-manage-todos {
  width: 100%;
  margin: 0 0 10px;
  padding: 9px;
  border: 1px solid #d9bd4e;
  border-radius: 8px;
  background: #ffed9b;
  color: #53451b;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.quest-manage-todos:hover {
  background: #ffde59;
}

.quest-todo-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px 2px;
  border-bottom: 1px solid #e1dfd0;
}

.quest-todo-title {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 12px;
  line-height: 1.6;
}

.quest-todo-item .todo-check {
  margin-top: 1px;
}

.quest-toggle-count {
  white-space: normal;
}

.todo-check:focus-visible,
.quest-manage-todos:focus-visible {
  outline: 3px solid #6489ed;
  outline-offset: 3px;
}
</style>
