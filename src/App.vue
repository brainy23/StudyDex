<script setup>
import { RouterView } from 'vue-router'
import { provideWeatherLocation } from './composables/useWeatherLocation'
import ArenaTransition from './components/common/ArenaTransition.vue'

provideWeatherLocation()
</script>

<template>
  <RouterView />
  <ArenaTransition />
</template>
