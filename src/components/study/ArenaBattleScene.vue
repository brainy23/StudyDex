<script setup>
import { ref } from 'vue'
import TownBackground from '../common/TownBackground.vue'
import PokemonBackwards from '../pokebuddy/Pokemon_Backwards.vue'

const props = defineProps({
  boss: { type: Boolean, default: false },
  title: { type: String, default: 'Poké Arena' },
})
const player = ref('25')
try {
  const saved = JSON.parse(localStorage.getItem('studydex-active-buddy'))
  const id = Number(saved?.pokeapi_id ?? saved?.id)
  if (Number.isInteger(id) && id > 0) player.value = String(id)
} catch { /* The preview also works without browser storage. */ }
const opponentFailed = ref(false)
</script>

<template>
  <div class="arena-battle-scene">
    <div class="battle-art">
      <TownBackground :scene="props.boss ? 'boss' : 'arena'" />
      <div class="battle-board"><strong>{{ title }}</strong><p>{{ boss ? 'Boss Battle' : 'Topic Quiz' }} · Question previews</p></div>
      <PokemonBackwards class="battle-player" :pokename="player" />
      <img v-if="!opponentFailed" class="battle-opponent" :src="`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${boss ? 150 : 9}.png`" alt="Practice opponent preview" @error="opponentFailed = true" />
    </div>
    <div class="battle-content"><slot /></div>
  </div>
</template>

<style scoped>
.arena-battle-scene { position: relative; min-width: 0; container-type: inline-size; }
.battle-art { position: relative; aspect-ratio: 1672 / 941; overflow: hidden; border-radius: 16px 16px 0 0; isolation: isolate; background: #17324d; }
.battle-art :deep(.town-background) { z-index: -1; }
.battle-player, .battle-opponent { position: absolute; bottom: 12%; width: 20%; height: 29%; object-fit: contain; image-rendering: pixelated; }
.battle-player { left: 14%; }
.battle-opponent { right: 14%; }
.battle-board { position: absolute; left: 28%; top: 27%; width: 44%; height: 25%; display: grid; place-content: center; padding: 12px; overflow: auto; color: white; text-align: center; }
.battle-board strong { font-size: clamp(14px, 2cqw, 26px); }
.battle-board p { margin: 8px 0 0; font-size: clamp(10px, 1.2cqw, 16px); }
.battle-content { position: relative; padding: clamp(16px, 2vw, 28px); border: 2px solid #e0b94d; border-top: 0; border-radius: 0 0 16px 16px; background: #f4f8ff; }
.battle-content :deep(.study-option) { border-radius: 10px; }
@container (min-width: 1050px) {
  .battle-art { min-height: 590px; }
}
</style>
