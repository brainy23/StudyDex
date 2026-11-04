<script setup>
defineOptions({ name: 'TrainerLandingPage' })
import ProfileSummary from '../common/ProfileSummary.vue'
import { useOnboarding } from '../../composables/useOnboarding'
import { onboardingDestination } from '../../services/onboardingService'
const { status, loading, error, refresh } = useOnboarding()
// Each cloud: file, top (% from top), width (px), speed (seconds to cross), start (0-1)
// Big clusters are slow, small clouds are fast.
const clouds = [
  ['cloud_cluster1.png',      4, 200, 120, 0.00],
  ['cloud_cluster2.png',     20, 256, 130, 0.15],
  ['cloud_cluster3.png',      2, 240, 125, 0.30],
  ['cloud_tower2_pixel.png', 28, 274, 140, 0.45],
  ['cloud_cluster1.png',     14, 200, 120, 0.60],
  ['cloud_cluster2.png',     34, 256, 130, 0.75],
  ['cloud_cluster3.png',     10, 240, 125, 0.90],
  ['cloud1.png',              8, 144,  60, 0.05],
  ['cloud2.png',             24, 104,  50, 0.20],
  ['cloud3.png',              0,  72,  40, 0.35],
  ['cloud1.png',             38, 144,  60, 0.50],
  ['cloud2.png',             16, 104,  50, 0.65],
  ['cloud3.png',             30,  72,  40, 0.80],
  ['cloud1.png',              2, 108,  55, 0.95],
]
</script>

<template>
  <div class="hero">
    <img
      v-for="([file, top, w, speed, start], i) in clouds"
      :key="i"
      :src="`/backgrounds/${file}`"
      class="cloud"
      :style="{
        top: top + '%',
        width: w + 'px',
        animationDuration: speed + 's',
        animationDelay: -speed * start + 's',
      }"
      alt=""
    />

    <div class="front">
      <img src="/backgrounds/studydex_logo.png" alt="StudyDex" class="logo" />
      <h3>Learn. Evolve. Grow.</h3>
      <ProfileSummary v-if="status" :key="status.user_id" />
      <p v-if="loading" role="status">Getting your journey ready…</p>
      <div v-else-if="error" class="setup-error" role="alert">
        <p>{{ error }}</p><button type="button" class="enter-btn" @click="refresh">Try again</button>
      </div>
      <RouterLink v-else-if="status" :to="onboardingDestination(status)" class="enter-btn">
        {{ status.onboarding_complete ? 'Start' : 'Start your journey' }}
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: url('/backgrounds/landing_no_logo.png') center top / cover;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cloud {
  position: absolute;
  left: 0;
  image-rendering: pixelated;
  animation: drift linear infinite;
}

@keyframes drift {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100vw); }
}

.front {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.logo {
  width: min(60vw, 360px);
}

.enter-btn {
  padding: 12px 28px;
  border-radius: 12px;
  background: #ffd000;
  color: #2b2100;
  border: 3px solid #1f3a93;
  box-shadow: 0 5px 0 #1f3a93;
  font: 700 18px 'Nunito', sans-serif;
  text-decoration: none;
}

.enter-btn:active {
  transform: translateY(4px);
  box-shadow: 0 1px 0 #1f3a93;
}
</style>
