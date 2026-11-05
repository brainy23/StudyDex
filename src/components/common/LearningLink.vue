<script setup>
import { RouterLink } from 'vue-router'
import { useBuddySleep } from '../../composables/useBuddySleep'
defineProps({ to: { type: [String, Object], required: true } })
const { isSleeping } = useBuddySleep()
</script>

<template>
  <button v-if="isSleeping" type="button" disabled aria-disabled="true" title="Your Pokémon is sleeping. Learning opens at 7am Singapore time."><slot /></button>
  <RouterLink v-else :to="to"><slot /></RouterLink>
</template>
