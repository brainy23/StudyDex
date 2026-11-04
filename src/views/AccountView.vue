<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import BackToHome from '../components/common/BackToHome.vue'
import DeleteAccountPanel from '../components/common/DeleteAccountPanel.vue'
import { avatarOptions } from '../data/avatarOptions'
import { getCurrentProfile } from '../services/profileService'
import {
  getAccountSettings,
  getCurrentEmailSettings,
  getSchoolLevels,
  requestEmailChange,
  resendEmailChange,
  updateCurrentProfile,
} from '../services/accountService'

const loading = ref(true)
const loadError = ref('')
const profile = ref(null)
const levels = ref([])
const displayName = ref('')
const schoolLevelId = ref('')
const avatarChoice = ref('')
const currentEmail = ref('')
const pendingEmail = ref('')
const newEmail = ref('')
const savingProfile = ref(false)
const savingEmail = ref(false)
const profileError = ref('')
const emailError = ref('')
const profileMessage = ref('')
const emailMessage = ref('')
const checkingEmail = ref(false)
const deletingAccount = ref(false)
let refreshingAvatar = false
let accountPageActive = true
const isLocalDevelopment = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)

const profileDirty = computed(
  () =>
    profile.value &&
    (displayName.value.trim() !== profile.value.display_name ||
      schoolLevelId.value !== (profile.value.school_level_id || '') ||
      avatarChoice.value !== profile.value.avatar_choice),
)
const canChangeEmail = computed(() => {
  const next = newEmail.value.trim().toLowerCase()
  return (
    next && next !== currentEmail.value.toLowerCase() && next !== pendingEmail.value.toLowerCase()
  )
})

function resetProfile() {
  displayName.value = profile.value.display_name
  schoolLevelId.value = profile.value.school_level_id || ''
  avatarChoice.value = profile.value.avatar_choice
  profileError.value = ''
  profileMessage.value = ''
}

async function loadAccount() {
  loading.value = true
  loadError.value = ''
  try {
    const [account, schoolLevels] = await Promise.all([getAccountSettings(), getSchoolLevels()])
    profile.value = account.profile
    levels.value = schoolLevels
    currentEmail.value = account.email
    pendingEmail.value = account.pendingEmail
    newEmail.value = account.pendingEmail || account.email
    resetProfile()
  } catch {
    loadError.value = 'We couldn’t load your account. Please try again.'
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  if (savingProfile.value || savingEmail.value || deletingAccount.value) return
  savingProfile.value = true
  profileError.value = ''
  profileMessage.value = ''
  try {
    profile.value = await updateCurrentProfile({
      displayName: displayName.value,
      schoolLevelId: schoolLevelId.value,
      avatarChoice: avatarChoice.value,
    })
    resetProfile()
    profileMessage.value = 'Profile saved.'
  } catch (error) {
    profileError.value = error.message || 'We couldn’t save your profile. Please try again.'
  } finally {
    savingProfile.value = false
  }
}

async function changeEmail() {
  if (savingEmail.value || savingProfile.value || deletingAccount.value) return
  savingEmail.value = true
  emailError.value = ''
  emailMessage.value = ''
  try {
    const result = await requestEmailChange(newEmail.value)
    currentEmail.value = result.email
    pendingEmail.value = result.pendingEmail
    newEmail.value = result.pendingEmail || result.email
    emailMessage.value = result.needsConfirmation
      ? 'Email change requested. Check your inboxes for confirmation links.'
      : 'Your sign-in email has been updated.'
  } catch (error) {
    emailError.value = error.message || 'We couldn’t request your email change. Please try again.'
  } finally {
    savingEmail.value = false
  }
}

async function refreshEmailStatus() {
  if (loading.value || savingEmail.value || savingProfile.value || checkingEmail.value || deletingAccount.value) return
  checkingEmail.value = true
  emailError.value = ''
  try {
    const previousEmail = currentEmail.value
    const previousPending = pendingEmail.value
    const result = await getCurrentEmailSettings()
    const inputUnchanged = [previousEmail, previousPending].includes(newEmail.value)
    currentEmail.value = result.email
    pendingEmail.value = result.pendingEmail
    if (inputUnchanged) newEmail.value = result.pendingEmail || result.email
    if (previousPending && !result.pendingEmail && result.email !== previousEmail) {
      emailMessage.value = 'Your sign-in email has been updated.'
    }
  } catch {
    emailError.value = 'We couldn’t check your email status. Please try again.'
  } finally {
    checkingEmail.value = false
  }
}

async function resendConfirmation() {
  if (savingEmail.value || savingProfile.value || checkingEmail.value || deletingAccount.value) return
  savingEmail.value = true
  emailError.value = ''
  emailMessage.value = ''
  try {
    await resendEmailChange()
    emailMessage.value =
      'Fresh confirmation emails requested. Open the newest link in both inboxes.'
  } catch (error) {
    emailError.value =
      error.message || 'We couldn’t resend your confirmation emails. Please try again.'
  } finally {
    savingEmail.value = false
  }
}

async function refreshAvatar() {
  if (loading.value || savingProfile.value || savingEmail.value || refreshingAvatar || !profile.value || deletingAccount.value) return
  refreshingAvatar = true
  const accountId = profile.value.id
  const previousAvatar = profile.value.avatar_choice
  try {
    const saved = await getCurrentProfile()
    if (!accountPageActive || savingProfile.value || savingEmail.value || profile.value?.id !== accountId || saved.id !== accountId) return
    // Keep unsaved name/level changes, and preserve an explicitly edited avatar too.
    const avatarEdited = avatarChoice.value !== previousAvatar
    profile.value = { ...profile.value, avatar_choice: saved.avatar_choice }
    if (!avatarEdited) avatarChoice.value = saved.avatar_choice
  } catch (error) {
    if (accountPageActive)
      profileError.value = error.message || 'We couldn’t refresh your avatar. Please try again.'
  } finally {
    refreshingAvatar = false
  }
}

function refreshAccountOnFocus() {
  refreshEmailStatus()
  refreshAvatar()
}

function accountDeleted(result) {
  if (result.accountChanged) { void loadAccount(); return }
  // Reload to remove all in-memory caches for the deleted account too.
  window.location.replace(`${import.meta.env.BASE_URL}landing-info`)
}

onMounted(() => {
  loadAccount()
  window.addEventListener('focus', refreshAccountOnFocus)
})
onUnmounted(() => {
  accountPageActive = false
  window.removeEventListener('focus', refreshAccountOnFocus)
})
</script>

<template>
  <main class="account-page">
    <div class="account-shell">
      <BackToHome variant="text" class="back-link" />
      <header>
        <p class="eyebrow">YOUR TRAINER</p>
        <h1>Account settings</h1>
        <p>Keep your trainer details up to date.</p>
      </header>

      <p v-if="loading" role="status">Loading your account…</p>
      <section v-else-if="loadError" class="account-card" role="alert">
        <p>{{ loadError }}</p>
        <button type="button" @click="loadAccount">Try again</button>
      </section>
      <template v-else>
        <form class="account-card" aria-labelledby="profile-heading" @submit.prevent="saveProfile">
          <h2 id="profile-heading">Trainer profile</h2>
          <fieldset :disabled="savingProfile || savingEmail || deletingAccount">
            <label for="display-name">Display name</label>
            <input
              id="display-name"
              v-model="displayName"
              autocomplete="nickname"
              maxlength="80"
              required
            />

            <label for="school-level">Level of study</label>
            <select id="school-level" v-model="schoolLevelId" required>
              <option disabled value="">Choose your Primary level</option>
              <option v-for="level in levels" :key="level.id" :value="level.id">
                {{ level.name }}
              </option>
            </select>

            <fieldset id="avatar-choice" class="avatar-fieldset" tabindex="-1">
              <legend>Avatar</legend>
              <div class="avatar-options">
                <label
                  v-for="option in avatarOptions"
                  :key="option.value"
                  class="avatar-option"
                  :class="{ selected: avatarChoice === option.value }"
                >
                  <input
                    v-model="avatarChoice"
                    type="radio"
                    name="avatar"
                    :value="option.value"
                  />
                  <span class="avatar-frame"
                    ><img :src="option.image" :alt="option.imageAlt || `${option.label} avatar`"
                  /></span>
                  <span>{{ option.label }}</span>
                </label>
              </div>
              <p v-if="!avatarOptions.some(option => option.value === avatarChoice)">
                Your current avatar stays until you choose a new style.
              </p>
            </fieldset>
            <div class="form-actions">
              <button type="submit" :disabled="!profileDirty || savingProfile">
                {{ savingProfile ? 'Saving…' : 'Save profile' }}
              </button>
              <button
                class="secondary"
                type="button"
                :disabled="!profileDirty"
                @click="resetProfile"
              >
                Reset changes
              </button>
            </div>
          </fieldset>
          <p v-if="profileError" class="error" role="alert">{{ profileError }}</p>
          <p v-if="profileMessage" class="success" role="status">{{ profileMessage }}</p>
        </form>

        <form class="account-card" aria-labelledby="email-heading" @submit.prevent="changeEmail">
          <h2 id="email-heading">Sign-in email</h2>
          <p>
            Current email: <strong data-testid="current-email">{{ currentEmail }}</strong>
          </p>
          <p v-if="pendingEmail" class="pending" role="status">
            Confirmation pending for {{ pendingEmail }}. Keep using {{ currentEmail }} until both
            confirmations are complete.
          </p>
          <button
            v-if="pendingEmail"
            type="button"
            class="secondary"
            :disabled="checkingEmail || savingEmail || savingProfile"
            @click="resendConfirmation"
          >
            {{ savingEmail ? 'Requesting…' : 'Resend confirmation emails' }}
          </button>
          <button
            v-if="pendingEmail"
            type="button"
            class="secondary"
            :disabled="checkingEmail || savingEmail || savingProfile"
            @click="refreshEmailStatus"
          >
            {{ checkingEmail ? 'Checking…' : 'Check confirmation status' }}
          </button>
          <fieldset :disabled="savingEmail || savingProfile || deletingAccount">
            <label for="new-email">New email address</label>
            <input
              id="new-email"
              v-model="newEmail"
              type="email"
              autocomplete="email"
              required
              aria-describedby="email-help"
            />
            <p id="email-help" class="help-text">
              You may need to confirm from both your current and new inboxes. Your current sign-in
              email stays active until the change is confirmed.
            </p>
            <p v-if="isLocalDevelopment" class="help-text">
              For local testing, keep StudyDex running and open both confirmation emails on this
              computer. Localhost links cannot open this app on your phone or another computer.
            </p>
            <button type="submit" :disabled="!canChangeEmail || savingEmail">
              {{ savingEmail ? 'Requesting…' : 'Request email change' }}
            </button>
          </fieldset>
          <p v-if="emailError" class="error" role="alert">{{ emailError }}</p>
          <p v-if="emailMessage" class="success" role="status">{{ emailMessage }}</p>
        </form>
        <DeleteAccountPanel v-if="profile" :user-id="profile.id" :email="currentEmail"
          :disabled="savingProfile || savingEmail || checkingEmail"
          @busy="deletingAccount = $event" @deleted="accountDeleted" />
      </template>
    </div>
  </main>
</template>

<style scoped>
.account-page {
  min-height: 100vh;
  padding: 32px 20px 64px;
  background: linear-gradient(145deg, #071738, #1f3a76);
  color: #f8fbff;
}
.account-shell {
  max-width: 760px;
  margin: 0 auto;
}
.back-link {
  color: #ffdb60;
  text-decoration: none;
  font-weight: 700;
}
header {
  margin: 32px 0;
}
.eyebrow {
  letter-spacing: 0.16em;
  font-size: 12px;
  color: #ffdb60;
}
h1 {
  margin: 8px 0;
  font-size: clamp(28px, 5vw, 40px);
}
h2 {
  margin: 0 0 24px;
  font-size: 22px;
}
.account-card {
  background: #102550;
  border: 1px solid #456095;
  border-radius: 18px;
  padding: clamp(20px, 4vw, 32px);
  margin-top: 24px;
  box-shadow: 0 12px 30px #0003;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
label,
legend {
  display: block;
  font-weight: 600;
  margin: 20px 0 8px;
}
input:not([type='radio']),
select {
  display: block;
  width: 100%;
  min-height: 46px;
  border-radius: 8px;
  border: 1px solid #b9c9e8;
  padding: 10px 12px;
  background: #fff;
  color: #102550;
  font: inherit;
}
input:focus-visible,
select:focus-visible,
button:focus-visible,
a:focus-visible,
fieldset:focus-visible {
  outline: 3px solid #ffdb60;
  outline-offset: 3px;
}
.avatar-fieldset {
  margin: 24px 0;
}
.avatar-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.avatar-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 12px 8px;
  border: 2px solid #6582b8;
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  font-size: 14px;
}
.avatar-option.selected {
  border-color: #ffdb60;
  background: #1f3a76;
}
.avatar-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 72px;
}
.avatar-frame img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}
input[type='radio'] {
  accent-color: #ffdb60;
}
button {
  border: 0;
  border-radius: 9px;
  background: #ffdb60;
  color: #17213c;
  font: inherit;
  font-weight: 700;
  padding: 12px 18px;
  cursor: pointer;
}
button.secondary {
  background: transparent;
  border: 1px solid #a9bce2;
  color: #f8fbff;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}
.help-text {
  color: #c7d4ec;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 24px;
}
.success {
  color: #a6f2bd;
}
.pending {
  color: #ffdb60;
}
.error {
  color: #ffc1c1;
}
.account-card p {
  overflow-wrap: anywhere;
}
</style>
