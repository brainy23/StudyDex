<script setup>
import { ref, onMounted } from 'vue'
import { Carousel } from 'bootstrap'
import axios from 'axios'

const mewtwo = ref('')
const pikachu = ref('')

// go to features
function scrollToFeatures() {
  document.querySelector('#features-section').scrollIntoView({ behavior: 'smooth' })
}

// load the Pokémon shown in the hero section
async function getPokemonImages() {
  try {
    const mewtwoResponse = await axios.get(
      `${import.meta.env.VITE_POKE_API_URL}/pokemon/mewtwo/`
    )

    mewtwo.value =
      mewtwoResponse.data.sprites.other['official-artwork'].front_default

    const pikachuResponse = await axios.get(
      `${import.meta.env.VITE_POKE_API_URL}/pokemon/pikachu/`
    )

    pikachu.value =
      pikachuResponse.data.sprites.other['official-artwork'].front_default
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  new Carousel(document.querySelector('#features'), {
    interval: 3000,
    ride: 'carousel'
  })

  getPokemonImages()
})
</script>

<template>
  <nav class="nav">
    <div class="nav-left">
      <span class="nav-pokeball" aria-hidden="true"></span>
      <a href="/" class="nav-link" @click.prevent="scrollToFeatures">Features</a>
    </div>

    <div class="links">
      <a href="/login" class="login-button">Log in</a>
      <a href="/signup" class="button signup-button">Sign up</a>
    </div>
  </nav>

  <section class="hero">
    <div>
      <img src="/backgrounds/studydex_logo.png" alt="StudyDex" class="hero-logo" />
      <h1>
        Gamify your learning with
        <span class="underline">Pokémon!</span>
      </h1>

      <p>
        The study app for primary school kids. Focus in short study sessions
        and grow your Pokémon buddy along the way.
      </p>

      <a href="/signup" class="button">
        Start your journey
      </a>
    </div>

    <div class="pokemon-images">
      <span class="collect-badge">Collect them all!</span>
      <img src="/assets/pokeball-outline.svg" alt="" class="pokeball-outline" />
      <img src="/assets/reward_pack.png" alt="" class="pack" />
      <img src="/assets/reward_pack.png" alt="" class="pack pack-2" />

      <img
        v-if="mewtwo"
        :src="mewtwo"
        alt="Mewtwo"
        class="mewtwo"
      />

      <img
        v-if="pikachu"
        :src="pikachu"
        alt="Pikachu"
        class="pikachu"
      />
    </div>
  </section>

  <section class="features" id="features-section">
    <h2>
      Over <span class="underline">7 ways</span> to study with your buddy
    </h2>

    <div id="features" class="carousel slide">
      <div class="carousel-inner">

        <div class="carousel-item active">
          <div class="feature-cards">

            <div class="feature-card">
              <img src="/landing/homescreen.png" alt="Home screen" class="screenshot" />
              <h3>Home Screen</h3>
              <p>
                Your buddy lives here. The sky follows the real time of day.
              </p>
            </div>

            <div class="feature-card">
              <img src="/landing/pokepacks.png" alt="Pokepacks" class="screenshot" />
              <h3>Poképacks</h3>
              <p>
                Earn packs by studying and collect new Pokémon.
              </p>
            </div>

            <div class="feature-card">
              <div class="screenshot-placeholder">
                Study Timer Screenshot
              </div>
              <h3>Study Timer</h3>
              <p>
                Focus for 25 minutes. Only 4 sessions a day earn XP.
              </p>
            </div>

          </div>
        </div>

        <div class="carousel-item">
          <div class="feature-cards">

            <div class="feature-card">
              <img src="/landing/subjects.png" alt="Subjects" class="screenshot" />
              <h3>Study Deck</h3>
              <p>
                Flashcards ready-made for your year of study.
              </p>
            </div>

            <div class="feature-card">
              <img src="/landing/bossbattle.png" alt="Boss battle" class="screenshot" />
              <h3>Boss Battle</h3>
              <p>
                Rushing through? A boss appears to test what you learned.
              </p>
            </div>

            <div class="feature-card">
              <img src="/landing/flashcards.png" alt="Flashcards" class="screenshot" />
              <h3>Quizzes</h3>
              <p>
                Real exam questions. The better your score, the bigger your reward.
              </p>
            </div>

          </div>
        </div>

        <div class="carousel-item">
          <div class="feature-cards">

            <div class="feature-card">
              <img src="/landing/dashboard.png" alt="Dashboard" class="screenshot" />
              <h3>Dashboard</h3>
              <p>
                See your study week and quiz scores. Parents can check in too.
              </p>
            </div>

          </div>
        </div>

      </div>

      <button
        class="carousel-control-prev carousel-button"
        data-bs-target="#features"
        data-bs-slide="prev"
      >
        ‹
      </button>

      <button
        class="carousel-control-next carousel-button"
        data-bs-target="#features"
        data-bs-slide="next"
      >
        ›
      </button>
    </div>

  </section>

  <section class="footer-strip">
    Made for young trainers · StudyDex © 2026
  </section>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 24px;
  background: linear-gradient(135deg, #072578 0%, #1f3a93 55%, #2f5fc4 100%);
  border-bottom: 4px solid #ffd000;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-pokeball {
  position: relative;
  width: 34px;
  height: 34px;
  border: 3px solid #072578;
  border-radius: 50%;
  background: linear-gradient(#ff626c 0 44%, #072578 44% 56%, white 56%);
}

.nav-pokeball::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  translate: -50% -50%;
  border: 3px solid #072578;
  border-radius: 50%;
  background: white;
}

.nav-link {
  color: white;
  font-weight: 800;
  text-transform: uppercase;
  text-decoration: none;
}

.nav-link:hover {
  color: #ffd000;
}

.links {
  display: flex;
  align-items: center;
  gap: 24px;
}

.login-button {
  padding: 10px 24px;
  border: 2px solid white;
  border-radius: 999px;
  color: white;
  font-weight: 800;
  text-transform: uppercase;
  text-decoration: none;
}

.login-button:hover {
  background: white;
  color: #1f3a93;
}

.button {
  display: inline-block;
  padding: 12px 30px;
  border-radius: 999px;
  background: #1f3a93;
  color: white;
  font-weight: 800;
  text-transform: uppercase;
  text-decoration: none;
}

.button:hover {
  background: #ffd000;
  color: #1f3a93;
}

.signup-button {
  background: #ffd000;
  color: #2b2100;
  box-shadow: 0 0 14px rgba(255, 208, 0, 0.6);
}

.signup-button:hover {
  background: white;
  color: #1f3a93;
}

.underline {
  text-decoration: underline;
  text-decoration-color: #ffd000;
  text-decoration-thickness: 5px;
  text-underline-offset: 8px;
}

.hero-logo {
  display: block;
  width: 320px;
  max-width: 100%;
  margin-bottom: 20px;
  filter: drop-shadow(0 6px 8px rgba(7, 37, 120, 0.35));
}

.hero {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 40px;
  padding: 60px 8% 100px;
  background:
    radial-gradient(circle at 75% 50%, rgba(255, 255, 255, 0.35), transparent 30%),
    linear-gradient(135deg, #6ec6f0 0%, #a9dff7 45%, #d9f2ff 75%, #fff3c4 100%);
  border-radius: 0 0 50% 50% / 0 0 60px 60px;
  color: #17324d;
}

.hero > div {
  position: relative;
  z-index: 1;
}

h1 {
  font-size: 52px;
  font-weight: 800;
  margin: 0 0 16px;
  color: #1f3a93;
}

.hero p {
  font-size: 18px;
  margin-bottom: 28px;
}

.pokeball-outline {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: -2;
  width: 480px;
  translate: -50% -50%;
  opacity: 0.3;
}

.pokemon-images {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}



.features {
  padding: 60px 8%;
  text-align: center;
  color: #17324d;
  scroll-margin-top: 80px;
}

.features h2 {
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 40px;
}

.carousel {
  margin-bottom: 40px;
  padding: 0 60px;
}

.feature-cards {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.feature-card {
  width: 33%;
  overflow: hidden;
  border-radius: 12px;
  background: #fffaf0;
  box-shadow: 0 8px 20px rgba(23, 50, 77, 0.15);
  text-align: left;
}

.screenshot {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

.feature-card h3 {
  margin: 16px 16px 6px;
  font-size: 20px;
  font-weight: 800;
  color: #1f3a93;
}

.feature-card p {
  margin: 0 16px 18px;
  font-size: 15px;
}

.carousel-button {
  top: 50%;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #1f3a93;
  color: white;
  font-size: 26px;
  opacity: 1;
  transform: translateY(-50%);
}

.footer-strip {
  position: relative;
  margin-top: 90px;
  padding: 40px 24px 30px;
  background: #ffd000;
  text-align: center;
  color: #072578;
  font-weight: 500;
}

.footer-strip::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  height: 90px;
  background: url('/assets/grass.svg') bottom / 400px 90px repeat-x;
}

.collect-badge {
  position: absolute;
  bottom: -10px;
  left: 10%;
  z-index: 2;
  padding: 10px 22px;
  border: 3px solid #072578;
  border-radius: 999px;
  background: #ffd000;
  color: #072578;
  font-family: 'Fredoka', sans-serif;
  font-size: 22px;
  font-weight: 700;
  white-space: nowrap;
  rotate: -6deg;
  box-shadow: 0 5px 0 #072578, 0 10px 18px rgba(7, 37, 120, 0.3);
  animation: pop 2s ease-in-out infinite;
}

@keyframes pop {
  0%, 100% { scale: 1; }
  50% { scale: 1.08; }
}

.pack {
  position: absolute;
  top: -30px;
  left: 0;
  z-index: -1;
  width: 150px;
  rotate: -15deg;
  filter: drop-shadow(0 12px 10px rgba(23, 50, 77, 0.3));
  animation: float 3s ease-in-out infinite;
  animation-delay: 1.5s;
}

.pack-2 {
  top: 15%;
  left: 52%;
  width: 120px;
  rotate: 15deg;
  animation-delay: 0.5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.mewtwo {
  width: 65%;
  max-width: 360px;
  animation: float 3s ease-in-out infinite;
}

.pikachu {
  width: 40%;
  max-width: 220px;
  margin-left: -40px;
  animation: float 3s ease-in-out infinite;
  animation-delay: 1s;
}

</style>