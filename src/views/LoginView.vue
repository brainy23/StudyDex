<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getSupabase } from '../lib/supabase'

const router = useRouter()
const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

async function login() {
  if (submitting.value) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    })
    if (error) throw error
    if (!data.session) throw new Error('Unable to log in. Please try again.')
    password.value = ''
    await router.replace({ name: 'landing' })
  } catch (error) {
    errorMessage.value = error.message || 'Unable to log in. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="login-bg">
    <form class="container" @submit.prevent="login">
      <fieldset :disabled="submitting">
        <div class="input-container">
          <input
            v-model="email"
            type="email"
            id="username-input"
            aria-label="Email address"
            autocomplete="email"
            placeholder="Email address"
            required
          />
          <input
            v-model="password"
            type="password"
            id="password-input"
            aria-label="Password"
            autocomplete="current-password"
            placeholder="Password"
            required
          />
        </div>
        <p v-if="errorMessage" class="reminder" role="alert">{{ errorMessage }}</p>
        <div class="button-container">
          <button id="loginButton" type="submit" :disabled="submitting">
            {{ submitting ? 'Logging in…' : 'Login' }}
          </button>
        </div>
      </fieldset>
      <div class="link-to-sign-up">
        <p>Not a trainer? <RouterLink to="/signup" style=" text-decoration:none; color: #ffd117">Sign Up</RouterLink></p>
        <RouterLink to="/landing-info" style=" text-decoration: none; color: #ffd117">Back to StudyDex</RouterLink>
      </div>
    </form>
  </main>
</template>

<style scoped>
.login-bg {
  background: url('/backgrounds/StudyDex.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  min-height: 100vh;
  margin-top: 0px;
  display: flow-root;
}

.container {
  margin-top: 400px;
}

.input-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  row-gap: 0px;
}
.button-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;

  margin-top: 26px;
}

#username-input,
#password-input {
  border: 0;
  border-radius: 30px;
  width: 430px;
  height: 46px;

  opacity: 70%;

  text-align: center;
  font-family: 'Handjet', sans-serif;
  font-size: 26px;
}
#username-input::placeholder,
#password-input::placeholder {
  color: #4f5458;
  opacity: 100%;
}
#username-input,
#password-input {
  border: 0;
  border-radius: 30px;
  width: 430px;
  height: 46px;

  box-shadow: 3px 3px 6px #232323;

  text-align: center;
}

@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

#loginButton {
  width: 205px;
  height: 46px;

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

#loginButton:hover {
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
#password-input:hover {
  transform: scale(1.1);
}

.reminder {
  text-align: center;
  color: rgb(215, 65, 65);
  font-size: 26px;
  -webkit-text-stroke: 4px black;
  paint-order: stroke fill;
  font-family: 'Handjet', sans-serif;
}

.link-to-sign-up {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 24px 0 32px;
  text-align: center;
  color: white;
  font-size: 28px;
  -webkit-text-stroke: 4px black;
  paint-order: stroke fill;
  font-family: 'Handjet', sans-serif;
}

.link-to-sign-up p {
  margin: 0;
}

fieldset {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}
.login-bg {
  position: relative;
  font-family: 'Handjet', sans-serif;
}
.input-container {
  gap: 20px;
}
button:disabled {
  opacity: 0.5;
  cursor: wait;
}
@media (max-width: 520px) {
  #username-input,
  #password-input {
    width: 85vw;
  }
  #loginButton {
    width: 43vw;
    font-size: 20px;
  }
}
</style>
