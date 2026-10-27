<script setup>
import '@/assets/admincommon.css'
import AdminNav from '@/components/common/adminNav.vue';
import { ref, onMounted, computed, reactive, watch } from 'vue';

// DB team please get rid of sampleData and use Supabase data THANKS
const sampleData = ref([
  {
   'id':1,
   'deck_name': "plus or minus?",
   'subjects': 'Mathematics',
   'difficulty': 3,
   'school_level_id': 1,
   'pages': 50,
   'question_purpose': 'quick_check',
   'question_type': 'T/F'   // ******** T/F means true or false
  },
  {
   'id':2,
   'deck_name': "multiply",
   'subjects': 'Mathematics',
   'difficulty': 1,
   'school_level_id': 3,
   'pages': 33,
   'question_purpose': 'quick_check',
   'question_type': 'T/F'
  },
  {
   'id':3,
   'deck_name': "human",
   'subjects': 'Science',
   'difficulty': 3,
   'school_level_id': 2,
   'pages': 89,
   'question_purpose': 'quick_check',
   'question_type': 'T/F'
  },
  {
    id: 4,
    deck_name: 'Plants and Their Parts',
    subjects: 'Science',
    difficulty: '2',
    school_level_id: 4,
    question_purpose: 'quiz',
    question_type: 'MCQ',
    pages: 5,
    questions: [
      'Which part of a plant absorbs water and minerals from the soil?',
      'What is the main function of the leaves?',
      'Which part of the plant carries water from the roots to the leaves?',
      'What do plants need to make food during photosynthesis?',
      'Which part of a flower develops into a fruit?'
    ],
    question_options: [
      ['Stem', 'Roots', 'Leaves', 'Flowers'],
      ['To make food', 'To absorb water', 'To hold the plant upright', 'To produce seeds'],
      ['Roots', 'Petals', 'Stem', 'Fruit'],
      ['Sunlight, water and carbon dioxide', 'Soil, oxygen and sugar', 'Sunlight, oxygen and sugar', 'Water, soil and nitrogen'],
      ['Petal', 'Ovary', 'Stigma', 'Sepal']
    ],
    question_answers: [
      'Roots',
      'To make food',
      'Stem',
      'Sunlight, water and carbon dioxide',
      'Ovary'
    ],
    correct_option: [1, 0, 2, 0, 1]
  }
]);

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

// turn stored values back into readable labels
const typeLabels = { 'T/F': 'True or False', 'MCQ': 'MCQ' }
const purposeLabels = {
  quick_check: 'Quick Check',
  quiz: 'Quiz',
  boss_battle: 'Boss Battle',
}

const searchQuery = ref('')

const filteredData = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return sampleData.value;

  return sampleData.value.filter(user =>
    user.deck_name.toLowerCase().includes(query)
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
    let result
    if (sortKey.value === 'school_level_id') {
      result = a.school_level_id - b.school_level_id;
    } else if (sortKey.value === 'pages'){
      result = a.pages - b.pages;
    } else if (sortKey.value === 'deck_name'){
      result = (a.deck_name ?? '').localeCompare(b.deck_name ?? '')
    } else if (sortKey.value === 'difficulty'){
      result = a.difficulty - b.difficulty
    }
    return sortOrder.value === 'asc' ? result : -result
  })
  return list
})

function arrow(key) {
  if (sortKey.value !== key) return '↕';
  return sortOrder.value === 'asc' ? '↑' : '↓';
}

const showPanel = ref(false)
const errorMsg = ref('')

// options: label shown to user, value stored in the data
const subjectOptions = ['Mathematics', 'Science']
const difficultyOptions = ['1', '2', '3']
const levelOptions = [1, 2, 3, 4, 5, 6].map(n => ({ label: `P${n}`, value: n }))
const typeOptions = [
  { label: 'True or False', value: 'T/F' },
  { label: 'MCQ', value: 'MCQ' },
]
const purposeOptions = [
  { label: 'Quick Check', value: 'quick_check' },
  { label: 'Quiz', value: 'quiz' },
  { label: 'Boss Battle', value: 'boss_battle' },
]

const emptyForm = () => ({
  deck_name: '',
  subjects: '',
  difficulty: '',
  school_level_id: '',
  question_type: '',
  question_purpose: '',
})
const form = reactive(emptyForm())

function openPanel() {
  Object.assign(form, emptyForm())
  questions.value = [];
  errorMsg.value = ''
  showPanel.value = true
}

function closePanel() {
  showPanel.value = false
}

function publish() {
  // 1. existing check for the six main fields
  const missing = Object.values(form)
    .filter(val => val === '' || val === null || (typeof val === 'string' && !val.trim()))
  if (missing.length > 0) {
    errorMsg.value = 'Please fill in all fields.'
    return
  }

  // 2. check the questions
  const isMCQ = form.question_type === 'MCQ'

  if (questions.value.length === 0) {
    errorMsg.value = 'Add at least one question.'
    return
  }

  for (let i = 0; i < questions.value.length; i++) {
    const q = questions.value[i]
    if (!q.text.trim()) {
      errorMsg.value = `Question ${i + 1} is missing its question text.`
      return
    }
    if (isMCQ) {
      if (q.options.some(o => !o.trim())) {
        errorMsg.value = `Question ${i + 1} needs all four options filled in.`
        return
      }
      if (q.correct === '') {
        errorMsg.value = `Select the correct option for question ${i + 1}.`
        return
      }
    } else if (q.answer === '') {
      errorMsg.value = `Select True or False for question ${i + 1}.`
      return
    }
  }

  // 3. build and add the deck
  const list = sampleData.value ?? []
  const nextId = list.reduce((max, d) => Math.max(max, d.id), 0) + 1

  sampleData.value = [...list, {
    id: nextId,
    deck_name: form.deck_name.trim(),
    subjects: form.subjects,
    difficulty: form.difficulty,
    school_level_id: form.school_level_id,
    question_purpose: form.question_purpose,
    question_type: form.question_type,

    pages: questions.value.length,
    questions: questions.value.map(q => q.text.trim()),
    question_options: questions.value.map(q => isMCQ ? q.options.map(o => o.trim()) : []),
    question_answers: questions.value.map(q => isMCQ ? q.options[q.correct].trim() : q.answer),
    correct_option: questions.value.map(q => isMCQ ? q.correct : null),
  }]

  errorMsg.value = ''
  closePanel()
}

const questions = ref([])

function newQuestion() {
  if (form.question_type === 'MCQ') {
    return { text: '', options: ['', '', '', ''], correct: '' }
  }
  return { text: '', answer: '' }   // T/F
}

function addQuestion() {
  questions.value.push(newQuestion())
}

function removeQuestion(index) {
  questions.value.splice(index, 1)
}

// when the user picks / changes the question type, start fresh with one question
watch(() => form.question_type, (type) => {
  questions.value = type ? [newQuestion()] : []
})

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
                    @click="toggleSort('deck_name')"
                  >
                    Deck Name {{ arrow('deck_name') }}
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
                <div class="col-1">Question Type</div>

                <div class="col-1">Question Purpose</div>

                <div class="col-2">Actions</div>

              </div>
              <!-- view panel -->
               <div v-if="showViewPanel && selectedDeck" class="overlay" @click.self="closeViewPanel">
                <div class="panel">
                  <h3>{{ selectedDeck.deck_name }}</h3>

                  <div class="detail-grid">
                    <span class="detail-label">Subject</span>
                    <span>{{ selectedDeck.subjects }}</span>

                    <span class="detail-label">Level</span>
                    <span>P{{ selectedDeck.school_level_id }}</span>

                    <span class="detail-label">Difficulty</span>
                    <span>{{ selectedDeck.difficulty }}</span>

                    <span class="detail-label">Question Type</span>
                    <span>{{ typeLabels[selectedDeck.question_type] ?? selectedDeck.question_type }}</span>

                    <span class="detail-label">Question Purpose</span>
                    <span>{{ purposeLabels[selectedDeck.question_purpose] ?? selectedDeck.question_purpose }}</span>

                    <span class="detail-label">Pages</span>
                    <span>{{ selectedDeck.pages }}</span>
                  </div>

                  <hr>
                  <h4>Questions</h4>

                  <p v-if="!selectedDeck.questions?.length" class="muted">
                    This deck has no questions yet.
                  </p>

                  <div
                    v-for="(question, qi) in selectedDeck.questions ?? []"
                    :key="qi"
                    class="question-card"
                  >
                    <strong>{{ qi + 1 }}. {{ question }}</strong>

                    <!-- True or False -->
                    <p v-if="selectedDeck.question_type === 'T/F'" class="answer-line">
                      Answer:
                      <span class="correct">
                        {{ selectedDeck.question_answers?.[qi] ? 'True' : 'False' }}
                      </span>
                    </p>

                    <!-- MCQ -->
                    <ul v-else class="option-list">
                      <li
                        v-for="(opt, oi) in selectedDeck.question_options?.[qi] ?? []"
                        :key="oi"
                        :class="{ correct: oi === selectedDeck.correct_option?.[qi] }"
                      >
                        {{ String.fromCharCode(65 + oi) }}. {{ opt }}
                        <span v-if="oi === selectedDeck.correct_option?.[qi]"> ✓</span>
                      </li>
                    </ul>
                  </div>

                  <div class="actions">
                    <button class="cancel-button" @click="closeViewPanel">Close</button>
                  </div>
                </div>
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
                      {{ deck.deck_name.charAt(0).toUpperCase() }}
                    </div>

                    <span class="username">
                      {{ deck.deck_name }}
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

                <div class="col-1">{{ deck.question_type }}</div>

                <!-- ACCOUNT STATUS -->
                <div class="col-1">
                  <span
                    class="account-status"
                    :class="deck.banned ? 'status-banned' : 'status-active'"
                  >
                    {{ deck.question_purpose }}
                  </span>
                </div>

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

                    <button class="action-btn remove-btn" @click="sampleData = sampleData.filter(d => d.id !== deck.id)">
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
          <div v-if="showPanel" class="overlay" @click.self="closePanel">
            <div class="panel">
              <h3>New Quiz Deck</h3>

              <label>Deck Name
                <input type="text" v-model="form.deck_name" placeholder="Enter deck name" />
              </label>

              <label>Subject
                <select v-model="form.subjects">
                  <option disabled value="">Select subject</option>
                  <option v-for="s in subjectOptions" :key="s" :value="s">{{ s }}</option>
                </select>
              </label>

              <label>Difficulty
                <select v-model="form.difficulty">
                  <option disabled value="">Select difficulty</option>
                  <option v-for="d in difficultyOptions" :key="d" :value="d">{{ d }}</option>
                </select>
              </label>

              <label>Level
                <select v-model="form.school_level_id">
                  <option disabled value="">Select level</option>
                  <option v-for="l in levelOptions" :key="l.value" :value="l.value">{{ l.label }}</option>
                </select>
              </label>

              <label>Question Type
                <select v-model="form.question_type">
                  <option disabled value="">Select type</option>
                  <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
              </label>

              <label>Question Purpose
                <select v-model="form.question_purpose">
                  <option disabled value="">Select purpose</option>
                  <option v-for="p in purposeOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
                </select>
              </label>

              <!-- questions: only appears once a question type is chosen -->
              <div v-if="form.question_type" class="questions">
                <div v-for="(q, qi) in questions" :key="qi" class="question-card">
                  <div class="question-header">
                    <strong>Question {{ qi + 1 }}</strong>
                    <button type="button" class="remove-button" @click="removeQuestion(qi)">✕</button>
                  </div>

                  <input type="text" v-model="q.text" placeholder="Enter question" />

                  <!-- True or False -->
                  <div v-if="form.question_type === 'T/F'" class="tf-answer">
                    <label class="inline">
                      <input type="radio" :name="'answer-' + qi" :value="true" v-model="q.answer" /> True
                    </label>
                    <label class="inline">
                      <input type="radio" :name="'answer-' + qi" :value="false" v-model="q.answer" /> False
                    </label>
                  </div>

                  <!-- MCQ -->
                  <div v-else class="mcq-options">
                    <label v-for="(opt, oi) in q.options" :key="oi" class="inline">
                      <input type="radio" :name="'correct-' + qi" :value="oi" v-model="q.correct" />
                      <input type="text" v-model="q.options[oi]" :placeholder="'Option ' + (oi + 1)" />
                    </label>
                    <small>Select the radio button next to the correct option.</small>
                  </div>
                </div>

                <button type="button" class="add-question-button" @click="addQuestion">+ Add question</button>
              </div>

              <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

              <div class="actions">
                <button class="cancel-button" @click="closePanel">Cancel</button>
                <button class="publish-button" @click="publish">Publish</button>
              </div>
            </div>
          </div>
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
.view-btn:hover {

  background-color: rgb(163, 229, 248);

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

.option-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-list li {
  padding: 6px 10px;
  border-radius: 6px;
  background: #f2f2f2;
}

.option-list li.correct,
.answer-line .correct {
  color: #1e7e34;
  font-weight: 600;
}

.option-list li.correct {
  background: #e3f4e7;
}

.answer-line {
  margin: 0;
}

</style>
