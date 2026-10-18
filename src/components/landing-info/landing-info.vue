<script setup>

const features = [
  { icon: '/assets/trainer_f2_face.png', title: 'Get a buddy',          text: 'Pick a trainer and open a starter pack to meet your Pokémon buddy.' },
  { icon: '/assets/study_deck_book.png', title: 'Study in short blocks', text: 'Use the 25-minute timer and flashcards made for your year.' },
  { icon: '/assets/quiz_buddy.png',      title: 'Take quizzes',          text: 'Answer syllabus questions. Score well to earn XP and rewards.' },
  { icon: '/assets/pack_gen1.png',       title: 'Level up',              text: 'Open Poképacks, collect Pokémon and watch your buddy evolve.' },
  { icon: '/assets/clock_evening.png',   title: 'Take breaks',           text: 'Only 4 sessions a day count. After that, go rest and play!' },
  { icon: '/assets/xp_bar_dark.png',     title: 'Track progress',        text: 'See your study time and quiz scores. Parents can check in too.' },
]

</script>

<template>
  <nav class="nav">
    <a href="#top"><img src="/backgrounds/studydex_logo.png" alt="StudyDex" class="nav-logo" /></a>
 
    <div class="nav-links">
      <a href="/tutorial">Tutorial</a>
      <a href="/help">Need help?</a>
    </div>
 
    <div class="nav-buttons">
      <RouterLink to="/login" class="btn btn-outline">Log in</RouterLink>
      <RouterLink to="/signup" class="btn btn-yellow">Sign up</RouterLink>
    </div>
  </nav>
 
  
  <div id="top" class="container">
    <img src="/backgrounds/morning_homepage.png" alt="" class="background" />
    <div class="hero-text">
      <h1>Study a little, play a lot!</h1>
      <p>Focus in short study sessions and grow your Pokémon buddy along the way.</p>
    </div>
  </div>
 
  <!-- WHAT STUDYDEX DOES -->
  <section class="info">
    <h2>What can you do on StudyDex?</h2>
 
    <div class="features">
      <div v-for="f in features" :key="f.title" class="feature">
        <img :src="f.icon" alt="" class="icon" />
        <h3>{{ f.title }}</h3>
        <p>{{ f.text }}</p>
      </div>
    </div>
 
    <RouterLink to="/signup" class="btn btn-yellow big">Start your journey</RouterLink>
  </section>
</template>
 
<style scoped>
/* ---------- nav bar ---------- */
.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 24px;
  background: #1f3a93;
  border-bottom: 4px solid #ffd000;
}
 
.nav-logo { height: 40px; }
 
.nav-links {
  display: flex;
  gap: 8px;
}
 
.nav-links a {
  padding: 10px 12px;
  color: #ffffff;
  font-weight: 700;
  text-decoration: none;
}
 
.nav-links a:hover { color: #ffd000; }
 
.nav-buttons {
  display: flex;
  gap: 10px;
}
 
/* ---------- buttons ---------- */
.btn {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: 800;
  text-decoration: none;
}
 
.btn-yellow  { background: #ffd000; color: #2b2100; border: 2px solid #ffd000; }
.btn-outline { color: #ffffff; border: 2px solid #ffffff; }
.big { margin-top: 32px; padding: 14px 32px; font-size: 20px; border-color: #1f3a93; }
 
/* ---------- hero (grid container) ---------- */
.container {
  display: grid;
  height: 70vh;
}
 
/* both children go in the same cell (row 1, column 1) so they stack */
.background,
.hero-text {
  grid-area: 1 / 1;
}
 
.background {
  width: 100vw;
  height: 100vh;
  object-fit: cover;
}
 
.hero-text {
  align-self: center;
  justify-self: center;
  max-width: 600px;
  margin: 24px;
  padding: 28px 32px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.85);
  text-align: center;
  color: #17324d;
}
 
.hero-text h1 {
  margin: 0 0 8px;
  font-size: clamp(30px, 5vw, 48px);
}
 
.hero-text p {
  margin: 0;
  font-size: 18px;
}
 
/* ---------- info section ---------- */
.info {
  padding: 64px 24px;
  background: #a9dff7;
  text-align: center;
  color: #17324d;
}
 
.info h2 {
  margin: 0 0 32px;
  font-size: 34px;
}
 
.features {
  max-width: 1000px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
 
.feature {
  padding: 24px;
  border-radius: 20px;
  background: #ffffff;
}
 
.icon {
  height: 64px;
  image-rendering: pixelated;
}
 
.feature h3 { margin: 12px 0 6px; }
.feature p  { margin: 0; line-height: 1.5; }
 

</style>