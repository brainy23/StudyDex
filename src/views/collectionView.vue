<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import GoBackBtn from '../components/common/goBackbtn.vue'
import { getCurrentProfile } from '../services/profileService'
import { getOwnedStudyPokemon } from '../services/studyService'
import { checkedRpc } from '../services/backendClient'
import playSound from '../../scripts/soundEffect'

const collection = ref([])
const ownedRecords = ref([])
const loading = ref(true)
const activeId = ref(null)
const selectedId = ref(null)
const owner = ref(null)
const saving = ref(false)
const collectionError = ref('')
let alive = true

const selectedRow = computed(() =>
  ownedRecords.value.find(
    row => row.pokemon?.pokeapi_id === selectedId.value,
  ),
)

const sorted = computed(() =>
  [...new Set(collection.value)].sort((a, b) => a - b),
)

async function loadCollection() {
  loading.value = true

  try {
    const profile = await getCurrentProfile()
    const records = await getOwnedStudyPokemon(profile.id)

    if (!alive) return

    owner.value = profile.id
    ownedRecords.value = records
    collection.value = records
      .map(row => row.pokemon?.pokeapi_id)
      .filter(id => id != null)

    activeId.value =
      records.find(row => row.is_selected)?.pokemon?.pokeapi_id || null

    selectedId.value = sorted.value.includes(selectedId.value)
      ? selectedId.value
      : activeId.value || sorted.value[0] || null

    collectionError.value = ''
  } catch (cause) {
    if (alive) {
      collectionError.value =
        cause.message || 'Your Pokémon could not be loaded.'
    }
  } finally {
    if (alive) loading.value = false
  }
}

const SCALE = window.innerWidth < 800 ? 2 : 4

const TYPE_COLORS = {
  normal: '168 167 122',
  fire: '238 129 48',
  water: '99 144 240',
  electric: '247 208 44',
  grass: '122 199 76',
  ice: '150 217 214',
  fighting: '194 46 40',
  poison: '163 62 161',
  ground: '226 191 101',
  flying: '169 143 243',
  psychic: '249 85 135',
  bug: '166 185 26',
  rock: '182 161 54',
  ghost: '115 87 151',
  dragon: '111 53 252',
  dark: '112 87 70',
  steel: '183 183 206',
  fairy: '214 133 173',
}

function prettyName(name) {
  if (name === 'nidoran-f') return 'Nidoran ♀'
  if (name === 'nidoran-m') return 'Nidoran ♂'
  if (name === 'mr-mime') return 'Mr. Mime'
  if (name === 'farfetchd') return "Farfetch'd"

  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')
}

const SPRITES =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'

const tileSprite = id => `${SPRITES}${id}.png`
const names = ref({})
const nameOf = id => names.value[id] || `#${id}`

async function loadNames() {
  try {
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151')
    if (!response.ok) throw new Error('Could not load Pokémon names')

    const data = await response.json()
    if (!alive) return

    const map = {}
    data.results.forEach((pokemon, index) => {
      map[index + 1] = prettyName(pokemon.name)
    })
    names.value = map
  } catch (error) {
    console.error('Could not load Pokémon names', error)
  }
}

const detail = ref(null)
const detailError = ref('')
const spriteW = ref(0)
const cache = new Map()
let token = 0

async function loadDetail(id) {
  const myToken = ++token
  spriteW.value = 0
  detailError.value = ''
  detail.value = null

  if (!id) return

  if (cache.has(id)) {
    detail.value = cache.get(id)
    return
  }

  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
    if (!response.ok) throw new Error('Could not load this Pokémon')

    const data = await response.json()
    const result = {
      id,
      types: data.types.map(item => item.type.name),
      sprite:
        data.sprites.versions?.['generation-v']?.['black-white']
          ?.animated?.front_default ||
        data.sprites.front_default,
    }

    cache.set(id, result)

    if (alive && myToken === token) {
      detail.value = result
    }
  } catch {
    if (alive && myToken === token) {
      detailError.value = 'This Pokémon could not load.'
    }
  }
}

watch(selectedId, loadDetail, { immediate: true })

const theme = computed(() => {
  const types = detail.value?.types || []

  return {
    '--c1': TYPE_COLORS[types[0]] || '167 139 232',
    '--c2': TYPE_COLORS[types[1]] || '255 214 90',
  }
})

const grid = ref(null)

function select(id) {
  selectedId.value = id
}

function columns() {
  if (!grid.value) return 1
  return getComputedStyle(grid.value).gridTemplateColumns.split(' ').length
}

function onKey(event) {
  const columnCount = columns()
  const step = {
    ArrowRight: 1,
    ArrowLeft: -1,
    ArrowDown: columnCount,
    ArrowUp: -columnCount,
  }[event.key]

  if (!step || !sorted.value.length) return

  event.preventDefault()

  const index = sorted.value.indexOf(selectedId.value)
  const next = Math.max(
    0,
    Math.min(sorted.value.length - 1, index + step),
  )

  selectedId.value = sorted.value[next]
  nextTick(() => grid.value?.children[next]?.focus())
}

const toast = ref('')
const celebrating = ref(false)
let toastTimer = 0
let celebrateTimer = 0

async function makeActive() {
  if (
    !selectedId.value ||
    selectedId.value === activeId.value ||
    saving.value
  ) return

  saving.value = true

  try {
    const record = ownedRecords.value.find(
      row => row.pokemon?.pokeapi_id === selectedId.value,
    )

    if (!record) throw new Error('This Pokémon could not be found.')

    await checkedRpc(
      'select_user_pokemon',
      { p_owned_id: record.id },
      owner.value,
    )

    if (!alive) return

    await loadCollection()
    if (!alive || collectionError.value) return

    playSound('selectedPokemon')

    toast.value = `${nameOf(activeId.value)} is now your active Pokémon!`
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toast.value = ''
    }, 2400)

    celebrating.value = true
    clearTimeout(celebrateTimer)
    celebrateTimer = setTimeout(() => {
      celebrating.value = false
    }, 900)
  } catch (cause) {
    if (alive) {
      collectionError.value =
        cause.message || 'Your active Pokémon could not be changed.'
    }
  } finally {
    if (alive) saving.value = false
  }
}

onMounted(() => {
  void loadNames()
  void loadCollection()
})

onUnmounted(() => {
  alive = false
  token++
  clearTimeout(toastTimer)
  clearTimeout(celebrateTimer)
})
</script>

<template>
  <main class="collection">
    <header class="topbar">
      <div class="collection-back-navigation"><GoBackBtn /></div>

      <h1 class="title">POKEDEX</h1>

      <div class="registered">
        <span class="ball" aria-hidden="true"></span>
        <span>
          Pokemon Registered:
          <strong>{{ sorted.length }}</strong>
        </span>
      </div>
    </header>

    <div class="body">
      <section class="list-panel" aria-label="Your Pokémon">
        <div v-if="collectionError" class="collection-error" role="alert">
          {{ collectionError }}
          <button type="button" @click="loadCollection">Retry</button>
        </div>

        <div v-if="loading" class="empty">Loading…</div>

        <div
          v-else-if="sorted.length"
          ref="grid"
          class="grid"
          @keydown="onKey"
        >
          <button
            v-for="id in sorted"
            :key="id"
            type="button"
            class="tile"
            :class="{
              selected: id === selectedId,
              active: id === activeId,
            }"
            :aria-pressed="id === selectedId"
            :title="nameOf(id)"
            @click="select(id)"
            @mouseenter="playSound('selectingPokemon')"
          >
            <img
              :src="tileSprite(id)"
              :alt="nameOf(id)"
              loading="lazy"
            />
            <span
              v-if="id === activeId"
              class="star"
              aria-label="Active Pokémon"
            >★</span>
          </button>
        </div>

        <div v-else class="empty">
          <p>No Pokémon yet. Open a pack to start your collection!</p>
          <RouterLink to="/rewards" class="activate link">
            Open a pack
          </RouterLink>
        </div>
      </section>

      <aside class="detail" :style="theme">
        <template v-if="selectedId">
          <div class="spot" :class="{ celebrate: celebrating }">
            <div class="stage">
              <img
                v-if="detail"
                class="sprite"
                :src="detail.sprite"
                :alt="nameOf(selectedId)"
                :style="spriteW ? { width: spriteW * SCALE + 'px' } : {}"
                @load="spriteW = $event.target.naturalWidth"
              />

              <div v-else-if="detailError" class="loading" role="alert">
                <p>{{ detailError }}</p>
                <button type="button" @click="loadDetail(selectedId)">
                  Retry
                </button>
              </div>

              <div v-else class="loading">Loading…</div>
            </div>

            <span v-if="selectedId === activeId" class="badge">
              ★ Active
            </span>
          </div>

          <div class="plate">
            <div class="no">{{ nameOf(selectedId) }}</div>
            <div class="name">
              Lv {{ selectedRow?.level }} · {{ selectedRow?.xp }} XP
            </div>
          </div>

          <div v-if="detail" class="types">
            <span
              v-for="type in detail.types"
              :key="type"
              class="chip"
              :style="{ '--tc': TYPE_COLORS[type] }"
            >
              {{ type }}
            </span>
          </div>

          <button
            type="button"
            class="activate"
            :disabled="saving || selectedId === activeId"
            @click="makeActive"
          >
            {{
              saving
                ? 'Saving…'
                : selectedId === activeId
                  ? '✓ Active Pokémon'
                  : 'Make active Pokémon'
            }}
          </button>
        </template>
      </aside>
    </div>

    <div
      class="toast"
      :class="{ show: toast }"
      role="status"
      aria-live="polite"
    >
      {{ toast }}
    </div>
  </main>
</template>

<style scoped>
.collection {
  height: 100dvh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  font-family: Verdana, Geneva, Tahoma, sans-serif;
  color: #3a3552;
  background:
    radial-gradient(circle at 78% 35%, #f3ecff 0%, transparent 48%),
    linear-gradient(160deg, #e3d8f8 0%, #cbb9ef 60%, #b8a1e7 100%);
}

/* Header: equal side columns keep POKEDEX truly centered. */
.topbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  flex-shrink: 0;
  gap: 16px;
  padding: 12px 28px;
  background: rgba(255, 255, 255, 0.78);
}

.title {
  grid-column: 2;
  margin: 0;
  font-size: 26px;
  font-weight: bold;
  letter-spacing: 0.04em;
  color: rgb(83, 0, 116);
  text-align: center;
}

.registered {
  grid-column: 3;
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  font-size: 16px;
  color: #5c5478;
}

.registered strong {
  margin-left: 6px;
  font-weight: normal;
}

.ball {
  position: relative;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: 3px solid #3a3552;
  border-radius: 50%;
  background: linear-gradient(
    #ef4a4a 0 44%,
    #3a3552 44% 56%,
    #fff 56% 100%
  );
}

.ball::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 7px;
  height: 7px;
  translate: -50% -50%;
  border: 2px solid #3a3552;
  border-radius: 50%;
  background: #fff;
}

.collection-back-navigation {
  grid-column: 1;
  justify-self: start;
}

.activate:focus-visible {
  outline: 3px solid #664298;
  outline-offset: 4px;
}

.collection-error {
  padding: 12px;
  color: #8c253a;
}

/* Main layout */
.body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: 32px;
  padding: 20px 28px 28px;
}

.list-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.38);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.55);
}

.grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  grid-auto-rows: 100px;
  gap: 6px;
  align-content: start;
  padding: 20px 12px 12px;
  scrollbar-width: thin;
  scrollbar-color: #8d6ad6 transparent;
}

.grid::-webkit-scrollbar {
  width: 8px;
}

.grid::-webkit-scrollbar-thumb {
  background: #8d6ad6;
  border-radius: 999px;
}

.tile {
  position: relative;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 14px;
  background: transparent;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.tile img {
  width: 96px;
  height: 96px;
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 4px rgba(60, 40, 110, 0.25));
}

.tile:hover,
.tile:focus-visible {
  background: rgba(255, 255, 255, 0.65);
  transform: translateY(-4px);
}

.tile:focus-visible {
  outline: 3px solid #664298;
  outline-offset: 2px;
}

.tile.selected {
  background: rgba(255, 255, 255, 0.92);
  box-shadow:
    0 0 0 3px #8d6ad6,
    0 8px 18px rgba(103, 72, 176, 0.35);
}

.tile.selected::before {
  content: '';
  position: absolute;
  top: -13px;
  left: 50%;
  translate: -50% 0;
  border: 9px solid transparent;
  border-top: 12px solid #4a4560;
  animation: cursor-bob 0.9s ease-in-out infinite;
}

.star {
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 20px;
  color: #ffb400;
  text-shadow: 0 1px 0 #fff, 0 0 8px rgba(255, 180, 0, 0.9);
}

.empty {
  margin: auto;
  text-align: center;
  font-size: 18px;
  color: #5c5478;
}

/* Selected Pokémon */
.detail {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding-bottom: 20px;
}

.spot {
  position: relative;
  width: 100%;
  flex: 1;
  max-height: 420px;
  display: grid;
  place-items: center;
}

.stage {
  position: relative;
  display: grid;
  justify-items: center;
  align-items: end;
  max-width: 100%;
}

.sprite {
  display: block;
  max-width: 100%;
  height: auto;
  image-rendering: pixelated;
}

.loading {
  padding: 60px 0;
  color: #5c5478;
  text-align: center;
}

.badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: bold;
  color: rgb(100, 45, 0);
  background: rgb(255, 215, 37);
  box-shadow: 0 3px 0 rgb(200, 160, 0);
}

.spot.celebrate .stage {
  animation: celebrate 0.8s cubic-bezier(0.2, 1.4, 0.4, 1);
}

.spot.celebrate::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 120px;
  height: 120px;
  margin: -60px 0 0 -60px;
  border-radius: 50%;
  border: 4px solid rgb(var(--c1));
  box-shadow: 0 0 24px rgb(var(--c1));
  opacity: 0;
  animation: ring 0.9s ease-out forwards;
  pointer-events: none;
}

.plate {
  width: min(300px, 100%);
  border-radius: 6px;
  overflow: hidden;
  text-align: center;
  box-shadow: 0 6px 14px rgba(103, 72, 176, 0.25);
}

.no {
  padding: 8px;
  font-size: 22px;
  font-weight: bold;
  color: #fff;
  background: #a78bdc;
}

.name {
  padding: 10px;
  font-size: 24px;
  background: #fff;
}

.types {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.chip {
  padding: 3px 14px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: bold;
  text-transform: capitalize;
  color: #fff;
  background: rgb(var(--tc));
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.2);
}

.activate {
  font-family: inherit;
  font-size: 22px;
  padding: 10px 28px;
  border: 3px solid rgb(200, 160, 0);
  border-radius: 12px;
  background: rgb(255, 215, 37);
  color: rgb(100, 45, 0);
  box-shadow: 0 6px 0 rgb(200, 160, 0);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.activate.link {
  display: inline-block;
  text-decoration: none;
}

.activate:hover:not(:disabled) {
  box-shadow:
    0 6px 0 rgb(200, 160, 0),
    0 0 20px rgba(255, 230, 0, 0.8);
}

.activate:active:not(:disabled) {
  transform: translateY(5px);
  box-shadow: 0 1px 0 rgb(200, 160, 0);
}

.activate:disabled {
  background: #d9d2ea;
  border-color: #b9afd3;
  box-shadow: 0 6px 0 #b9afd3;
  color: #6f6890;
  cursor: default;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  translate: -50% 30px;
  max-width: calc(100% - 32px);
  box-sizing: border-box;
  padding: 12px 24px;
  border-radius: 999px;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  color: #fff;
  background: #4a4560;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease, translate 0.35s ease;
}

.toast.show {
  opacity: 1;
  translate: -50% 0;
}

@keyframes cursor-bob {
  0%, 100% { translate: -50% 0; }
  50% { translate: -50% 4px; }
}

@keyframes celebrate {
  0% { transform: scale(1); }
  35% { transform: scale(1.18) translateY(-12px); }
  100% { transform: scale(1); }
}

@keyframes ring {
  0% { opacity: 0.95; scale: 0.2; }
  100% { opacity: 0; scale: 3.4; }
}

@media (max-width: 800px) {
  .topbar {
    padding: 12px 16px;
    gap: 12px;
  }

  .title {
    font-size: 22px;
  }

  .registered {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: center;
    font-size: 14px;
  }

  .collection {
    height: auto;
    min-height: 100dvh;
  }

  .body {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 14px;
  }

  .detail {
    order: -1;
  }

  .spot {
    min-height: 200px;
  }

  .grid {
    max-height: 420px;
  }

  .activate {
    font-size: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile.selected::before,
  .spot.celebrate .stage,
  .spot.celebrate::after {
    animation: none;
  }

  .tile,
  .activate,
  .toast {
    transition: none;
  }
}
</style>