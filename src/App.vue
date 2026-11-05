<script setup>
import { RouterView, useRouter } from 'vue-router'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { getSupabase } from './lib/supabase'
import { usePokemonTransition } from './composables/usePokemonTransition'
import { provideWeatherLocation } from './composables/useWeatherLocation'
import PokemonTransition from './components/common/PokemonTransition.vue'
import FloatingStudyTimer from './components/common/FloatingStudyTimer.vue'
import { useBuddySleep } from './composables/useBuddySleep'
import { isLearningRoute } from './utils/buddySleep'
import { provideFloatingStudyTimer } from './composables/useFloatingStudyTimer'


const weather = provideWeatherLocation()
const router = useRouter()
const studyTimer = provideFloatingStudyTimer()
const { isSleeping } = useBuddySleep()
const showStudyTimer = computed(() => !isSleeping.value && ['learn', 'study-decks'].includes(router.currentRoute.value.name))
watch([showStudyTimer, studyTimer.session.ready], ([shown]) => {
  if (!shown) void studyTimer.pause()
})
const accountId = ref(null)
const authReady = ref(false)
watch([isSleeping, () => router.currentRoute.value.fullPath, authReady], ([sleeping]) => {
  if (!sleeping || !authReady.value || !isLearningRoute(router.currentRoute.value)) return
  void studyTimer.pause()
  usePokemonTransition().cancel()
  void router.replace({ name: 'home' }).catch(() => {})
}, { immediate: true })
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
  <FloatingStudyTimer v-if="authReady && studyTimer.visible.value && showStudyTimer"
    :key="accountId" :controller="studyTimer" />
  <PokemonTransition />
</template>
