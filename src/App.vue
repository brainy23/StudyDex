<script setup>
import { RouterView } from 'vue-router'
import { provideWeatherLocation } from './composables/useWeatherLocation'
import PokemonTransition from './components/common/PokemonTransition.vue'

provideWeatherLocation()
</script>

<template>
  <RouterView />
  <PokemonTransition />
</template>
