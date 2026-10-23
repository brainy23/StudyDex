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
  <div class="landing-page">
    <header class="landing-header">
      <nav class="landing-nav" aria-label="Main navigation">
        <a href="#top" class="nav-brand">
          <img src="/backgrounds/studydex_logo.png" alt="StudyDex" class="nav-logo" />
        </a>

        <div class="nav-links">
          <a href="/tutorial">Tutorial</a>
          <a href="/help">Need help?</a>
        </div>

        <div class="nav-buttons">
          <RouterLink to="/login" class="landing-button button-outline">Log in</RouterLink>
          <RouterLink to="/signup" class="landing-button button-yellow">Sign up</RouterLink>
        </div>
      </nav>
    </header>

    <main>
      <section id="top" class="landing-hero" aria-labelledby="hero-heading">
        <img src="/backgrounds/morning_homepage.png" alt="" class="hero-background" />
        <div class="hero-text">
          <h1 id="hero-heading">Study a little, play a lot!</h1>
          <p>Focus in short study sessions and grow your Pokémon buddy along the way.</p>
        </div>
      </section>

      <section class="info" aria-labelledby="features-heading">
        <div class="info-content">
          <h2 id="features-heading">What can you do on StudyDex?</h2>

          <div class="features">
            <article v-for="f in features" :key="f.title" class="feature">
              <img :src="f.icon" alt="" class="feature-icon" />
              <h3>{{ f.title }}</h3>
              <p>{{ f.text }}</p>
            </article>
          </div>

          <RouterLink to="/signup" class="landing-button button-yellow signup-button">
            Start your journey
          </RouterLink>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
  min-height: 100svh;
  background: #a9dff7;
  color: #17324d;
  font-family: 'Fredoka', sans-serif;
  line-height: 1.5;
}

.landing-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #1f3a93;
  border-bottom: 4px solid #ffd000;
}

.landing-nav {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  width: 100%; 
  margin-inline: auto;
  padding: 12px 24px; /* adjust the padding later if want remnove the tutorial sign up then make them go to the sides*/
}

.nav-brand {
  justify-self: start;
}

.nav-logo {
  display: block;
  width: auto;
  height: 40px;
  max-width: 100%;
  object-fit: contain;

}

.nav-links {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.nav-links a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 10px 12px;
  color: #ffffff;
  font-weight: 700;
  text-decoration: none;
}

.nav-links a:hover {
  color: #ffd000;
}

.nav-buttons {
  display: flex;
  justify-self: end;
  gap: 10px;
}

.landing-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 18px;
  border: 2px solid transparent;
  border-radius: 12px;
  font-weight: 800;
  line-height: 1.5;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
}

.button-yellow {
  background: #ffd000;
  color: #2b2100;
  border-color: #ffd000;
}

.button-yellow:hover {
  background: #ffe066;
  border-color: #ffe066;
}

.button-outline {
  color: #ffffff;
  border-color: #ffffff;
}

.button-outline:hover {
  background: #ffffff;
  color: #1f3a93;
}

.landing-page a:focus-visible {
  outline: 3px solid currentColor;
  outline-offset: 4px;
}

.landing-hero {
  position: relative;
  display: grid;
  place-items: center;
  min-height: clamp(320px, 52vh, 512px);
  min-height: clamp(320px, 52svh, 512px);
  padding: clamp(24px, 5vw, 48px);
  overflow: hidden;
  scroll-margin-top: 80px;
}

.hero-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.hero-text {
  position: relative;
  width: 100%;
  max-width: 640px;
  padding: clamp(24px, 4vw, 40px);
  border: 1px solid rgba(31, 58, 147, 0.15);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 8px 24px rgba(23, 50, 77, 0.12);
  text-align: center;
}

.hero-text h1 {
  margin: 0 0 16px;
  font-size: clamp(30px, 5vw, 48px);
  font-weight: 700;
  line-height: 1.15;
  text-wrap: balance;
}

.hero-text p {
  margin: 0;
  font-size: clamp(16px, 2vw, 18px);
  line-height: 1.6;
}

.info {
  padding: clamp(32px, 5vw, 56px) 24px;
  text-align: center;
}

.info-content {
  max-width: 1104px;
  margin-inline: auto;
}

.info h2 {
  margin: 0 0 28px;
  font-size: clamp(26px, 3.5vw, 34px);
  font-weight: 700;
  line-height: 1.25;
  text-wrap: balance;
}

.features {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.feature {
  min-width: 0;
  padding: 24px;
  border-radius: 20px;
  background: #ffffff;
  overflow-wrap: break-word;
}

.feature-icon {
  display: block;
  width: 96px;
  height: 64px;
  max-width: 100%;
  margin-inline: auto;
  object-fit: contain;
  image-rendering: pixelated;
}

.feature h3 {
  margin: 16px 0 8px;
  font-size: 21px;
  font-weight: 600;
  line-height: 1.3;
}

.feature p {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
}

.signup-button {
  margin-top: 28px;
  padding: 12px 28px;
  border-color: #1f3a93;
  font-size: 20px;
}

@media (max-width: 56rem) {
  .features {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 48rem) {
  .landing-header {
    position: static;
  }

  .landing-nav {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 16px;
  }

  .nav-links {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .nav-buttons {
    grid-column: 2;
    grid-row: 1;
  }
}

@media (max-width: 30rem) {
  .landing-nav {
    display: flex;
    flex-direction: column;
    padding-inline: 16px;
  }

  .landing-hero {
    padding: 24px 16px;
  }

  .info {
    padding-inline: 16px;
  }

  .features {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
}
</style>
