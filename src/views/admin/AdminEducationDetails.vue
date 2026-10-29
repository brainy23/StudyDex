<script setup>
import AdminNav from '@/components/common/adminNav.vue';
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const DECK_LIST_ROUTE = '/admin-education' // <-- change to your deck list page's path

const deck = ref(null)
const loading = ref(true)

// TODO (DB team): replace the body with the real fetch, e.g.
// const { data, error } = await supabase
//   .from('decks')
//   .select('*, flashcards(*)')
//   .eq('id', id)
//   .single()
// return error ? null : data
async function loadDeck(id) {
  // placeholder so the page renders until the DB is connected
  return {
    id,
    concept_title: 'Photosynthesis',
    topic_name: 'Plant Systems',
    subject_name: 'Science',
    level_name: 'Primary 5',
    pages: 2,
    flashcards: [
      { front_text: 'What is photosynthesis?', back_text: 'The process plants use to make food from sunlight, water and carbon dioxide.' },
      { front_text: 'What do plants need for photosynthesis?', back_text: 'Sunlight, water and carbon dioxide.' },
    ],
  }
}

// runs on first load and whenever the :id in the URL changes
watch(
  () => route.params.id,
  async (id) => {
    loading.value = true
    deck.value = await loadDeck(id)
    loading.value = false
  },
  { immediate: true }
)

function goBack() {
  router.push(DECK_LIST_ROUTE)
}
</script>
<template>
  <div style="display: flex;">
    <AdminNav/>
    <main class="page">
    <div class="page-header">
      <button class="btn" @click="goBack">← Back</button>
      <h1>{{ deck ? deck.concept_title : (loading ? 'Loading...' : 'Deck not found') }}</h1>
    </div>

    <section v-if="loading" class="card">
      <p class="muted">Loading deck...</p>
    </section>

    <section v-else-if="!deck" class="card">
      <p class="muted">No deck exists with id {{ route.params.id }}.</p>
    </section>

    <template v-else>
      <section class="card">
        <h2 class="section-title">Deck Details</h2>
        <div class="detail-grid">
          <span class="detail-label">Topic</span>
          <span>{{ deck.topic_name }}</span>

          <span class="detail-label">Subject</span>
          <span>{{ deck.subject_name }}</span>

          <span class="detail-label">Level</span>
          <span>{{ deck.level_name }}</span>

          <span class="detail-label">Pages</span>
          <span>{{ deck.pages }}</span>
        </div>
      </section>

      <section class="card">
        <h2 class="section-title">
          Flashcards <span class="count">{{ deck.flashcards?.length ?? 0 }}</span>
        </h2>

        <p v-if="!deck.flashcards?.length" class="muted">This deck has no flashcards yet.</p>

        <div v-for="(card, ci) in deck.flashcards ?? []" :key="ci" class="flashcard">
          <strong>Flashcard {{ ci + 1 }}</strong>

          <div class="card-side">
            <span class="detail-label">Front</span>
            <p>{{ card.front_text }}</p>
          </div>

          <div class="card-side back">
            <span class="detail-label">Back</span>
            <p>{{ card.back_text }}</p>
          </div>
        </div>
      </section>
    </template>
  </main>
  </div>
</template>
<style scoped>
.page {
  --accent: #ffd51a;
  --text: #22252b;
  --shadow-out: 8px 8px 18px rgba(163, 177, 198, 0.35), -8px -8px 18px rgba(255, 255, 255, 0.95);
  --shadow-small: 4px 4px 10px rgba(163, 177, 198, 0.35), -4px -4px 10px rgba(255, 255, 255, 0.95);

  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  padding: 32px 20px 60px;
  box-sizing: border-box;
  max-width: 820px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 1.8rem;
}

.page-header h1::after {
  content: '';
  display: block;
  width: 48px;
  height: 5px;
  border-radius: 3px;
  background: var(--accent);
  margin-top: 6px;
}

.btn {
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  padding: 10px 22px;
  cursor: pointer;
  color: var(--text);
  background: #fff;
  box-shadow: var(--shadow-small);
}

.card {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: var(--shadow-out);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  margin: 0;
  font-size: 1.15rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.count {
  background: var(--accent);
  color: #000;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 2px 10px;
}

.detail-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 20px;
}

.detail-label {
  font-weight: 600;
  color: #555;
}

.muted {
  color: #777;
  margin: 0;
}

.flashcard {
  background: #fff;
  border-radius: 16px;
  padding: 18px;
  box-shadow: var(--shadow-small);
  border-left: 5px solid var(--accent);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-side {
  background: #f6f7fa;
  border-radius: 10px;
  padding: 10px 14px;
}

.card-side.back {
  background: #fff8d6;
}

.card-side p {
  margin: 4px 0 0;
  white-space: pre-wrap;
}
</style>