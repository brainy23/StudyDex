<script setup>
import { RouterView, useRouter } from 'vue-router'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { getSupabase } from './lib/supabase'
import { usePokemonTransition } from './composables/usePokemonTransition'
import { provideWeatherLocation } from './composables/useWeatherLocation'
import PokemonTransition from './components/common/PokemonTransition.vue'
import FloatingStudyTimer from './components/common/FloatingStudyTimer.vue'
import { provideFloatingStudyTimer } from './composables/useFloatingStudyTimer'


const weather = provideWeatherLocation()
const router = useRouter()
const studyTimer = provideFloatingStudyTimer()
watch([() => router.currentRoute.value.name, studyTimer.session.ready], ([name]) => {
  if (name === 'surprise-boss') void studyTimer.pause()
})
const accountId = ref(null)
const authReady = ref(false)
let subscription, redirect
onMounted(() => {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    const next = session?.user?.id || null
    if (studyTimer.profile.value && studyTimer.profile.value.id !== next) studyTimer.clear()
    if (next) void studyTimer.restore(next)
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
  <RouterView v-if="authReady" v-slot="{ Component }">
    <component :is="Component" :key="accountId || 'signed-out'" />
  </RouterView>
  <FloatingStudyTimer v-if="authReady && studyTimer.visible.value && router.currentRoute.value.name !== 'surprise-boss'"
    :key="accountId" :controller="studyTimer" />
  <PokemonTransition />
</template>
