<script setup>
import { ref, computed, onMounted,onUnmounted, watch } from 'vue'
import { registerUser } from '../services/registrationService'
import { getSupabase } from '../lib/supabase'
import { useRouter } from 'vue-router'
import { avatarOptions } from '../data/avatarOptions'
import axios from 'axios'

const POKEMON_API_URL = import.meta.env.VITE_POKE_API_URL
const router = useRouter()
const question_no = ref(1)
const submitting = ref(false)
const completed = ref(false)
const needsEmailConfirmation = ref(false)
const errorMessage = ref('')
const confirmationState = ref('')
const confirmationTitle = computed(() => {
  if (confirmationState.value === 'checking') return 'Checking confirmation…'
  if (confirmationState.value === 'pending') return 'Check your other inbox'
  return 'Confirmation link unavailable'
})

async function submitRegistration() {
  if (submitting.value) return
  errorMessage.value = ''
  submitting.value = true
  try {
    const result = await registerUser({
      email: email_field.value,
      displayName: username_field.value,
      schoolLevel: level_selector.value,
      avatarChoice: avatarChoice.value,
      password: password_field.value,
      confirmPassword: confirmPassword_field.value,
    })
    needsEmailConfirmation.value = result.needsEmailConfirmation
    completed.value = true
    password_field.value = ''
    confirmPassword_field.value = ''
    if (!result.needsEmailConfirmation) await router.replace({ name: 'starter' })
  } catch (error) {
    errorMessage.value = error.message || 'Registration failed. Please try again.'
  } finally {
    submitting.value = false
  }
}

const password_field = ref('')
const email_field = ref('')
const username_field = ref('')
const level_selector = ref('default')
const confirmPassword_field = ref('')
const avatarChoice = ref('')

const checkPW = computed(() => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_field.value.trim()))
const checkUsername = computed(
  () => username_field.value.trim() === '' || username_field.value.trim().length > 80,
)
const checkLevel = computed(
  () => !['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].includes(level_selector.value),
)
const passed_password_check = computed(() => {
  const password = password_field.value
  return password.length >= 8 && /\d/.test(password) && /[a-zA-Z]/.test(password)
})
const checkIfPasswordsMismatch = computed(
  () => password_field.value !== confirmPassword_field.value,
)
const locked = computed(() => {
  switch (question_no.value) {
    case 1:
      return checkPW.value
    case 2:
      return checkUsername.value
    case 3:
      return checkLevel.value
    case 4:
      return !avatarOptions.some((option) => option.value === avatarChoice.value)
    case 5:
      return !passed_password_check.value || checkIfPasswordsMismatch.value
    default:
      return true
  }
})

// error messages
const attemptedNext = ref(false)

const pikachuError = computed(() => {
  // Registration errors returned by your service
  if (errorMessage.value) {
    return `Pika! ${errorMessage.value}`
  }

  if (!attemptedNext.value || !locked.value) return ''

  switch (question_no.value) {
    case 1:
      return 'Pika! Please enter a valid email address.'

    case 2:
      return 'Pika! Your name must be between 1 and 80 characters.'

    case 3:
      return 'Pika! Choose your Primary level first.'

    case 4:
      return 'Pika! Choose an avatar for your adventure!'

    case 5:
      if (!passed_password_check.value) {
        return 'Pika! Use at least 8 characters, including a letter and a number.'
      }

      if (!confirmPassword_field.value) {
        return 'Pika! Enter your password again to confirm it.'
      }

      if (checkIfPasswordsMismatch.value) {
        return 'Pika! Your passwords don’t match. Try again!'
      }

      return ''

    default:
      return ''
  }
})

watch(question_no, () => {
  attemptedNext.value = false
  errorMessage.value = ''
})

// animated pokemon sprite
// PIKACHU SPRITES
const pikachuSprites = ref({
  front: '',
  back: '',
  shinyFront: '',
  shinyBack: '',
})

const pikachuAction = ref('')

let pikachuTimer
const pikachuController = new AbortController()



const pikachuImage = computed(() => {
  const sprites = pikachuSprites.value
  const hasError = Boolean(pikachuError.value)

  // Keep facing backwards whenever a password is exposed
  if (passwordExposed.value) {
    return hasError ? sprites.shinyBack : sprites.back
  }

  return hasError ? sprites.shinyFront : sprites.front
})

const pikachuMessage = computed(() => {
  if (submitting.value) {
    return 'Getting your account ready…'
  }

  if (pikachuError.value) {
    return pikachuError.value
  }

  if (passwordExposed.value) {
    return 'Pika! No peeking! 🙈'
  }

  if (!locked.value) {
    return 'Pika pika! Looking good!'
  }

  switch (question_no.value) {
    case 1:
      return 'What’s your email address? Pika!'

    case 2:
      return 'What should I call you, Trainer?'

    case 3:
      return 'Which Primary level are you in?'

    case 4:
      return 'Choose your trainer avatar! Pika!'

    case 5:
      return passed_password_check.value
        ? 'Enter your password again to confirm it!'
        : 'Choose a password with at least 8 characters, a letter and a number.'

    default:
      return 'Ready for your adventure?'
  }
})

function playPikachuAction(action) {
  clearTimeout(pikachuTimer)

  // Changing the key restarts the animation on repeated clicks.
  pikachuAction.value = action

  pikachuTimer = setTimeout(() => {
    pikachuAction.value = ''
  }, 900)
}

// Celebrate only when the current step changes from invalid to valid.
watch(
  [question_no, locked],
  ([step, isLocked], [previousStep, wasLocked]) => {
    clearTimeout(pikachuTimer)
    pikachuAction.value = ''

    if (step === previousStep && wasLocked && !isLocked) {
      playPikachuAction('celebrate')
    }
  }
)

function handleNext() {
  if (submitting.value) return

  attemptedNext.value = true
  errorMessage.value = ''

  if (locked.value) {
    playPikachuAction('attack')
    return
  }

  if (question_no.value < 5) {
    question_no.value++
  } else {
    submitRegistration()
  }
}

onMounted(async () => {

  // ========================================
  // 1. HANDLE SUPABASE EMAIL CONFIRMATION
  // ========================================

  const callback = new URLSearchParams(window.location.hash.slice(1))
  const query = new URLSearchParams(window.location.search)

  if (
    callback.has('error') ||
    callback.has('error_code') ||
    query.has('error') ||
    query.has('error_code')
  ) {
    confirmationState.value = 'error'
    errorMessage.value =
      'This confirmation link is invalid or expired. For an email change, return to account settings to resend the confirmation emails. If you already confirmed, log in.'

  } else if (
    callback.has('access_token') ||
    callback.has('message') ||
    query.has('message')
  ) {
    confirmationState.value = 'checking'
    submitting.value = true

    try {
      if (!callback.has('access_token')) {
        confirmationState.value = 'pending'
      } else {
        const { data, error } = await getSupabase().auth.getUser()

        if (error || !data.user) {
          throw new Error(
            'Unable to confirm your account. Please try your email link again.'
          )
        }

        if (callback.get('type') === 'email_change' && data.user.new_email) {
          confirmationState.value = 'pending'
        } else {
          await router.replace({
            name: callback.get('type') === 'email_change'
              ? 'account'
              : 'starter',
          })
        }
      }

    } catch (error) {
      confirmationState.value = 'error'
      errorMessage.value = error.message

    } finally {
      submitting.value = false
    }
  }

  // ========================================
  // 2. FETCH ANIMATED PIKACHU FROM POKÉAPI
  // ========================================

  try {
    const response = await axios.get(
      `${POKEMON_API_URL}/pokemon/25/`,
      { signal: pikachuController.signal }
    )

    const data = response.data

    const animated =
      data.sprites.versions?.['generation-v']
        ?.['black-white']?.animated

    pikachuSprites.value = {
      front:
        animated?.front_default ||
        data.sprites.front_default,

      back:
        animated?.back_default ||
        data.sprites.back_default ||
        data.sprites.front_default,

      shinyFront:
        animated?.front_shiny ||
        data.sprites.front_shiny ||
        data.sprites.front_default,

      shinyBack:
        animated?.back_shiny ||
        data.sprites.back_shiny ||
        data.sprites.back_default,
    }

  } catch (error) {
    if (error.code !== 'ERR_CANCELED') {
      console.warn('Pikachu could not load:', error)
    }
  }

})

onUnmounted(() => {
  clearTimeout(pikachuTimer)
  pikachuController.abort()
})

// password
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const passwordExposed = computed(() =>
  question_no.value === 5 &&
  (showPassword.value || showConfirmPassword.value)
)

// Hide passwords whenever the user changes steps
watch(question_no, () => {
  showPassword.value = false
  showConfirmPassword.value = false
})
</script>
<template>
  <main>
    <div class="register-bg">
       <!-- BACK TO STUDYDEX -->
      <RouterLink to="/landing-info" class="back-home">
        ← Back to StudyDex
      </RouterLink>
      <div
        v-if="confirmationState"
        class="container completion"
        :role="confirmationState === 'error' ? 'alert' : 'status'"
      >
        <h1>{{ confirmationTitle }}</h1>
        <p v-if="confirmationState === 'checking'">Please wait while we check your confirmation.</p>
        <p v-else-if="confirmationState === 'pending'">
          If you requested an email change, open the confirmation links in both your current and new
          inboxes. Then return to account settings to check your sign-in email.
        </p>
        <p v-else>{{ errorMessage }}</p>
        <template v-if="confirmationState !== 'checking'">
          <RouterLink to="/account">Account settings</RouterLink>
          <RouterLink to="/login">Log in</RouterLink>
          <!-- <RouterLink to="/landing-info">Back to StudyDex</RouterLink> -->
        </template>
      </div>
      <div v-else-if="completed" class="container completion" role="status">
        <h1>{{ needsEmailConfirmation ? 'Check your email' : 'Your account is ready!' }}</h1>
        <p v-if="needsEmailConfirmation">
          If this address is eligible for signup, you’ll receive a confirmation email. Follow its
          link to finish setting up your account.
        </p>
        <p v-else>Your StudyDex profile is ready.</p>
        <RouterLink v-if="!needsEmailConfirmation" to="/starter">Choose your starter</RouterLink>
        <RouterLink v-if="needsEmailConfirmation" to="/login">Log in after confirming</RouterLink>
        <RouterLink to="/landing-info">Back to StudyDex</RouterLink>
      </div>
      <form
        v-else
        class="container signup-form"
        novalidate
        @submit.prevent="handleNext"
      >
        <aside class="signup-pikachu">
          <div class="pikachu-speech">
            <span class="pikachu-speaker">Pikachu</span>
            <p
              role="status"
              aria-atomic="true"
              :class="{
                'text-danger': pikachuError,
                'error-blink': pikachuError
              }"
            >
              {{ pikachuMessage }}
            </p>
          </div>

          <div class="pikachu-stage" aria-hidden="true">
            <div
              class="pikachu-character"
              :class="{
                'is-attacking': pikachuAction === 'attack',
                'is-celebrating': pikachuAction === 'celebrate'
              }"
            >
              <img
                v-if="pikachuImage"
                :src="pikachuImage"
                alt=""
                class="pikachu-sprite"
                :class="{ 'has-error': pikachuError }"
              />

              <span
                v-if="pikachuAction === 'celebrate'"
                class="pikachu-sparkles"
              >
                ✨
              </span>
            </div>

            <div class="pikachu-shadow"></div>
          </div>
        </aside>
        <fieldset class="signup-fields" :disabled="submitting">
          <!-- STUDYDEX LOGO -->
          <div class="signup-logo-container">
            <img
              src="/assets/studydexlogo.png"
              alt="StudyDex Logo"
              class="signup-logo"
            />
          </div>
          <div class="form-heading">
            <h2 class="form-title">Trainer Registration</h2>
            <span class="form-title-divider"></span>
            <!-- <div class="form-title-divider"></div> -->
            <p class="step-counter">Step {{ question_no }} of 5</p>
          </div>

          <p class="question-prompt" v-if="question_no == 3">Which Primary level are you in?</p>
          <!-- Signup details -->
          <p class="question-prompt" v-if="question_no == 1">What's your email?</p>
          <p class="question-prompt" v-if="question_no == 2">What's your name?</p>
          <p class="question-prompt" v-if="question_no == 5">Enter a Password</p>

          <div class="input-container" v-if="question_no == 1">
            <input
              v-model="email_field"
              type="email"
              name=""
              id="email-input"
              aria-label="Email address"
              autocomplete="email"
              placeholder="Enter Email"
            /><br />
            <!-- <p class="pw-not-fulfilled" v-if="checkPW">
              Pokemon is waiting for a valid email address
            </p> -->
          </div>

          <div class="input-container" v-if="question_no == 2">
            <input
              v-model="username_field"
              type="text"
              name=""
              id="username-input"
              aria-label="Display name"
              autocomplete="nickname"
              maxlength="80"
              placeholder="Enter Username"
            /><br />
            <!-- <p class="pw-not-fulfilled" v-if="checkUsername">
              Enter a name between 1 and 80 characters.
            </p> -->
            <!-- <input v-model="password_input" type="password" name="" id="password-input" aria-label="Password" placeholder="Enter Password">
          <input  type="password" name="" id="confirm-password-input" aria-label="Confirm password" placeholder="Confirm Password"> -->
          </div>
          <div class="select-container" v-if="question_no == 3">
            <select name="" id="level-selector" aria-label="School level" v-model="level_selector">
              <option value="default">Select Level</option>
              <option value="p1">Primary 1</option>
              <option value="p2">Primary 2</option>
              <option value="p3">Primary 3</option>
              <option value="p4">Primary 4</option>
              <option value="p5">Primary 5</option>
              <option value="p6">Primary 6</option>
            </select>
            <!-- <div>
              <p class="pw-not-fulfilled" v-if="checkLevel">Please select your level</p>
            </div> -->
          </div>

          <fieldset v-if="question_no === 4" class="avatar-step">
            <legend class="question-prompt">Choose your avatar</legend>
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
                  required
                />
                <span v-if="option.image" class="avatar-image-frame">
                  <img
                    :class="{ 'ditto-avatar': option.value === 'prefer_not_to_say' }"
                    :src="option.image"
                    :alt="option.imageAlt || `${option.label} avatar`"
                  />
                </span>
                <span class="avatar-label">{{ option.label }}</span>
              </label>
            </div>
          </fieldset>

          <div class="input-container" v-if="question_no == 5">
            <div class="password-wrapper">
              <input
                :type="showPassword ? 'text' : 'password'"
                id="password-input"
                aria-label="Password"
                autocomplete="new-password"
                placeholder="Password"
                v-model="password_field"
              />

              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword"
                aria-controls="password-input"
                @click="showPassword = !showPassword"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  <path v-if="showPassword" d="m3 3 18 18" />
                </svg>
              </button>
            </div>
            <br />

            <!-- <ul v-if="!passed_password_check">
              <li :class="password_field.length >= 8 ? 'pw-fulfilled' : 'pw-not-fulfilled'">
                Password must have at least 8 characters
              </li>
              <li :class="/[a-zA-Z]/.test(password_field) ? 'pw-fulfilled' : 'pw-not-fulfilled'">
                Password must have at least 1 alphabet
              </li>
              <li :class="/\d/.test(password_field) ? 'pw-fulfilled' : 'pw-not-fulfilled'">
                Password must have at least 1 number
              </li>
            </ul> -->
          </div>

          <div
            class="input-container"
            style="margin-top: -30px"
            v-if="question_no == 5 && passed_password_check"
          >
            <p class="question-prompt">Confirm Password</p>
            <div class="password-wrapper" style="margin-top: -20px">
              <input
                :type="showConfirmPassword ? 'text' : 'password'"
                v-model="confirmPassword_field"
                id="confirm-password-input"
                aria-label="Confirm password"
                autocomplete="new-password"
                placeholder="Re-type Password"
              />

              <button
                type="button"
                class="password-toggle"
                :aria-label="showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'"
                :aria-pressed="showConfirmPassword"
                aria-controls="confirm-password-input"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  <path v-if="showConfirmPassword" d="m3 3 18 18" />
                </svg>
              </button>
            </div>
            <br />
            <!-- <p class="pw-not-fulfilled" v-if="checkIfPasswordsMismatch" style="margin-top: -20px">
              Passwords do not match
            </p> -->
          </div>

          <div class="button-container">
            <button
              id="prevButton"
              type="button"
              :disabled="question_no === 1"
              @click="question_no -= 1"
            >
              &lt; Previous
            </button>
            <button
              id="nextButton"
              type="submit"
              :disabled="submitting"
            >
              {{
                submitting
                  ? 'Creating account…'
                  : question_no < 5
                    ? 'Next >'
                    : 'Create account'
              }}
            </button>
          </div>
          <p v-if="errorMessage" class="submission-error" role="alert">{{ errorMessage }}</p>
        </fieldset>
      </form>
      <div v-if="!completed" class="link-to-sign-in">
        <p>
          Already a trainer? <RouterLink to="/login" style="color: #ffd117">Sign In</RouterLink>
        </p>
      </div>
    </div>
  </main>
</template>
<style scoped>

.avatar-step {
  text-align: center;
}
.avatar-options {
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 12px;
  margin: 12px auto 32px;
}
.avatar-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 135px;
  min-height: 165px;
  padding: 12px;
  background: #072578;
  border: 3px solid #fff;
  border-radius: 12px;
  color: white;
  cursor: pointer;
  font-size: 22px;
}
.avatar-option.selected {
  border-color: #ffd117;
  box-shadow: 0 0 0 2px #ffd117;
}
.avatar-option img {
  height: 88px;
  width: 80px;
  object-fit: contain;
  image-rendering: pixelated;
}
.avatar-image-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 88px;
  overflow: hidden;
}
.avatar-option img.ditto-avatar {
  transform: scale(2);
  transform-origin: center;
}
.avatar-label {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.4em;
  text-align: center;
}
.avatar-option input {
  accent-color: #ffd117;
}
.avatar-option:focus-within {
  outline: 3px solid #ffd117;
  outline-offset: 3px;
}

fieldset {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}
.completion {
  text-align: center;
  padding: 24px;
  background: #072578ee;
  max-width: 600px;
  margin-inline: auto;
  border-radius: 12px;
}
.completion a {
  display: block;
  margin: 16px;
  color: #ffd117;
}
.submission-error {
  text-align: center;
  margin: 24px auto;
  padding: 12px;
  max-width: 460px;
  background: #072578;
  color: #fff;
  border: 2px solid #ffd117;
  border-radius: 12px;
}

.register-bg {
  position: relative;
  background: url('/backgrounds/signup_bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  min-height: 100vh;
  margin-top: 0px;
  display: flow-root;

  color: white;
}

.container {
  margin-top: 360px;
}

.input-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  row-gap: 20px;
}

.question-prompt {
  color: white;
  font-size: 18px;
  font-weight: 600;
  text-align: center;

  -webkit-text-stroke: 2px black;
  paint-order: stroke fill;

  margin-bottom: 12px;
}

.button-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;

  column-gap: 20px;
  margin-top: 26px;
}

.select-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  justify-self: center;

  padding: 43px;
}

#username-input,
#password-input,
#confirm-password-input,
#email-input {
  width: 360px;
  max-width: 100%;
  height: 35px;

  border: 0;
  border-radius: 20px;

  background: rgba(255, 255, 255, 0.85);
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.25);

  text-align: center;
  font-size: 18px;
  font-weight: 500;
}

/* Input placeholders */
#username-input::placeholder,
#password-input::placeholder,
#confirm-password-input::placeholder,
#email-input::placeholder {
  color: #4f5458;
  opacity: 1;
  font-size: 18px;
}

@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

#prevButton,
#nextButton {
  width: 205px;
  height: 46px;
  margin-top: -24px;

  font-weight: 600;
  font-size: 20px;
  color: white;
  box-shadow: 3px 3px 6px #232323;
  border: 2px solid #ffd117;
  border-radius: 12px;
  cursor: pointer;
  background-color: #072578;
  cursor: pointer;
}

#loginButton:hover,
#registerButton:hover {
  transform: scale(1.2);
  border-color: transparent;
  background:
    linear-gradient(#072578, #072578) padding-box,
    conic-gradient(from var(--angle), #b8860b, #ffd117, #fff2b0, #ffd117, #b8860b, #daa520, #b8860b)
      border-box;
  animation: spin-border 3s linear infinite;
  transform: scale(1.2);
}

@keyframes spin-border {
  to {
    --angle: 360deg;
  }
}

#username-input:hover,
#email-input:hover,
#prevButton:hover,
#nextButton:hover {
  transform: scale(1.1);
}

#level-selector {
  appearance: none;

  width: 180px;
  height: 40px;
  padding: 0 36px 0 14px;

  font-size: 17px;
  font-weight: 600;
  color: white;

  background-color: #072578;
  border: 2px solid #ffd117;
  border-radius: 10px;
  cursor: pointer;

  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.25);

  /* custom gold arrow */
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23ffd117' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat: no-repeat;
  background-position: right 12px center;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

#level-selector:hover {
  transform: scale(1.05);
  box-shadow: 0 0 14px rgba(255, 209, 23, 0.6);
}

#level-selector:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 209, 23, 0.4);
}

/* the opened list */
#level-selector option {
  background-color: #072578;
  color: white;

  font-size: 20px;
}

.link-to-sign-in {
  margin: 24px 0;
  text-align: center;
  color: white;
  font-size: 28px;
  -webkit-text-stroke: 4px black;
  paint-order: stroke fill;
}

.pw-not-fulfilled {
  color: rgb(234, 75, 75);
  font-size: 24px;
  -webkit-text-stroke: 4px black;
  paint-order: stroke fill;
}

.pw-fulfilled {
  color: rgb(17, 224, 76);
  font-size: 24px;
  -webkit-text-stroke: 4px black;
  paint-order: stroke fill;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 520px) {
  #username-input,
  #password-input,
  #confirm-password-input,
  #email-input {
    width: min(430px, 85vw);
  }
  .button-container {
    gap: 8px;
  }
  #prevButton,
  #nextButton {
    width: 43vw;
    font-size: 20px;
  }
}

/* added styles with animated pikachu  */
/* FORM LAYOUT */
.signup-form {
  position: relative;

  width: 100%;
  max-width: 1200px;

  margin: 0 auto;
  padding: 20px 15px;

  min-height: 100vh;

  display: flex;
  justify-content: center;
  align-items: center;
}

.signup-fields {
  position: relative;
  width: 100%;
  max-width: 620px;
  min-width: 0;
  margin: 0 auto;

  padding: 34px;
  border-radius: 28px;

  background: rgba(7, 37, 120, 0.35);
  border: 2px solid rgba(255, 209, 23, 0.9);
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.28),
    0 0 0 4px rgba(255, 255, 255, 0.08) inset;

  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.signup-pikachu {
  position: absolute;
  left: 2%;
  top: 42%;
  width: 220px;
  text-align: center;
}

/* SPEECH BUBBLE */
.pikachu-speech {
  position: relative;
  width: 220px;
  max-width: 100%;
  padding: 11px 15px;
  margin: 0 auto 20px;

  border: 2px solid #344f78;
  border-radius: 18px;

  background: #fffdf3;
  color: #2b4162;
  text-align: center;
  font-family: 'Nunito', sans-serif;

  box-shadow:
    0 4px 0 rgba(35, 57, 90, 0.18),
    0 8px 18px rgba(22, 42, 65, 0.14);
}

/* Tail pointing towards Pikachu */
.pikachu-speech::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -8px;

  width: 13px;
  height: 13px;

  background: #fffdf3;
  border-right: 2px solid #344f78;
  border-bottom: 2px solid #344f78;

  transform: translateX(-50%) rotate(45deg);
}

.pikachu-speaker {
  display: block;
  margin-bottom: 4px;

  color: #886317;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.pikachu-speech p {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.4;
}

/* PIKACHU */
.pikachu-stage {
  position: relative;
  height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pikachu-character {
  position: relative;
  z-index: 1;
}

.pikachu-sprite {
  display: block;
  width: 150px;
  height: 150px;
  object-fit: contain;
  image-rendering: pixelated;
}

.pikachu-placeholder {
  font-size: 80px;
}

.pikachu-shadow {
  position: absolute;
  bottom: 12px;
  width: 100px;
  height: 15px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.25);
}

/* ATTACK */
.pikachu-character.is-attacking {
  animation: pikachu-attack 0.9s ease;
}



@keyframes pikachu-attack {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px) rotate(-4deg); }
  40%, 80% { transform: translateX(8px) rotate(4deg); }
}


/* CELEBRATION */
.pikachu-character.is-celebrating {
  animation: pikachu-jump 0.9s ease;
}

.pikachu-sparkles {
  position: absolute;
  top: 0;
  right: -10px;
  font-size: 36px;
  pointer-events: none;
  animation: pikachu-sparkle 0.9s ease-out both;
}

@keyframes pikachu-jump {
  0%, 45%, 75%, 100% {
    transform: translateY(0);
  }

  25% {
    transform: translateY(-35px) rotate(-8deg);
  }

  60% {
    transform: translateY(-20px) rotate(8deg);
  }

  85% {
    transform: translateY(-8px);
  }
}

@keyframes pikachu-sparkle {
  from {
    opacity: 1;
    transform: translateY(0) scale(0.5);
  }

  to {
    opacity: 0;
    transform: translateY(-35px) scale(1.3);
  }
}

/* PIKACHU ABOVE THE FORM ON SMALLER SCREENS */
@media (max-width: 900px) {
  .signup-form {
    flex-direction: column;
    gap: 16px;
  }

  .signup-pikachu {
    flex: none;
    width: 220px;
  }

  .signup-fields {
    width: 100%;
  }
}

/* REDUCE EXTRA MOVEMENT WHEN REQUESTED */
@media (prefers-reduced-motion: reduce) {
  .pikachu-character,
  .pikachu-lightning,
  .pikachu-sparkles {
    animation: none !important;
  }
}

/* password */
.password-wrapper {
  position: relative;
  width: min(430px, 85vw);
}

/* Keep both inputs inside their wrappers */
.password-wrapper #password-input,
.password-wrapper #confirm-password-input {
  width: 100%;
  box-sizing: border-box;
  padding-left: 44px;
  padding-right: 44px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);

  display: flex;
  align-items: center;
  justify-content: center;

  width: 32px;
  height: 32px;
  padding: 5px;

  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #293c60;
  cursor: pointer;
}

.password-toggle svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.password-toggle:hover {
  background: rgba(41, 60, 96, 0.1);
}

.password-toggle:focus-visible {
  outline: 2px solid #ffd117;
  outline-offset: 2px;
}


/* ========================================
   STUDYDEX SIGNUP LOGO
======================================== */

.signup-logo-container {
  width: 100%;
  margin-bottom: 30px;
}

.signup-logo {
  width: 400px;
  max-width: 85%;
  height: auto;
  object-fit: contain;
  display: block;
  margin: auto;
}

/* PIKACHU FLICKER WHEN ERROR */
/* .pikachu-sprite.has-error {
  animation: pikachu-error-flicker 0.5s ease-in-out infinite;
}

@keyframes pikachu-error-flicker {
  0%, 100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pikachu-sprite.has-error {
    animation: none;
  }
} */

 /* error msg blink */
.error-blink {
  animation: error-text-glow 1.2s ease-in-out infinite;
}

@keyframes error-text-glow {
  0%, 100% {
    text-shadow: none;
  }

  50% {
    text-shadow:
      0 0 5px rgba(255, 0, 0, 0.7),
      0 0 12px rgba(251, 55, 55, 0.315);
  }
}

@media (prefers-reduced-motion: reduce) {
  .error-blink {
    animation: none;
  }
}

/* trainer reg form title */
.form-heading {
  text-align: center;
  margin: 20px auto 24px;
}

.form-title {
  font-size: 32px;
  font-weight: 650;
  color: #ffd117;
  margin-bottom: 12px;
  text-shadow: 2px 3px 0 #102e72;
}

.form-title-divider {
  display: block;
  width: 160px;
  height: 3px;
  background: #ffd117;
  border-radius: 10px;
  margin: 0 auto 12px;
}

.step-counter {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  color: #fff;
  text-shadow: 1px 1px 2px #000;
}

/* back to studydex button */
.back-home {
  position: absolute;
  top: 25px;
  left: 30px;
  z-index: 10;

  padding: 10px 18px;

  background: #072578;
  border: 2px solid #ffd117;
  border-radius: 12px;

  color: #ffd117;
  text-decoration: none;

  font-family: 'Fredoka', sans-serif;
  font-size: 16px;
  font-weight: 600;

  box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;
}

.back-home:hover {
  transform: translateY(-2px);
  color: white;
}
</style>
