<script setup>
import { computed, onMounted, ref } from 'vue'
import { getCurrentProfile } from '../../services/profileService'
import { avatarOptions } from '../../data/avatarOptions'

const profile = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const avatar = computed(() =>
  avatarOptions.find((option) => option.value === profile.value?.avatar_choice),
)

async function loadProfile() {
  if (loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    profile.value = await getCurrentProfile()
  } catch {
    errorMessage.value = 'We couldn’t load your profile. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <section class="profile-summary" aria-label="Your profile" :aria-busy="loading">
    <p v-if="loading" role="status">Loading your profile…</p>
    <div v-else-if="errorMessage" role="alert">
      <p>{{ errorMessage }}</p>
      <button type="button" @click="loadProfile">Try again</button>
    </div>
    <div v-else-if="profile">
      <span v-if="avatar?.image" class="profile-avatar-frame">
        <img
          class="profile-avatar"
          :class="{ 'ditto-avatar': avatar.value === 'prefer_not_to_say' }"
          :src="avatar.image"
          :alt="avatar.imageAlt || `${avatar.label} avatar`"
        />
      </span>
      <p class="welcome">Welcome, {{ profile.display_name }}!</p>
      <p v-if="profile.school_level">{{ profile.school_level.name }}</p>
    </div>
  </section>
</template>

<style scoped>
.profile-summary {
  padding: 12px 20px;
  border: 2px solid #ffd000;
  border-radius: 12px;
  background: #072578eb;
  color: white;
  text-align: center;
  max-width: min(90vw, 440px);
  overflow-wrap: anywhere;
}
p {
  margin: 4px 0;
}
.welcome {
  font-weight: 700;
}
.profile-avatar {
  width: 64px;
  height: 80px;
  object-fit: contain;
  image-rendering: pixelated;
}
.profile-avatar-frame {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  width: 64px;
  height: 80px;
  overflow: hidden;
}
.profile-avatar.ditto-avatar {
  transform: scale(2);
  transform-origin: center;
}
button {
  margin-top: 8px;
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 8px;
  border: 0;
  background: #ffd000;
  color: #2b2100;
}
</style>
