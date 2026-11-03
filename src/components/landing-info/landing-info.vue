<script setup>
defineOptions({ name: 'LandingInfoPage' })
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Carousel } from 'bootstrap'
import axios from 'axios'
import { pokemonUrl } from '../../lib/pokeapi'

const page = ref(null)
const heroPokemon = ref('')
const controller = new AbortController()
const carousels = []
// The branch contains no landing screenshots. Use existing illustrations explicitly.
const screenshots = {
  home: ['/backgrounds/morning_homepage.png'],
  packs: ['/backgrounds/rewards_bg.png'],
  timer: ['/assets/clock_evening.png'],
  deck: ['/assets/study_deck_book.png'],
  battle: ['/town/poke_arena.png'],
  quiz: ['/assets/quiz_buddy.png'],
  dashboard: ['/trainer-home/trainer-home-v3.png'],
}
onMounted(async () => {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? true
  page.value.querySelectorAll('.carousel').forEach(element => {
    carousels.push(new Carousel(element, { interval: reducedMotion ? false : 5000, ride: false }))
  })
  try {
    const { data } = await axios.get(pokemonUrl('pikachu'), { signal: controller.signal, timeout: 12000 })
    if (!controller.signal.aborted) heroPokemon.value = data?.sprites?.other?.['official-artwork']?.front_default || ''
  } catch { /* The page is usable without decorative artwork. */ }
})
onBeforeUnmount(() => {
  controller.abort()
  carousels.forEach(carousel => carousel.dispose())
})
</script>

<template>
  <div ref="page" class="landing-info-page">
  <nav class="nav">
    <img src="/backgrounds/studydex_logo.png" alt="StudyDex" class="logo" />
    <div class="links">
      <RouterLink to="/tutorial">Tutorial</RouterLink>
      <RouterLink to="/login" class="btn outline">Log in</RouterLink>
    </div>
  </nav>

  <section class="hero">
    <div>
      <p class="small">The study app for primary school kids</p>
      <h1>Gamify your learning experience with <span class="mark">Pokémon!</span></h1>
      <p>Focus in short study sessions and grow your Pokémon buddy along the way.</p>
      <RouterLink to="/signup" class="btn yellow">Sign up now</RouterLink>
    </div>
    <img v-if="heroPokemon" 
    :src="heroPokemon" alt="Pikachu" class="hero-img" />
  </section>

  <section class="info">
    <h2>What can you do on StudyDex?</h2>
    <div class="cards">
      <div class="card">
        <img src="/assets/trainer_f2_face.png" alt="" />
        <h3>Get a buddy</h3>
        <p>Pick a trainer and meet your Pokémon buddy.</p>
      </div>
      <div class="card">
        <img src="/assets/study_deck_book.png" alt="" />
        <h3>Study in short blocks</h3>
        <p>25-minute timer and flashcards for your year.</p>
      </div>
      <div class="card">
        <img src="/assets/quiz_buddy.png" alt="" />
        <h3>Take quizzes</h3>
        <p>Preview quiz questions and practise at your pace.</p>
      </div>
      <div class="card">
        <img src="/assets/pack_gen1.png" alt="" />
        <h3>Level up</h3>
        <p>Choose a starter and save your collection.</p>
      </div>
      <div class="card">
        <img src="/assets/clock_evening.png" alt="" />
        <h3>Take breaks</h3>
        <p>Aim for four focus blocks, with breaks.</p>
      </div>
      <div class="card">
        <img src="/assets/xp_bar_dark.png" alt="" />
        <h3>Track progress</h3>
        <p>Explore the progress dashboard demo.</p>
      </div>
    </div>
  </section>

  
  <section class="detail">
    <div id="home" class="carousel slide">
      <p class="illustration-label">Feature illustration</p>
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.home" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="Feature illustration" loading="lazy" />
        </div>
      </div>
      <button v-if="screenshots.home.length > 1" aria-label="Previous illustration" class="carousel-control-prev" data-bs-target="#home" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button v-if="screenshots.home.length > 1" aria-label="Next illustration" class="carousel-control-next" data-bs-target="#home" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Home screen</p>
      <h2>Your buddy lives here</h2>
      <p>Your home screen changes with the real time of day: a bright sky in the morning and a sunset in the evening. Your Pokémon buddy stands beside you, with its level and XP bar, and you can start a study session, open your Study Deck or check your Poképacks from here.</p>
      <ul>
        <li>Sky changes with the time of day</li>
        <li>See your buddy, level and XP at a glance</li>
        <li>Start a focus block when you are ready</li>
      </ul>
    </div>
  </section>

  <section class="detail flip">
    <div id="packs" class="carousel slide">
      <p class="illustration-label">Feature illustration</p>
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.packs" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="Feature illustration" loading="lazy" />
        </div>
      </div>
      <button v-if="screenshots.packs.length > 1" aria-label="Previous illustration" class="carousel-control-prev" data-bs-target="#packs" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button v-if="screenshots.packs.length > 1" aria-label="Next illustration" class="carousel-control-next" data-bs-target="#packs" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Poképacks</p>
      <h2>Open packs, collect Pokémon!</h2>
      <p>Choose Bulbasaur, Charmander or Squirtle when you join. Your collection is saved to your account. Study and quiz pack awards are coming later.</p>
      <ul>
        <li>One starter per student</li>
        <li>Owned packs can be opened from your Bag</li>
        <li>Three starter families in this demo</li>
      </ul>
    </div>
  </section>

  <section class="detail">
    <div id="timer" class="carousel slide">
      <p class="illustration-label">Feature illustration</p>
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.timer" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="Feature illustration" loading="lazy" />
        </div>
      </div>
      <button v-if="screenshots.timer.length > 1" aria-label="Previous illustration" class="carousel-control-prev" data-bs-target="#timer" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button v-if="screenshots.timer.length > 1" aria-label="Next illustration" class="carousel-control-next" data-bs-target="#timer" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Study timer</p>
      <h2>Focus for 25 minutes</h2>
      <p>Start a 25-minute focus block and take a break afterwards. Keep learning at a comfortable pace. Study XP is not connected yet.</p>
      <ul>
        <li>25-minute focus blocks</li>
        <li>Aim for four focus blocks</li>
        <li>Rest when you feel tired</li>
      </ul>
    </div>
  </section>

  <section class="detail flip">
    <div id="deck" class="carousel slide">
      <p class="illustration-label">Feature illustration</p>
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.deck" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="Feature illustration" loading="lazy" />
        </div>
      </div>
      <button v-if="screenshots.deck.length > 1" aria-label="Previous illustration" class="carousel-control-prev" data-bs-target="#deck" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button v-if="screenshots.deck.length > 1" aria-label="Next illustration" class="carousel-control-next" data-bs-target="#deck" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Study Deck</p>
      <h2>Flashcards for your year</h2>
      <p>Flip through Mathematics and Science flashcards for your year of study. Tap a card to see the answer and move on when you are ready.</p>
      <ul>
        <li>Topics follow the primary school syllabus</li>
        <li>Pick your year and subject</li>
        <li>Short cards that are easy to revise</li>
      </ul>
    </div>
  </section>

  <section class="detail">
    <div id="battle" class="carousel slide">
      <p class="illustration-label">Feature illustration</p>
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.battle" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="Feature illustration" loading="lazy" />
        </div>
      </div>
      <button v-if="screenshots.battle.length > 1" aria-label="Previous illustration" class="carousel-control-prev" data-bs-target="#battle" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button v-if="screenshots.battle.length > 1" aria-label="Next illustration" class="carousel-control-next" data-bs-target="#battle" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Boss battle</p>
      <h2>Prove what you learned</h2>
      <p>Try an optional practice battle or preview Boss Battle questions. Your study cards and timer progress are preserved when you return. Grading is not connected yet.</p>
      <ul>
        <li>Questions from the cards you just studied</li>
        <li>Practice at your own pace</li>
        <li>No XP penalties</li>
      </ul>
    </div>
  </section>

  <section class="detail flip">
    <div id="quiz" class="carousel slide">
      <p class="illustration-label">Feature illustration</p>
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.quiz" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="Feature illustration" loading="lazy" />
        </div>
      </div>
      <button v-if="screenshots.quiz.length > 1" aria-label="Previous illustration" class="carousel-control-prev" data-bs-target="#quiz" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button v-if="screenshots.quiz.length > 1" aria-label="Next illustration" class="carousel-control-next" data-bs-target="#quiz" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Quizzes</p>
      <h2>Test yourself</h2>
      <p>Preview questions from the available topic bank. Secure grading and quiz rewards are not connected yet.</p>
      <ul>
        <li>Choose a Mathematics or Science topic</li>
        <li>Choose Topic Quiz or Boss Battle</li>
        <li>Explore questions without a score</li>
      </ul>
    </div>
  </section>

  <section class="detail">
    <div id="dashboard" class="carousel slide">
      <p class="illustration-label">Feature illustration</p>
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.dashboard" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="Feature illustration" loading="lazy" />
        </div>
      </div>
      <button v-if="screenshots.dashboard.length > 1" aria-label="Previous illustration" class="carousel-control-prev" data-bs-target="#dashboard" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button v-if="screenshots.dashboard.length > 1" aria-label="Next illustration" class="carousel-control-next" data-bs-target="#dashboard" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Progress dashboard</p>
      <h2>See how you are growing</h2>
      <p>The dashboard is a demo with sample charts. Saved quiz scores and parent or teacher access are not connected yet.</p>
      <ul>
        <li>Sample study charts</li>
        <li>Sample topic charts</li>
        <li>Live progress tracking is coming later</li>
      </ul>
    </div>
  </section>

  <section class="ending">
  </section>
  </div>
</template>

<style scoped>
/* nav */
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 24px;
  background: #1f3a93;
  border-bottom: 4px solid #ffd000;
}
.logo { height: 40px; }
.links { display: flex; align-items: center; gap: 16px; }
.links a { color: white; font-weight: 700; text-decoration: none; }

/* buttons */
.btn { display: inline-block; padding: 10px 20px; border-radius: 12px; font-weight: 800; text-decoration: none; }
.yellow  { background: #ffd000; color: #2b2100 !important; }
.outline { border: 2px solid white; }

/* hero */
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 40px;
  min-height: 85vh;
  padding: 40px 8%;
  background: #fffaf0;
  color: #17324d;
}
.small { color: #e08a00; font-weight: 800; text-transform: uppercase; }
h1 { font-size: 60px; margin: 0 0 16px; color: #1f3a93; }
.mark { background: linear-gradient(transparent 60%, #ffd000 60%); }
.hero p { font-size: 18px; margin-bottom: 24px; }
.hero-img { width: 100%; max-width: 460px; }

/* info */
.info {
  padding: 60px 24px;
  background: #a9dff7;
  text-align: center;
  color: #17324d;
}
.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  max-width: 1000px;
  margin: 0 auto;
}
.card { padding: 20px; border-radius: 20px; background: white; }
.card img { height: 60px; max-width: 100%; object-fit: contain; image-rendering: pixelated; }

/* walkthrough */
.detail {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 48px;
  padding: 60px 8%;
  color: #17324d;
}
.flip { background: #fffaf0; }   /* every second section gets the cream colour */
.flip .carousel { order: 2; }    /* and its pictures go on the right */
.screen {
  width: 100%;
  aspect-ratio: 16 / 10;   /* every picture the same size, so nothing jumps */
  object-fit: cover;
  border-radius: 16px;
  border: 4px solid #1f3a93;
  box-shadow: 0 10px 24px rgba(23, 50, 77, 0.2);
}
.detail h2 { font-size: 34px; margin: 0 0 12px; color: #1f3a93; }
.detail p { font-size: 17px; line-height: 1.6; }
.detail li { margin-bottom: 8px; font-weight: 700; }

/* ending */
.ending { padding: 60px 24px; text-align: center; background: #ffd000; color: #1f3a93; }
.ending .btn { background: white; }
@media (max-width: 720px) {
  .hero, .detail { grid-template-columns: 1fr; padding: 28px 20px; gap: 24px; }
  h1 { font-size: 36px; }
  .cards { grid-template-columns: 1fr; }
  .flip .carousel { order: 0; }
  .nav { padding: 10px 12px; gap: 12px; flex-wrap: wrap; }
  .hero-img { max-width: 280px; margin: auto; }
}
.illustration-label { font-size: 13px; }
</style>