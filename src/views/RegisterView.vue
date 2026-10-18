<script setup>
import { ref, computed, onMounted } from 'vue'
import { registerUser } from '../services/registrationService'
import { getSupabase } from '../lib/supabase'
import { useRouter } from 'vue-router'
import { avatarOptions } from '../data/avatarOptions'
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

onMounted(async () => {
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
  } else if (callback.has('access_token') || callback.has('message') || query.has('message')) {
    confirmationState.value = 'checking'
    submitting.value = true
    try {
      // Secure email changes can require two links. The first link may return
      // only a message, without creating a session in this browser.
      if (!callback.has('access_token')) {
        confirmationState.value = 'pending'
        return
      }
      const { data, error } = await getSupabase().auth.getUser()
      if (error || !data.user)
        throw new Error('Unable to confirm your account. Please try your email link again.')
      if (callback.get('type') === 'email_change' && data.user.new_email) {
        confirmationState.value = 'pending'
        return
      }
      await router.replace({
        name: callback.get('type') === 'email_change' ? 'account' : 'landing',
      })
    } catch (error) {
      confirmationState.value = 'error'
      errorMessage.value = error.message
    } finally {
      submitting.value = false
    }
  }
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
    if (!result.needsEmailConfirmation) await router.replace({ name: 'landing' })
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
</script>
<template>
  <main>
    <div class="register-bg">
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
          <RouterLink to="/landing-info">Back to StudyDex</RouterLink>
        </template>
      </div>
      <div v-else-if="completed" class="container completion" role="status">
        <h1>{{ needsEmailConfirmation ? 'Check your email' : 'Your account is ready!' }}</h1>
        <p v-if="needsEmailConfirmation">
          If this address is eligible for signup, you’ll receive a confirmation email. Follow its
          link to finish setting up your account.
        </p>
        <p v-else>Your StudyDex profile is ready.</p>
        <RouterLink v-if="!needsEmailConfirmation" to="/landing">Continue</RouterLink>
        <RouterLink v-if="needsEmailConfirmation" to="/login">Log in after confirming</RouterLink>
        <RouterLink to="/landing-info">Back to StudyDex</RouterLink>
      </div>
      <form v-else class="container" @submit.prevent="submitRegistration">
        <fieldset :disabled="submitting">
          <p class="step-counter">Step {{ question_no }} of 5</p>
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
            <p class="pw-not-fulfilled" v-if="checkPW">
              Pokemon is waiting for a valid email address
            </p>
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
            <p class="pw-not-fulfilled" v-if="checkUsername">
              Enter a name between 1 and 80 characters.
            </p>
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
            <div>
              <p class="pw-not-fulfilled" v-if="checkLevel">Please select your level</p>
            </div>
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
            <input
              type="password"
              name=""
              id="password-input"
              aria-label="Password"
              autocomplete="new-password"
              placeholder="Password"
              v-model="password_field"
            /><br />

            <ul v-if="!passed_password_check">
              <li :class="password_field.length >= 8 ? 'pw-fulfilled' : 'pw-not-fulfilled'">
                Password must have at least 8 characters
              </li>
              <li :class="/[a-zA-Z]/.test(password_field) ? 'pw-fulfilled' : 'pw-not-fulfilled'">
                Password must have at least 1 alphabet
              </li>
              <li :class="/\d/.test(password_field) ? 'pw-fulfilled' : 'pw-not-fulfilled'">
                Password must have at least 1 number
              </li>
            </ul>
          </div>

          <div
            class="input-container"
            style="margin-top: -30px"
            v-if="question_no == 5 && passed_password_check"
          >
            <p class="question-prompt">Confirm Password</p>
            <input
              type="password"
              v-model="confirmPassword_field"
              id="confirm-password-input"
              aria-label="Confirm password"
              autocomplete="new-password"
              placeholder="Re-type Password"
              style="margin-top: -20px"
            /><br />
            <p class="pw-not-fulfilled" v-if="checkIfPasswordsMismatch" style="margin-top: -20px">
              Passwords do not match
            </p>
          </div>

          <div class="button-container">
            <button
              id="prevButton"
              type="button"
              :disabled="question_no === 1"
              @click="question_no -= 1"
            >
              &lt; Prev Question
            </button>
            <button
              v-if="question_no < 5"
              id="nextButton"
              type="button"
              :disabled="locked"
              @click="question_no += 1"
            >
              Next Question >
            </button>
            <button v-else id="nextButton" type="submit" :disabled="locked || submitting">
              {{ submitting ? 'Creating account…' : 'Create account' }}
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
.step-counter {
  text-align: center;
  color: #fff;
  text-shadow: 1px 1px 2px #000;
}
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
  background: url('/backgrounds/StudyDex.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  min-height: 100vh;
  margin-top: 0px;
  display: flow-root;

  font-family: 'Handjet', sans-serif;
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
  font-size: 28px;
  -webkit-text-stroke: 4px black;
  paint-order: stroke fill;

  text-align: center;
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
  border: 0;
  border-radius: 30px;
  width: 430px;
  height: 36px;

  opacity: 70%;

  box-shadow: 3px 3px 6px #232323;
  text-align: center;
  font-family: 'Handjet', sans-serif;
  font-size: 26px;
}
#username-input::placeholder,
#password-input::placeholder,
#confirm-password-input::placeholder,
#email-input::placeholder {
  color: #4f5458;
  opacity: 100%;
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
  font-family: 'Handjet', sans-serif;
  font-size: 24px;
  color: white;
  box-shadow: 3px 3px 6px #232323;
  border: 4px solid #ffd117;
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
  display: block;
  appearance: none;

  width: 205px;
  height: 46px;
  padding: 0 44px 0 16px;

  font-family: 'Handjet', sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: white;

  background-color: #072578;
  border: 4px solid #ffd117;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.3);

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
  font-family: 'Handjet', sans-serif;
  font-size: 20px;
}

.link-to-sign-in {
  position: absolute;

  bottom: 0.5%;
  left: 0;
  right: 0;
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
</style>
