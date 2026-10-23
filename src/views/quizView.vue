<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="quiz-page">
    <section class="quiz-panel" aria-labelledby="quiz-heading">
      <h1 id="quiz-heading">Poké Arena</h1>
      <p>Quizzes are coming soon.</p>
      <RouterLink to="/home">Back to Town</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.quiz-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: url('/backgrounds/morning_homepage.png') center / cover;
  color: #17324d;
}

.quiz-panel {
  width: min(100%, 480px);
  padding: 32px;
  border: 3px solid #ffd000;
  border-radius: 20px;
  background: #fffffff2;
  text-align: center;
}

.quiz-panel a {
  display: inline-block;
  margin-top: 12px;
  padding: 12px 24px;
  border-radius: 12px;
  background: #ffd000;
  color: #17324d;
  font-weight: 700;
  text-decoration: none;
}
</style>
