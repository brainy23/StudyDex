<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getSupabase } from '../lib/supabase'
import { getStarterStatus } from '../services/rewardsService'
import axios from 'axios'

const router = useRouter()
const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

const POKEMON_API_URL = import.meta.env.VITE_POKE_API_URL

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
    let destination = 'landing'
    try { if (!(await getStarterStatus()).claimed) destination = 'starter' } catch { /* Starter can be retried from the collection. */ }
    await router.replace({ name: destination })
  } catch (error) {
    errorMessage.value = error.message || 'Unable to log in. Please try again.'
  } finally {
    submitting.value = false
  }
}

// animated pokemons
// Background Pokémon configuration
const backgroundPokemon = ref([
  { id: 39, name: 'Jigglypuff', image: '', animation: 'walking' },
  { id: 187, name: 'Hoppip', image: '', animation: 'floating' },
  { id: 278, name: 'Wingull', image: '', animation: 'flying' }
])

// Retrieve animated Pokémon sprites from PokéAPI
// highlight which pokemon has error in getting and let the rest of the successful calls still display
async function loadBackgroundPokemon() {
  await Promise.all(
    backgroundPokemon.value.map(async (pokemon) => {
      try {
        const { data } = await axios.get(
          `${POKEMON_API_URL}/pokemon/${pokemon.id}/`
        )

        pokemon.image =
          data.sprites.versions?.['generation-v']
            ?.['black-white']?.animated?.front_default ||
          data.sprites.front_default

      } catch (error) {
        console.error(`Unable to load ${pokemon.name}:`, error)
      }
    })
  )
}
onMounted(() => {
  loadBackgroundPokemon()
})
</script>

<template>
  <main class="login-bg">
    <!-- ANIMATED BACKGROUND POKÉMON -->
    <div class="background-pokemon" aria-hidden="true">
      <img
        v-for="poke in backgroundPokemon.filter(p => p.id !== 187)"
        :key="poke.id"
        :src="poke.image"
        :class="['pokemon-sprite', poke.animation]"
        :alt="poke.name"
        v-show="poke.image"
      />
    </div>
    <RouterLink to="/landing-info" class="back-home" style="text-decoration: none; color: #ffd117">
      ← Back to StudyDex
    </RouterLink>
    <form class="container login-form" @submit.prevent="login">
      <!-- HOPPIP LOGIN COMPANION -->
      <aside class="login-hoppip">

        <!-- Speech bubble -->
        <div class="hoppip-speech">
          <span class="hoppip-speaker">Hoppip </span>
          <p>Hoppip hop! Welcome back, Trainer! 🌸</p>
        </div>

        <!-- Animated Hoppip -->
        <div class="hoppip-stage">
          <img
            v-if="backgroundPokemon.find(p => p.id === 187)?.image"
            :src="backgroundPokemon.find(p => p.id === 187).image"
            alt="Hoppip welcoming you back"
            class="hoppip-sprite"
          />
          <div class="hoppip-shadow"></div>
        </div>

      </aside>
      <!-- ANIMATED STUDYDEX LOGO -->
      <div class="login-logo-container">

        <img
          src="/assets/studydexlogo.png"
          alt="StudyDex Logo"
          class="login-logo"
        />

      </div>
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
        <p>Not a trainer? <RouterLink to="/signup" style=" text-decoration:underline; color: #ffd117">Sign Up</RouterLink></p>
      </div>
    </form>
  </main>
</template>

<style scoped>
.back-home {
  position: absolute;
  top: 25px;
  left: 30px;
  z-index: 10;

  padding: 10px 18px;
  border-radius: 12px;

  background: #072578;
  border: 1.5px solid #ffd117;

  color: white;
  text-decoration: none;

  font-size: 18px;
  font-weight: 600;

  box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
}

.back-home:hover {
  transform: translateY(-2px);
  color: #ffd117;
}
.login-bg {
  background: url('/backgrounds/login_bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  min-height: 100vh;
  margin-top: 0px;
  display: flow-root;
}

.container {
  margin-top: 200px;
}

.input-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  row-gap: 0px;
  font-family: 'Fredoka';
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
  height: 40px;

  opacity: 70%;

  text-align: center;
  font-size: 20px;
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
  height: 40px;
  font-weight: 500;
  font-size: 20px;
  color: white;
  box-shadow: 3px 3px 6px #232323;
  border: 2px solid #ffd117;
  border-radius: 12px;
  cursor: pointer;
  background-color: #072578;
  cursor: pointer;
  font-family: 'Fredoka';
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
}

.link-to-sign-up {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 24px 0 32px;
  text-align: center;
  color: white;
  font-size: 20px;
  -webkit-text-stroke: 4px black;
  paint-order: stroke fill;
  font-family: 'Fredoka';
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

/* ========================================
   ANIMATED STUDYDEX LOGO
======================================== */

/* Main logo container */
.login-logo-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;

  width: fit-content;
  max-width: 100%;
  margin: 0 auto 35px;

  animation: logo-float 3s ease-in-out infinite;
}

/* StudyDex logo */
.login-logo {
  display: block;
  width: 450px;
  max-width: 80vw;
  height: auto;
  object-fit: contain;

  filter: drop-shadow(0 6px 5px rgba(0, 0, 0, 0.2));
}

/* ========================================
   YELLOW SIDE LINES
======================================== */

/* Base wrapper for decorative lines */
.logo-lines {
  position: absolute;
  top: 38%;

  width: 70px;
  height: 70px;

  pointer-events: none;
}

/* Position lines OUTSIDE the logo */
.logo-lines-left {
  left: -55px;
}

.logo-lines-right {
  right: -55px;
}

/* Common styling for all lines */
.logo-lines span {
  position: absolute;
  display: block;

  width: 10px;
  border-radius: 999px;

  background: #ffd117;
  box-shadow: 2px 2px 0 #c69400;

  transform-origin: center;

  animation: line-wiggle 1.8s ease-in-out infinite;
}

/* ========================================
   LEFT SIDE
======================================== */

/* Upper-left line */
.logo-lines-left .line-1 {
  height: 30px;
  left: 22px;
  top: 8px;

  --rotation: -62deg;

  animation-duration: 1.6s;
  animation-delay: 0s;
}

/* Lower-left line */
.logo-lines-left .line-2 {
  height: 22px;
  left: 10px;
  top: 35px;

  --rotation: -100deg;

  animation-duration: 2.1s;
  animation-delay: 0.4s;
}

/* ========================================
   RIGHT SIDE
======================================== */

/* Upper-right line */
.logo-lines-right .line-1 {
  height: 30px;
  right: 22px;
  top: 8px;

  --rotation: 62deg;

  animation-duration: 1.9s;
  animation-delay: 0.7s;
}

/* Lower-right line */
.logo-lines-right .line-2 {
  height: 22px;
  right: 10px;
  top: 35px;

  --rotation: 100deg;

  animation-duration: 2.4s;
  animation-delay: 1.1s;
}

/* ========================================
   ANIMATIONS
======================================== */

/* Gentle up-and-down logo movement */
@keyframes logo-float {
  0%, 100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}

/* Independent outward wiggle and pulse */
@keyframes line-wiggle {
  0%, 100% {
    transform: rotate(var(--rotation)) scale(0.9);
    opacity: 0.7;
  }

  25% {
    transform: rotate(calc(var(--rotation) - 8deg)) scale(1.1);
    opacity: 1;
  }

  50% {
    transform: rotate(calc(var(--rotation) + 6deg)) scale(1.2);
    opacity: 1;
  }

  75% {
    transform: rotate(calc(var(--rotation) - 4deg)) scale(1);
    opacity: 0.85;
  }
}

/* ========================================
   MOBILE RESPONSIVENESS
======================================== */

@media (max-width: 520px) {
  .login-logo {
    width: 280px;
    max-width: 75vw;
  }

  .login-logo-container {
    margin-bottom: 25px;
  }

  .logo-lines {
    width: 50px;
    height: 50px;
  }

  .logo-lines-left {
    left: -30px;
  }

  .logo-lines-right {
    right: -30px;
  }

  .logo-lines span {
    width: 7px;
  }

  .logo-lines-left .line-1,
  .logo-lines-right .line-1 {
    height: 22px;
  }

  .logo-lines-left .line-2,
  .logo-lines-right .line-2 {
    height: 16px;
  }
}

/* Accessibility: reduce movement if requested */
@media (prefers-reduced-motion: reduce) {
  .login-logo-container,
  .logo-lines span {
    animation: none;
  }

  .logo-lines span {
    transform: rotate(var(--rotation));
    opacity: 1;
  }
}

/* moving pokemon in bg */
/* ========================================
   BACKGROUND POKÉMON
======================================== */

.login-bg {
  position: relative;
  overflow: hidden;
}

/* Pokémon background layer */
.background-pokemon {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
}

/* Shared sprite styling */
.pokemon-sprite {
  position: absolute;
  width: 200px;
  height: 75px;
  object-fit: contain;
  image-rendering: pixelated;
}

.walking {
  bottom: 4%;
  right: 70%;
  animation: pokemon-walk 8s ease-in-out infinite alternate;
}

.flying {
  position: absolute;
  top: 15%;
  right: -150px;
  left: auto;

  width: 120px;
  height: 120px;

  animation: pokemon-fly 18s linear infinite;
}


/* Keep login content above Pokémon */
.login-bg > form {
  position: relative;
  z-index: 2;
}

/* ========================================
   MOVEMENT ANIMATIONS
======================================== */

/* Gentle side-to-side walking */
@keyframes pokemon-walk {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(100px);
  }
}

/* Fly across the screen */
@keyframes pokemon-fly {
  0% {
    transform: translateX(0) translateY(0);
  }

  50% {
    transform: translateX(-50vw) translateY(-25px);
  }

  100% {
    transform: translateX(-110vw) translateY(0);
  }
}

/* Float gently */
@keyframes pokemon-float {
  0%, 100% {
    transform: translateY(0) rotate(-5deg);
  }

  50% {
    transform: translateY(-25px) rotate(5deg);
  }
}

/* Respect reduced-motion preferences */
@media (prefers-reduced-motion: reduce) {
  .pokemon-sprite {
    animation: none;
  }
}

/* hoppip companion */
/* ========================================
   HOPPIP LOGIN COMPANION
======================================== */

/* Parent positioning reference */
.login-form {
  position: relative;
}

/* Position Hoppip to the right of login inputs */
.login-hoppip {
  position: absolute;
  left: calc(50% + 250px);
  top: 80px;
  width: 220px;
  text-align: center;
  z-index: 3;
}

/* ========================================
   SPEECH BUBBLE
======================================== */

.hoppip-speech {
  position: relative;
  width: 220px;
  max-width: 100%;

  padding: 11px 15px;
  margin: 0 auto 20px;

  background: #fffdf3;
  color: #2b4162;

  border: 2px solid #344f78;
  border-radius: 18px;

  font-family: 'Nunito', sans-serif;

  box-shadow:
    0 4px 0 rgba(35, 57, 90, 0.18),
    0 8px 18px rgba(22, 42, 65, 0.14);
}

/* Speech bubble tail */
.hoppip-speech::after {
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

/* Pokémon name */
.hoppip-speaker {
  display: block;
  margin-bottom: 4px;

  color: #886317;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  text-align: center;
}

/* Welcome message */
.hoppip-speech p {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.4;
  text-align: center;
}

/* ========================================
   HOPPIP SPRITE
======================================== */

.hoppip-stage {
  position: relative;
  height: 150px;

  display: flex;
  justify-content: center;
  align-items: center;
}

.hoppip-sprite {
  position: relative;
  z-index: 1;

  width: 125px;
  height: 125px;

  object-fit: contain;
  image-rendering: pixelated;

  animation: hoppip-float 3.2s ease-in-out infinite;
}

/* Shadow underneath Hoppip */
.hoppip-shadow {
  position: absolute;
  bottom: 10px;

  width: 80px;
  height: 12px;

  background: rgba(0, 0, 0, 0.22);
  border-radius: 50%;

  animation: hoppip-shadow 3.2s ease-in-out infinite;
}

/* ========================================
   ANIMATIONS
======================================== */

@keyframes hoppip-float {
  0%, 100% {
    transform: translateY(0) rotate(-4deg);
  }

  50% {
    transform: translateY(-20px) rotate(4deg);
  }
}

@keyframes hoppip-shadow {
  0%, 100% {
    transform: scale(1);
    opacity: 0.3;
  }

  50% {
    transform: scale(0.7);
    opacity: 0.15;
  }
}
</style>
