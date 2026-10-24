<script setup>
import { RouterView } from 'vue-router'
import { provideWeatherLocation } from './composables/useWeatherLocation'

provideWeatherLocation()
</script>

<template>
  <RouterView />
</template>
