<script setup>
import { RouterView, useRouter } from 'vue-router'
import { onMounted, onUnmounted, ref } from 'vue'
import { getSupabase } from './lib/supabase'
import { usePokemonTransition } from './composables/usePokemonTransition'
import { provideWeatherLocation } from './composables/useWeatherLocation'
import PokemonTransition from './components/common/PokemonTransition.vue'
import TimePreview from './components/common/TimePreview.vue'

const showTimePreview = import.meta.env.DEV

const weather = provideWeatherLocation()
const router = useRouter()
const accountId = ref(null)
const authReady = ref(false)
let subscription, redirect
onMounted(() => {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    const next = session?.user?.id || null
    if (authReady.value && next !== accountId.value) {
      usePokemonTransition().cancel()
      weather.resetLocationState()
      clearTimeout(redirect)
      redirect = setTimeout(() => { void router.replace({ name: next ? 'landing' : 'login' }) }, 0)
    }
    accountId.value = next
    authReady.value = true
  })
  subscription = data.subscription
})
onUnmounted(() => { subscription?.unsubscribe(); clearTimeout(redirect) })
</script>

<template>
  <TimePreview v-if="showTimePreview" />
  <RouterView v-if="authReady" v-slot="{ Component }">
    <component :is="Component" :key="accountId || 'signed-out'" />
  </RouterView>
  <PokemonTransition />
</template>
