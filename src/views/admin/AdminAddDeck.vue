

<script setup>
import AdminNav from '@/components/common/adminNav.vue';
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const DECK_LIST_ROUTE = '/admin-education' // <-- change to your deck list page's path

const errorMsg = ref('')

const subjectOptions = ['Mathematics', 'Science']
const levelOptions = [1, 2, 3, 4, 5, 6].map(n => `Primary ${n}`)

const form = reactive({
  concept_title: '',
  topic_name: '',
  subjects: '',
  school_level_id: '',
})

const emptyCard = () => ({ front_text: '', back_text: '' })
const flashcards = ref([emptyCard()])

function addFlashcard() {
  flashcards.value.push(emptyCard())
}

function removeFlashcard(index) {
  flashcards.value.splice(index, 1)
}

function goBack() {
  router.push(DECK_LIST_ROUTE)
}

function publish() {
  // 1. deck-level fields
  if (Object.values(form).some(v => !v.trim())) {
    errorMsg.value = 'Please fill in all fields.'
    return
  }

  // 2. flashcards
  if (flashcards.value.length === 0) {
    errorMsg.value = 'Add at least one flashcard.'
    return
  }
  const bad = flashcards.value.findIndex(
    c => !c.front_text.trim() || !c.back_text.trim()
  )
  if (bad !== -1) {
    errorMsg.value = `Flashcard ${bad + 1} is missing its front or back text.`
    return
  }

  // 3. build the deck object
  const newDeck = {
    concept_title: form.concept_title.trim(),
    topic_name: form.topic_name.trim(),
    subjects: form.subjects,
    school_level_id: form.school_level_id,
    pages: flashcards.value.length,
    flashcards: flashcards.value.map(c => ({
      front_text: c.front_text.trim(),
      back_text: c.back_text.trim(),
    })),
  }

  errorMsg.value = ''

  // by this point the deck is generated, can log newDeck in Supabase
  console.log('New deck ready to save:', newDeck)

  router.push(DECK_LIST_ROUTE)
}
</script>
<template>
  <div class="layout" style="display: flex;">
    <AdminNav/>
    <main class="page">
    <div class="page-header">
      <button class="btn btn-ghost" @click="goBack">← Back</button>
      <h1>New Deck</h1>
    </div>

    <!-- deck details -->
    <section class="card">
      <h2 class="section-title">Deck Details</h2>

      <div class="field-grid">
        <label class="field">
          <span>Concept Title</span>
          <input type="text" v-model="form.concept_title" placeholder="e.g. Photosynthesis" />
        </label>

        <label class="field">
          <span>Topic Name</span>
          <input type="text" v-model="form.topic_name" placeholder="e.g. Plant Systems" />
        </label>

        <label class="field">
          <span>Subject</span>
          <select v-model="form.subjects">
            <option disabled value="">Select subject</option>
            <option v-for="s in subjectOptions" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>

        <label class="field">
          <span>Level</span>
          <select v-model="form.school_level_id">
            <option disabled value="">Select level</option>
            <option v-for="l in levelOptions" :key="l" :value="l">{{ l }}</option>
          </select>
        </label>
      </div>
    </section>

    <!-- flashcards -->
    <section class="card">
      <h2 class="section-title">
        Flashcards <span class="count">{{ flashcards.length }}</span>
      </h2>

      <div class="flashcard" v-for="(card, ci) in flashcards" :key="ci">
        <div class="flashcard-header">
          <strong>Flashcard {{ ci + 1 }}</strong>
          <button type="button" class="icon-btn" title="Remove flashcard" @click="removeFlashcard(ci)">✕</button>
        </div>

        <label class="field">
          <span>Front</span>
          <textarea v-model="card.front_text" rows="2" placeholder="Question or term"></textarea>
        </label>

        <label class="field">
          <span>Back</span>
          <textarea v-model="card.back_text" rows="3" placeholder="Answer or explanation"></textarea>
        </label>
      </div>

      <button type="button" class="btn btn-dashed" @click="addFlashcard">+ Add flashcard</button>
    </section>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <div class="actions">
      <button class="btn btn-ghost" @click="goBack">Cancel</button>
      <button class="btn btn-accent" @click="publish">Publish</button>
    </div>
    </main>
  </div>
  
</template>

<style scoped>
.page {
  --accent: #ffd51a;
  --accent-dark: #e6bf00;
  /* --bg: #eef0f4; */
  --text: #22252b;
  --shadow-out: 8px 8px 18px rgba(163, 177, 198, 0.35), -8px -8px 18px rgba(255, 255, 255, 0.95);
  --shadow-small: 4px 4px 10px rgba(163, 177, 198, 0.35), -4px -4px 10px rgba(255, 255, 255, 0.95);
  --shadow-in: inset 3px 3px 7px rgba(163, 177, 198, 0.35), inset -3px -3px 7px rgba(255, 255, 255, 0.9);

  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  padding: 32px 20px 60px;
  box-sizing: border-box;
  max-width: 1000px;
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
  font-weight: 700;
  background-color: #ffe159;
  border-radius: 10px;
  padding: 4px 8px;
}

.card {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: var(--shadow-out);
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 1000px;
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

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field > span {
  font-weight: 600;
  font-size: 0.9rem;
  color: #555;
}

input[type='text'],
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  font-size: 1rem;
  font-family: inherit;
  color: var(--text);
  background: #f6f7fa;
  border: 2px solid transparent;
  border-radius: 12px;
  box-shadow: var(--shadow-in);
  outline: none;
  transition: border-color 0.15s;
}

textarea {
  resize: vertical;
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--accent);
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

.flashcard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  transition: transform 0.1s, box-shadow 0.15s, background 0.15s;
}

.btn:active {
  transform: translateY(1px);
}

.btn-ghost {
  background: #fff;
  box-shadow: var(--shadow-small);
}

.btn-accent {
  background: var(--accent);
  color: #000;
  box-shadow: 4px 4px 12px rgba(230, 191, 0, 0.45), -3px -3px 8px rgba(255, 255, 255, 0.9);
}

.btn-accent:hover {
  background: var(--accent-dark);
}

.btn-dashed {
  background: #fffbe6;
  border: 2px dashed var(--accent);
}

.btn-dashed:hover {
  background: #fff3b0;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-small);
  cursor: pointer;
  color: var(--text);
}

.icon-btn:hover {
  background: var(--accent);
}

.error {
  margin: 0;
  padding: 12px 16px;
  border-radius: 12px;
  background: #fff;
  color: #c0392b;
  font-weight: 600;
  box-shadow: var(--shadow-small);
  border-left: 5px solid #c0392b;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 600px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>