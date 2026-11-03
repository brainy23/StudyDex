
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { claimStarter, getStarterStatus } from '../services/rewardsService'

const router = useRouter()
const starters = [
  { id: 4, name: 'charmander' }, { id: 1, name: 'bulbasaur' }, { id: 7, name: 'squirtle' },
].map(p => ({ ...p,
  sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`,
  artwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`,
}))
const loading = ref(true)
const saving = ref(false)
const claimed = ref(false)
const selectedPokemon = ref(null)
const errorMessage = ref('')
let active = true
onUnmounted(() => { active = false })
async function checkStarter() {
  loading.value = true
  errorMessage.value = ''
  try {
    const status = await getStarterStatus()
    if (!active) return
    claimed.value = status.claimed
    if (status.claimed) await router.replace({ name: 'landing' })
  } catch (error) {
    if (active) errorMessage.value = error.message
  } finally { if (active) loading.value = false }
}
onMounted(checkStarter)
function selectPokemon(pokemon) {
  if (!saving.value && !claimed.value) selectedPokemon.value = pokemon.id
}
async function confirmSelection() {
  if (!selectedPokemon.value || claimed.value || saving.value || loading.value || errorMessage.value) return
  saving.value = true
  try {
    await claimStarter(selectedPokemon.value)
    if (active) await router.replace({ name: 'landing' })
  } catch (error) {
    if (active) errorMessage.value = error.message
  } finally { if (active) saving.value = false }
}
function imageFallback(event) {
  event.target.onerror = null
  event.target.src = '/selection/pokeball-purple.svg'
}
</script>

<template>
  <main>
    <div class="header">
      Choose your starter Pokemon!
    </div>

    <p v-if="errorMessage" role="alert">{{ errorMessage }} <button type="button" :disabled="saving" @click="checkStarter">Check again</button> <RouterLink to="/home">Continue studying</RouterLink></p>
    <div class="starters">
      <div v-if="loading" class="loading">
        Loading starters...
      </div>

      <button
        type="button"
        :disabled="saving || loading || claimed"
        :aria-pressed="selectedPokemon === pokemon.id"
        v-for="pokemon in starters"
        :key="pokemon.id"
        class="starter"
        :class="{
          selected: selectedPokemon === pokemon.id
        }"
        :style="{
          '--pokemon-artwork': `url('${pokemon.artwork}')`
        }"
        @click="selectPokemon(pokemon)"
      >
        <img
          :src="pokemon.sprite" @error="imageFallback"
          :alt="pokemon.name"
          class="pokemon-sprite"
        />

        <h2>{{ pokemon.name }}</h2>
      </button>
    </div>

    <!-- Confirm selection button -->
    <button
      class="confirm-button"
      :disabled="!selectedPokemon || claimed || loading || saving || Boolean(errorMessage)"
      @click="confirmSelection"
    >
      {{ saving ? 'Saving your starter…' : 'I Choose You!' }}
    </button>
  </main>
</template>

<style scoped>
.starter { color: inherit; font: inherit; border: 0; }
.starter:focus-visible, .confirm-button:focus-visible { outline: 3px solid white; outline-offset: 6px; }
p[role="alert"] { position: relative; z-index: 5; padding: 12px; background: white; color: #202840; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
    main{
        background-image: url('/backgrounds/starter-bg.png');
        height: 100dvh;
    }

    .header{
        text-align: center;
        font-size:40px;
        color: white;
        background-color: rgba(0, 0, 0, 0.4);
        transform: translateY(70px);
        z-index: -2;
    }

    .starters {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 260px;
    width: 100%;
    transform: translateY(330px);
    }

    .starter {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: transform 0.3s ease;
    overflow: visible;
    }

    .starter::before {
    content: "";
    position: absolute;
    inset: -200px -200px;
    z-index: -1;

    background-image: var(--pokemon-artwork);
    background-repeat: no-repeat;
    background-position: center;
    background-size: 500px 500px;
    transform: translateY(-90px);

    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    }

    .starter:hover::before {
    opacity: 0.6;
    }

    .starter.selected::before {
    opacity: 0.9;
    }

    .starter:hover {
    transform: translateY(-10px) scale(1.08);
    }

    .pokemon-sprite {
    width: 120px;
    height: 120px;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(0 5px 8px rgba(0, 0, 0, 0.2));
    transition: filter 0.3s ease;
    }

    .starter:hover .pokemon-sprite {
    filter:
        drop-shadow(0 0 12px rgba(255, 255, 255, 0.9))
        drop-shadow(0 5px 8px rgba(0, 0, 0, 0.2));
    }

    .starter h2 {
    margin-top: 8px;
    color: rgb(241, 234, 255);
    font-size: 22px;
    font-weight: 700;
    text-transform: capitalize;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
    transition: transform 0.3s ease;
    }

    .starter:hover h2 {
    transform: scale(1.1);
    }

    .loading {
    color: white;
    }

    /* New confirm button styles */
    .confirm-button {
    display: block;
    margin: 400px auto 0;
    padding: 15px 40px;
    border: 2px solid #ffffff;
    border-radius: 12px;
    background-color: #563d7c;
    color: white;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    transition:
        background-color 0.3s ease,
        transform 0.3s ease,
        opacity 0.3s ease;
    }

    .confirm-button:hover:not(:disabled) {
    background-color: #7855a9;
    transform: scale(1.05);
    }

    .confirm-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    }

    @media (max-width: 480px) {
    .starters {
        gap: 12px;
    }

    .pokemon-sprite {
        width: 90px;
        height: 90px;
    }

    .starter h2 {
        font-size: 14px;
    }
    }
</style>
