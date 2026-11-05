<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  pokename: {
    type: String,
    required: true
  },
  fallbackSrc: {
    type: String,
    default: ''
  }
})


const POKE_API_URL = (import.meta.env.VITE_POKE_API_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '')

const sprite = ref('')
const loading = ref(false)
const error = ref('')
const isAnimated = ref(false)

async function fetchBackwardSprite(name, signal) {
  const response = await fetch(
    `${POKE_API_URL}/pokemon/${name}`,
    { signal }
  )

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? 'Pokémon not found.'
        : 'Could not load this Pokémon.'
    )
  }

  const pokemon = await response.json()

  const animated =
    pokemon.sprites?.versions?.['generation-v']?.['black-white']
      ?.animated?.back_default

  // Some Pokémon have no animated back sprite.
  const image = animated || pokemon.sprites?.back_default || props.fallbackSrc

  if (!image) {
    throw new Error('No back sprite is available for this Pokémon.')
  }

  return {
    image,
    animated: Boolean(animated)
  }
}

watch(
  () => props.pokename,
  async (value, _, onCleanup) => {
    const controller = new AbortController()

    // Cancel the previous request when the name changes or component unmounts.
    onCleanup(() => controller.abort())

    sprite.value = ''
    error.value = ''
    isAnimated.value = false
    loading.value = false

    const name = value?.trim().toLowerCase()
      .replace(/♀/g, '-f')
      .replace(/♂/g, '-m')
      .replace(/[.'’]/g, '')
      .replace(/\s+/g, '-')

    if (!name) {
      error.value = 'Choose a Pokémon.'
      return
    }

    loading.value = true

    try {
      const result = await fetchBackwardSprite(name, controller.signal)

      if (controller.signal.aborted) return

      sprite.value = result.image
      isAnimated.value = result.animated
    } catch (cause) {
      if (controller.signal.aborted) return

      error.value = cause.message || 'Unable to load Pokémon.'
    } finally {
      if (!controller.signal.aborted) {
        loading.value = false
      }
    }
  },
  { immediate: true }
)

function handleImageError() {
  if (props.fallbackSrc && sprite.value !== props.fallbackSrc) {
    sprite.value = props.fallbackSrc
    isAnimated.value = false
    return
  }
  sprite.value = ''
  error.value = 'The Pokémon image could not load.'
}
</script>

<template>
  <div class="pokemon-backwards" :aria-busy="loading">
    <span v-if="loading" class="sprite-status" role="status">
      Loading Pokémon…
    </span>

    <span v-else-if="error" class="sprite-status" role="alert">
      {{ error }}
    </span>

    <img
      v-else-if="sprite"
      :key="sprite"
      :src="sprite"
      :alt="`${pokename}, rear view`"
      :title="isAnimated ? pokename : `${pokename} — static back sprite`"
      class="pokemon-back-sprite"
      draggable="false"
      @error="handleImageError"
    />
  </div>
</template>

<style scoped>
.pokemon-backwards {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.pokemon-back-sprite {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
  image-rendering: pixelated;
  user-select: none;
}

.sprite-status {
  padding: 8px;
  color: inherit;
  font-size: 12px;
  text-align: center;
}
</style>
