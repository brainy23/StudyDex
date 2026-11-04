<script setup>
import { ref, onMounted } from 'vue'
import { Carousel } from 'bootstrap'
import axios from 'axios'

// pokemon on the right side of hero
const heroPokemon = ref('')

async function getHeroPokemon() {
  try {
    const response = await axios.get(`${import.meta.env.VITE_POKE_API_URL}/pokemon/pikachu/`)
    heroPokemon.value = response.data.sprites.other['official-artwork'].front_default
  } catch (error) {
    console.error('Unable to load Pokémon:', error.message)
  }
}

// Screenshots used throughout the landing page
const screenshots = ref({
  home: [
    '/landing/home_1.png',
    '/landing/home_2.png',
    '/landing/home_3.png'
  ],

  packs: [
    '/landing/packs_1.png',
    '/landing/packs_2.png',
    '/landing/packs_3.png'
  ],

  timer: [
    '/landing/timer_1.png',
    '/landing/timer_2.png',
    '/landing/timer_3.png'
  ],

  deck: [
    '/landing/deck_1.png',
    '/landing/deck_2.png',
    '/landing/deck_3.png'
  ],

  battle: [
    '/landing/battle_1.png',
    '/landing/battle_2.png',
    '/landing/battle_3.png'
  ],

  quiz: [
    '/landing/quiz_1.png',
    '/landing/quiz_2.png',
    '/landing/quiz_3.png'
  ],

  dashboard: [
    '/landing/dashboard_1.png',
    '/landing/dashboard_2.png',
    '/landing/dashboard_3.png'
  ]
})

function startCarousels() {
  try {
    const carousels = document.querySelectorAll('.carousel')

    carousels.forEach((carousel) => {
      new Carousel(carousel, {
        interval: 2000,
        ride: 'carousel'
      })
    })
  } catch (error) {
    console.error('Unable to start carousels:', error)
  }
}

onMounted(() => {
  startCarousels()
  getHeroPokemon()
})
</script>

<template>
  <nav class="nav">
    <img src="/backgrounds/studydex_logo.png" alt="StudyDex" class="logo" />
    <div class="links">
      <a href="/tutorial">Tutorial</a>
      <a href="/login" class="btn outline">Log in</a>
    </div>
  </nav>

  <section class="hero">
    <div>
      <p class="small">The study app for primary school kids</p>
      <h1>Gamify your learning experience with <span class="mark">Pokémon!</span></h1>
      <p>Focus in short study sessions and grow your Pokémon buddy along the way.</p>
      <a href="/signup" class="btn yellow">Sign up now</a>
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
        <p>Score well to earn XP and rewards.</p>
      </div>
      <div class="card">
        <img src="/assets/pack_gen1.png" alt="" />
        <h3>Level up</h3>
        <p>Open Poképacks and evolve your buddy.</p>
      </div>
      <div class="card">
        <img src="/assets/clock_evening.png" alt="" />
        <h3>Take breaks</h3>
        <p>Only 4 sessions a day count. Then go play!</p>
      </div>
      <div class="card">
        <img src="/assets/xp_bar_dark.png" alt="" />
        <h3>Track progress</h3>
        <p>See your scores. Parents can check in too.</p>
      </div>
    </div>
  </section>


  <section class="detail">
    <div id="home" class="carousel slide">
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.home" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="" />
        </div>
      </div>
      <button class="carousel-control-prev" data-bs-target="#home" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button class="carousel-control-next" data-bs-target="#home" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Home screen</p>
      <h2>Your buddy lives here</h2>
      <p>Your home screen changes with the real time of day: a bright sky in the morning and a sunset in the evening. Your Pokémon buddy stands beside you, with its level and XP bar, and you can start a study session, open your Study Deck or check your Poképacks from here.</p>
      <ul>
        <li>Sky follows the real sunrise and sunset</li>
        <li>See your buddy, level and XP at a glance</li>
        <li>2 of 4 study sessions done? It shows you</li>
      </ul>
    </div>
  </section>

  <section class="detail flip">
    <div id="packs" class="carousel slide">
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.packs" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="" />
        </div>
      </div>
      <button class="carousel-control-prev" data-bs-target="#packs" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button class="carousel-control-next" data-bs-target="#packs" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Poképacks</p>
      <h2>Open packs, collect Pokémon!</h2>
      <p>Earn Poképacks by finishing study sessions and quizzes. Open one to unlock a new Pokémon, bonus XP or other surprises. Packs come from different generations.</p>
      <ul>
        <li>Earned by studying, never bought</li>
        <li>New Pokémon to collect</li>
        <li>Packs from every generation</li>
      </ul>
    </div>
  </section>

  <section class="detail">
    <div id="timer" class="carousel slide">
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.timer" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="" />
        </div>
      </div>
      <button class="carousel-control-prev" data-bs-target="#timer" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button class="carousel-control-next" data-bs-target="#timer" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Study timer</p>
      <h2>Focus for 25 minutes</h2>
      <p>Start a study block and the timer counts down 25 minutes. Finish it to earn XP for your buddy. You can do up to 4 sessions a day. After that your buddy gets dizzy and reminds you to take a break. Study too late at night and your buddy falls asleep.</p>
      <ul>
        <li>25-minute focus blocks</li>
        <li>Only the first 4 sessions a day earn XP</li>
        <li>No XP late at night, rest instead</li>
      </ul>
    </div>
  </section>

  <section class="detail flip">
    <div id="deck" class="carousel slide">
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.deck" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="" />
        </div>
      </div>
      <button class="carousel-control-prev" data-bs-target="#deck" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button class="carousel-control-next" data-bs-target="#deck" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Study Deck</p>
      <h2>Flashcards for your year</h2>
      <p>Flip through flashcards made for your year of study, starting with Science. Tap a card to see the answer and move on when you are ready.</p>
      <ul>
        <li>Topics follow the primary school syllabus</li>
        <li>Pick your year and subject</li>
        <li>Short cards that are easy to revise</li>
      </ul>
    </div>
  </section>

  <section class="detail">
    <div id="battle" class="carousel slide">
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.battle" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="" />
        </div>
      </div>
      <button class="carousel-control-prev" data-bs-target="#battle" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button class="carousel-control-next" data-bs-target="#battle" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Boss battle</p>
      <h2>Prove what you learned</h2>
      <p>Rushing through your flashcards just to finish? A boss appears! Answer its questions correctly to win. If you get them wrong, your buddy loses some XP, so it pays to really learn.</p>
      <ul>
        <li>Questions from the cards you just studied</li>
        <li>Win to keep your XP</li>
        <li>Lose and your buddy loses XP</li>
      </ul>
    </div>
  </section>

  <section class="detail flip">
    <div id="quiz" class="carousel slide">
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.quiz" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="" />
        </div>
      </div>
      <button class="carousel-control-prev" data-bs-target="#quiz" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button class="carousel-control-next" data-bs-target="#quiz" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Quizzes</p>
      <h2>Test yourself</h2>
      <p>Quizzes use questions from the latest syllabus and past year papers. The better your score, the bigger your reward.</p>
      <ul>
        <li>Based on real exam questions</li>
        <li>Rewards depend on your score</li>
        <li>See which answers you got wrong</li>
      </ul>
    </div>
  </section>

  <section class="detail">
    <div id="dashboard" class="carousel slide">
      <div class="carousel-inner">
        <div v-for="(src, i) in screenshots.dashboard" :key="src" :class="['carousel-item', { active: i === 0 }]">
          <img :src="src" class="screen" alt="" />
        </div>
      </div>
      <button class="carousel-control-prev" data-bs-target="#dashboard" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span></button>
      <button class="carousel-control-next" data-bs-target="#dashboard" data-bs-slide="next"><span class="carousel-control-next-icon"></span></button>
    </div>
    <div>
      <p class="small">Progress dashboard</p>
      <h2>See how you are growing</h2>
      <p>Your dashboard shows how many study sessions you did, your quiz scores and the topics that need more practice. Parents can use it to see how their children is doing.</p>
      <ul>
        <li>Charts of your study week</li>
        <li>Quiz scores by topic</li>
        <li>Parents & Teachers can check in too</li>
      </ul>
    </div>
  </section>

  <section class="ending">
  </section>
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
</style>
