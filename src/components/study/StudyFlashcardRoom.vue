<script setup>
import { computed } from 'vue'
import TownBackground from '../common/TownBackground.vue'
import PokemonBuddy from '../pokebuddy/PokemonBuddy.vue'

const props = defineProps({ buddy: { type: Object, default: null } })
const pokemon = computed(() => props.buddy?.pokemon?.sprite_url ? {
  id: props.buddy.pokemon.pokeapi_id,
  name: props.buddy.pokemon.name,
  xp: props.buddy.xp,
  evolution_stage: 0,
  animated_img: props.buddy.pokemon.sprite_url,
  static_img: props.buddy.pokemon.sprite_url,
} : null)
</script>

<template>
  <div class="flashcard-room">
    <div class="room-stage">
      <div class="room-art"><TownBackground scene="lab" /></div>
      <section class="room-screen room-timer" aria-label="Study timer"><slot name="timer" /></section>
      <section class="room-screen room-progress" aria-label="Revision progress"><slot name="progress" /></section>
      <section class="room-screen room-content" aria-label="Flashcard display"><slot /></section>
      <div class="room-buddy">
        <PokemonBuddy v-if="pokemon" :active-pokemon="pokemon" />
        <img v-else src="/assets/quiz_buddy.png" alt="Pokémon companion preview" />
      </div>
      <div class="room-controls"><slot name="controls" /></div>
    </div>
    <div class="room-practice"><slot name="practice" /></div>
  </div>
</template>

<style scoped>
.flashcard-room { container-type: inline-size; min-width: 0; }
.room-stage { position: relative; aspect-ratio: 1672 / 941; isolation: isolate; border-radius: 18px; background: #102b48; overflow: hidden; }
.room-art { position: absolute; inset: 0; z-index: -1; }
.room-screen { position: absolute; overflow: auto; padding: 1cqw; color: #eff7ff; scrollbar-width: thin; }
.room-content { left: 32%; top: 21%; width: 36%; height: 32%; }
.room-timer { left: 7.8%; top: 21%; width: 19.5%; height: 17%; }
.room-progress { left: 9%; top: 45%; width: 15.5%; height: 14%; }
.room-buddy { position: absolute; left: 75%; top: 41%; width: 15%; height: 30%; display: grid; place-items: end center; }
.room-buddy :deep(img) { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
.room-controls { position: absolute; left: 32%; top: 82%; width: 36%; height: 13%; display: grid; align-items: center; }
.room-practice { margin-top: 16px; }
.room-screen :deep(h2), .room-screen :deep(h3), .room-screen :deep(p) { color: inherit; }
.room-screen :deep(p) { font-size: clamp(12px, 1.1cqw, 17px); margin-bottom: 8px; }
.room-content :deep(.study-flip-card) { min-height: 0; height: 100%; border: 0; border-radius: 4px; background: transparent; color: white; }
.room-content :deep(.study-card-inner) { min-height: 100%; height: 100%; }
.room-content :deep(.study-card-face) { min-height: 100%; height: 100%; padding: 4px; overflow: auto; background: #133858; color: white; }
.room-content :deep(.study-card-text) { font-size: clamp(14px, 1.5cqw, 23px); }
.room-content :deep(.study-note), .room-content :deep(.study-eyebrow) { color: #d4e8ff; font-size: 12px; }
.room-content :deep(.study-completion), .room-content :deep(.study-empty), .room-content :deep(.study-message) { background: #133858; color: white; padding: 8px; }
.room-content :deep(h3) { margin-top: 0; font-size: 20px; }
.room-controls :deep(.study-ratings) { margin: 0; gap: 6px; justify-content: center; }
.room-controls :deep(button) { padding: 8px; font-size: clamp(11px, 1cqw, 16px); }
.room-timer :deep(.study-timer) { border: 0; background: transparent; padding: 0; box-shadow: none; color: white; }
.room-timer :deep(h2) { font-size: 12px; margin-bottom: 4px; }
.room-timer :deep(.study-timer-display) { font-size: clamp(24px, 3.2cqw, 48px); }
.room-timer :deep(.study-button-row) { margin: 2px 0; gap: 4px; }
.room-timer :deep(button) { padding: 5px; font-size: 11px; }
@container (max-width: 1000px) {
  .room-stage { aspect-ratio: auto; padding-top: 56.28cqw; }
  .room-art { inset: 0 0 auto; height: 56.28cqw; }
  .room-screen, .room-controls { position: relative; inset: auto; width: auto; height: auto; margin: 12px; padding: 16px; border: 1px solid #4ba5d0; border-radius: 12px; background: #133858; }
  .room-content { min-height: 280px; }
  .room-buddy { top: 23cqw; height: 17cqw; }
  .room-content :deep(.study-flip-card), .room-content :deep(.study-card-inner), .room-content :deep(.study-card-face) { min-height: 250px; }
  .room-screen :deep(p), .room-content :deep(.study-note) { font-size: 14px; }
  .room-content :deep(.study-card-text) { font-size: 20px; }
  .room-timer :deep(.study-timer-display) { font-size: 44px; }
  .room-controls :deep(button), .room-timer :deep(button) { font-size: 14px; min-height: 44px; padding: 10px; }
}
</style>
