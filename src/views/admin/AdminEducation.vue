<script setup>
import '@/assets/admincommon.css'
import AdminNav from '@/components/common/adminNav.vue';
import { ref, onMounted, computed, reactive } from 'vue';

// DB team please get rid of sampleData and use Supabase data THANKS
const sampleData = ref([
  {
    id: 1,
    concept_title: 'Photosynthesis',
    topic_name: 'Plant Systems',
    subjects: 'Science',
    school_level_id: 5,
    difficulty: 3,
    pages: 2,
    flashcards: [
      {
        front_text: 'What is photosynthesis?',
        back_text: 'The process plants use to make food from sunlight, water and carbon dioxide.',
      },
      {
        front_text: 'What do plants need for photosynthesis?',
        back_text: 'Sunlight, water and carbon dioxide.',
      },
    ],
  },
  {
    id: 2,
    concept_title: 'Multiplication Basics',
    topic_name: 'Whole Numbers',
    subjects: 'Mathematics',
    school_level_id: 3,
    difficulty: 2,
    pages: 2,
    flashcards: [
      {
        front_text: 'What is multiplication?',
        back_text: 'A quick way of adding the same number many times.',
      },
      {
        front_text: 'What is 6 x 7?',
        back_text: '42',
      },
    ],
  },
  {
    id: 3,
    concept_title: 'The Human Skeleton',
    topic_name: 'Human Body',
    subjects: 'Science',
    school_level_id: 2,
    difficulty: 1,
    pages: 1,
    flashcards: [
      {
        front_text: 'What are the main functions of the skeleton?',
        back_text: 'It supports the body, protects organs and allows movement.',
      },
    ],
  },
]);

/* ---------------- search + sort ---------------- */

const searchQuery = ref('')

const filteredData = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return sampleData.value;

  return sampleData.value.filter(deck =>
    (deck.concept_title ?? '').toLowerCase().includes(query)
  )
})

const sortKey = ref('');
const sortOrder = ref('asc');

function toggleSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const displayedDecks = computed(() => {
  const list = [...filteredData.value]
  if (!sortKey.value) return list

  list.sort((a, b) => {
    let result = 0
    if (sortKey.value === 'pages') {
      result = (a.pages ?? 0) - (b.pages ?? 0)
    } else if (['concept_title', 'topic_name', 'subject_name', 'school_level_id'].includes(sortKey.value)) {
      // numeric: true makes "Primary 2" sort before "Primary 10"
      result = (a[sortKey.value] ?? '').localeCompare(b[sortKey.value] ?? '', undefined, { numeric: true })
    }
    return sortOrder.value === 'asc' ? result : -result
  })
  return list
})

function arrow(key) {
  if (sortKey.value !== key) return '↕';
  return sortOrder.value === 'asc' ? '↑' : '↓';
}

/* ---------------- add deck panel ---------------- */

const showPanel = ref(false)
const errorMsg = ref('')

const subjectOptions = ['Mathematics', 'Science']
const levelOptions = [1, 2, 3, 4, 5, 6].map(n => `Primary ${n}`)

const emptyForm = () => ({
  concept_title: '',
  topic_name: '',
  subject_name: '',
  school_level_id: '',
})
const form = reactive(emptyForm())

const emptyCard = () => ({ front_text: '', back_text: '' })
const flashcards = ref([emptyCard()])   // start with one card

function addFlashcard() {
  flashcards.value.push(emptyCard())
}

function removeFlashcard(index) {
  flashcards.value.splice(index, 1)
}

function openPanel() {

  
  Object.assign(form, emptyForm())
  flashcards.value = [emptyCard()]
  errorMsg.value = ''
  showPanel.value = true
  console.log('finished calling openPanel');
  
}

function closePanel() {
  showPanel.value = false
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

  // 3. add the deck
  const list = sampleData.value ?? []
  const nextId = list.reduce((max, d) => Math.max(max, d.id), 0) + 1

  sampleData.value = [...list, {
    id: nextId,
    concept_title: form.concept_title.trim(),
    topic_name: form.topic_name.trim(),
    subject_name: form.subject_name,
    school_level_id: form.school_level_id,
    pages: flashcards.value.length,
    flashcards: flashcards.value.map(c => ({
      front_text: c.front_text.trim(),
      back_text: c.back_text.trim(),
    })),
  }]

  errorMsg.value = ''
  closePanel()
}

/* ---------------- view deck panel ---------------- */

const showViewPanel = ref(false)
const selectedDeck = ref(null)

function openViewPanel(deck) {
  selectedDeck.value = deck
  showViewPanel.value = true
}

function closeViewPanel() {
  showViewPanel.value = false
  selectedDeck.value = null
}

/* ---------------- remove deck ---------------- */

function removeDeck(id) {
  sampleData.value = sampleData.value.filter(d => d.id !== id)
}

</script>

<template>
  <div class="admin-layout">

    <!-- Sidebar Component -->
     <AdminNav />

    <!-- Main Content -->
    <main class="admin-content">
      <div class="top-header">
        <div>
          <h1 style="font-weight: 800; font-size: 30px;">StudyDeck Overview</h1>
          <p style="font-size: 14px; color: #7D8095;">View and manage StudyDecks</p>
        </div>
        <button class="add-quiz-button" @click="openPanel()">+ Add Deck</button>
      </div>
        <div class="overview-panel">


          <!-- SEARCH BAR -->
          <div class="search-container">
            <span class="search-icon">⌕</span>

            <input
              v-model="searchQuery"
              type="search"
              class="search-bar"
              placeholder="Search deck by name..."
            />
          </div>

            <!-- USER TABLE USING BOOTSTRAP GRID -->
            <div class="user-table">

              <!-- COLUMN HEADINGS -->

              <div class="row table-header align-items-center">

                <div class="col-2">
                  <button
                    class="sort-button"
                    @click="toggleSort('concept_title')"
                  >
                    Deck Name {{ arrow('concept_title') }}
                  </button>
                </div>

                <div class="col-2">Subjects</div>

                <div class="col-1">
                  <button
                    class="sort-button"
                    @click="toggleSort('difficulty')"
                  >
                  Difficulty {{ arrow('difficulty') }}
                  </button>
                </div>

                <div class="col-1">
                  <button
                    class="sort-button"
                    @click="toggleSort('school_level_id')"
                  >
                    Level {{ arrow('school_level_id') }}
                  </button>
                </div>

                <div class="col-1">
                  <button
                    class="sort-button"
                    @click="toggleSort('pages')"
                  >
                    Pages {{ arrow('pages') }}
                  </button>
                </div>

                <!-- NEW COLUMN -->
                <!-- <div class="col-1">Question Type</div>

                <div class="col-1">Question Purpose</div> -->

                <div class="col-2">Actions</div>

              </div>


              <!-- STUDENT ROWS -->

              <div
                v-for="deck in displayedDecks"
                :key="deck.id"
                class="row user-row align-items-center"
              >

                <!-- USERNAME -->
                <div class="col-2">
                  <div class="user-profile">
                    <div class="user-avatar">
                      {{ deck.concept_title.charAt(0).toUpperCase() }}
                    </div>

                    <span class="username">
                      {{ deck.concept_title }}
                    </span>
                  </div>
                </div>

                <!-- EMAIL -->
                <div class="col-2 email-cell">
                  {{ deck.subjects }}
                </div>

                <!-- GENDER -->
                <div class="col-1">
                  {{
                    deck.difficulty
                  }}
                </div>

                <!-- LEVEL -->
                <div class="col-1">
                  <span class="level-badge">
                    P{{ deck.school_level_id }}
                  </span>
                </div>

                <!-- DATE JOINED -->
                <div class="col-1 date-cell">
                  {{ deck.pages }}
                </div>

                <!-- <div class="col-1">{{ deck.question_type }}</div> -->

                <!-- ACCOUNT STATUS -->
                <!-- <div class="col-1">
                  <span
                    class="account-status"
                    :class="deck.banned ? 'status-banned' : 'status-active'"
                  >
                    {{ deck.question_purpose }}
                  </span>
                </div> -->

                <!-- ACTION BUTTONS -->
                <div class="col-2">
                  <div class="action-buttons">

                    <button
                      class="view-btn"
                      @click="openViewPanel(deck)"
                    >
                      ⏿ View
                    </button>
                    <button
                      class="action-btn unban-btn"
                      :disabled="!deck.banned"

                      @click="banUser(deck,false)"
                    >
                      Unban
                    </button>

                    <button
                      class="action-btn ban-btn"
                      :disabled="deck.banned"

                      @click="banUser(deck,true)"
                    >
                      Ban
                    </button>

                    <button class="action-btn remove-btn">
                      Remove
                    </button>

                  </div>
                </div>

              </div>


              <!-- EMPTY SEARCH RESULT -->
              <div
                v-if="displayedDecks.length === 0"
                class="empty-state"
              >
                No decks found. Try another deck.
              </div>

            </div>

            <div class="table-footer">
              Showing {{ displayedDecks.length }}
              of {{ sampleData.length }} decks
            </div>

          </div>
          <!-- overlay + panel -->
          <div v-if="showViewPanel && selectedDeck" class="overlay" @click.self="closeViewPanel">
            <div class="panel">
              <h3>{{ selectedDeck.concept_title }}</h3>

              <div class="detail-grid">
                <span class="detail-label">Topic</span>
                <span>{{ selectedDeck.topic_name }}</span>

                <span class="detail-label">Subject</span>
                <span>{{ selectedDeck.subjects }}</span>

                <span class="detail-label">Level</span>
                <span>{{ selectedDeck.school_level_id }}</span>

                <span class="detail-label">Pages</span>
                <span>{{ selectedDeck.pages }}</span>
              </div>

              <h4>Flashcards</h4>

              <p v-if="!selectedDeck.flashcards?.length" class="muted">
                This deck has no flashcards yet.
              </p>

              <div
                v-for="(card, ci) in selectedDeck.flashcards ?? []"
                :key="ci"
                class="question-card"
              >
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

              <div class="actions">
                <button class="cancel-button" @click="closeViewPanel">Close</button>
              </div>
            </div>
          </div>
          <!-- end -->
    </main>

  </div>
</template>


<style scoped>
.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.add-quiz-button {
  border: 0;
  border-radius: 20px;
  background-color: #fad336;
  padding-left: 20px;
  padding-right: 20px;
  height: 50px;
  font-weight: 700;
}

/* OVERVIEW PANEL */

.overview-panel {
  width: 100%;
  padding: 24px;
  background: #fff;
  border: 1px solid #ececf0;
  border-radius: 18px;
  box-shadow: 0 4px 18px rgba(48, 48, 75, 0.04);
}

/* HEADER */

.overview-header {
  margin-bottom: 18px;
}

.overview-header h1 {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 800;
  color: #30304b;
}

.overview-header p {
  margin: 0;
  font-size: 13px;
  color: #8a8b9c;
}

/* SEARCH */

.search-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 0 16px;
  margin-bottom: 20px;

  background: #fffdf7;
  border: 1.5px solid #e8e7e1;
  border-radius: 12px;

  transition: border-color 0.2s ease;
}

.search-container:focus-within {
  border-color: #ffd21f;
}

.search-icon {
  font-size: 24px;
  color: #b1a36d;
}

.search-bar {
  width: 100%;
  flex: 1;
  min-width: 0;
  padding: 13px 0;

  border: none;
  outline: none;
  background: transparent;

  font-family: inherit;
  font-size: 14px;
  color: #30304b;
}

.search-bar::placeholder {
  color: #a4a5b2;
}

/* TABLE CONTAINER */

.user-table {
  width: 100%;
  overflow-x: auto;
}

/* BOOTSTRAP GRID ROWS */

.user-table > .row {
  min-width: 920px;
  margin-left: 0;
  margin-right: 0;
}

/* TABLE HEADER */

.table-header {
  padding: 14px 4px;
  margin-bottom: 5px;

  background: #fff8df;
  border: 1px solid #f0e5c1;
  border-radius: 10px;

  font-size: 12px;
  font-weight: 700;
  color: #6b634b;
}

/* USER ROWS */

.user-row {
  padding: 12px 4px;
  margin-bottom: 3px;

  background: #fff;
  border-bottom: 1px solid #f1f1f4;

  font-size: 13px;
  font-weight: 500;
  color: #414158;

  transition: background 0.2s ease;
}

.user-row:hover {
  background: #fffdf3;
  border-radius: 10px;
}

/* SORT BUTTONS */

.sort-button {
  padding: 0;
  border: none;
  background: transparent;

  font-family: inherit;
  font-size: inherit;
  font-weight: 700;
  color: inherit;

  cursor: pointer;
}

.sort-button:hover {
  color: #a47c00;
}

/* USER PROFILE */

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 34px;
  height: 34px;
  flex-shrink: 0;

  background: #fff0b5;
  border-radius: 50%;

  font-size: 14px;
  font-weight: 800;
  color: #846317;
}

.username {
  min-width: 0;
  overflow-wrap: anywhere;
  font-weight: 700;
  color: #30304b;
}

.email-cell,
.date-cell {
  color: #73758a;
}

/* LEVEL BADGE */

.level-badge {
  display: inline-block;
  padding: 5px 11px;

  background: #f1f0ff;
  color: #7870b6;

  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
}

/* ACTION BUTTONS */

.action-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
}

.action-btn {
  padding: 7px 11px;
  border: 1px solid transparent;
  border-radius: 8px;

  font-family: inherit;
  font-size: 11px;
  font-weight: 700;

  cursor: pointer;
  transition: background 0.2s ease;
}

.view-btn {
  padding: 7px 11px;
  border: 1px solid rgb(101, 232, 252);
  border-radius: 8px;

  background-color: rgb(204, 243, 255);

  font-family: inherit;
  font-size: 11px;
  font-weight: 700;

  cursor: pointer;
  transition: background 0.2s ease;
}

/* UNBAN */

.unban-btn {
  background: #e4f8ed;
  color: #27935b;
  border-color: #bcebd0;
}

.unban-btn:hover {
  background: #cef0dd;
}

/* BAN */

.ban-btn {
  background: #fff1d9;
  color: #b77b22;
  border-color: #f6dcad;
}

.ban-btn:hover {
  background: #ffe5b5;
}

/* REMOVE */

.remove-btn {
  background: #ffe8e8;
  color: #cd5454;
  border-color: #f8cccc;
}

.remove-btn:hover {
  background: #ffd7d7;
}

/* EMPTY STATE */

.empty-state {
  padding: 35px;
  text-align: center;
  color: #8a8b9c;
  font-size: 14px;
}

/* FOOTER */

.table-footer {
  margin-top: 14px;
  text-align: right;
  color: #9999a6;
  font-size: 12px;
}

/* RESPONSIVE */

@media (max-width: 768px) {
  .overview-panel {
    padding: 16px;
  }

  .overview-header h1 {
    font-size: 20px;
  }

  .user-table > .row {
    min-width: 920px;
  }
}

/* ACCOUNT STATUS */
.account-status {
  font-size: 12px;
  font-weight: 700;
}

/* BANNED - RED */
.status-banned {
  color: #d9534f;
}

/* NOT BANNED - GREEN */
.status-active {
  color: #2ca76b;
}

/* DISABLED ACTION BUTTONS */
.action-btn:disabled {
  background: #eeeeee;
  color: #aaaaaa;
  border-color: #dddddd;

  cursor: not-allowed;
  opacity: 0.65;
}

/* DISABLE HOVER EFFECT */
.action-btn:disabled:hover {
  background: #eeeeee;
  color: #aaaaaa;
  border-color: #dddddd;
  transform: none;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.panel {
  background: #fff;
  color: #000;
  border-radius: 12px;
  padding: 20px;
  width: 600px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 90vh;
  overflow-y: auto;
}

.panel label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-weight: 600;
}

.panel input,
.panel select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
}

.error {
  color: #c0392b;
  margin: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cancel-button{
  border: 1px solid grey;
  background-color: #dbdbdb;
  border-radius: 8px;
  padding: 10px;
}
.publish-button{
  border: 1px solid #be9e00;
  background-color: #ffd21f;
  border-radius: 8px;
  padding: 10px;
}

.question-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.questions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mcq-options,
.tf-answer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.panel label.inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  font-weight: normal;
}

.panel label.inline input[type="text"] {
  flex: 1;
}

.remove-button, .add-question-button{
  border: 0;
  border-radius: 8px;
}

.remove-button{
  border: 1px solid grey;
}

.card-side {
  background: #f2f2f2;
  border-radius: 6px;
  padding: 8px 10px;
}

.card-side.back {
  background: #e8f0fe;
}

.card-side p {
  margin: 4px 0 0;
  white-space: pre-wrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 16px;
}

.detail-label {
  font-weight: 600;
  color: #555;
}

.muted {
  color: #777;
  margin: 0;
}

.question-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

</style>
