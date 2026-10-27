
<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminNav from '@/components/common/adminNav.vue'

import {
  getAdminQuiz,
  saveAdminQuiz
} from '@/data/adminQuizData'

const router = useRouter()
const route = useRoute()

// ========================================
// STATE
// ========================================

const quiz = ref(null)
const editMode = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Safely copy plain quiz records from Vue refs
function copyQuiz(value) {
  return JSON.parse(JSON.stringify(value))
}

// ========================================
// LOAD SELECTED QUIZ
// ========================================

function loadQuiz() {
  const found = getAdminQuiz(route.params.id)

  quiz.value = found ? copyQuiz(found) : null

  editMode.value = false
  errorMessage.value = ''
}

watch(
  () => route.params.id,
  loadQuiz,
  { immediate: true }
)

// ========================================
// NAVIGATION
// ========================================

function goBack() {
  router.push({ name: 'adminQuiz' })
}

// ========================================
// EDIT MODE
// ========================================

function startEditing() {
  if (!quiz.value) return

  editMode.value = true
  errorMessage.value = ''
  successMessage.value = ''
}

function cancelEditing() {
  loadQuiz()
  successMessage.value = ''
}

// ========================================
// QUESTION FUNCTIONS
// ========================================

function createQuestion() {
  const questionId = crypto.randomUUID()

  const options = Array.from(
    { length: 4 },
    (_, index) => ({
      id: crypto.randomUUID(),
      question_id: questionId,
      option_text: '',
      option_order: index + 1
    })
  )

  return {
    id: questionId,
    question_text: '',
    question_type: 'mcq',
    question_purpose: 'quiz',
    difficulty: 1,
    concept_id: null,
    options,
    answer: {
      question_id: questionId,
      correct_option_id: options[0].id,
      explanation: ''
    }
  }
}

function addQuestion() {
  if (!quiz.value || !editMode.value) return

  quiz.value.questions.push(createQuestion())
}

function removeQuestion(index) {
  if (!editMode.value) return

  if (quiz.value.questions.length <= 1) {
    errorMessage.value =
      'A quiz must contain at least one question.'
    return
  }

  quiz.value.questions.splice(index, 1)
  errorMessage.value = ''
}

function changeQuestionType(question) {
  const isTrueFalse =
    question.question_type === 'true_false'

  const optionTexts = isTrueFalse
    ? ['True', 'False']
    : ['', '', '', '']

  question.options = optionTexts.map(
    (optionText, index) => ({
      id: crypto.randomUUID(),
      question_id: question.id,
      option_text: optionText,
      option_order: index + 1
    })
  )

  // Default to the first correct answer
  question.answer.correct_option_id =
    question.options[0].id
}

// ========================================
// COMPUTED VALUES
// ========================================

const questionCount = computed(() =>
  quiz.value?.questions?.length || 0
)

const mcqCount = computed(() =>
  quiz.value?.questions?.filter(
    q => q.question_type === 'mcq'
  ).length || 0
)

const trueFalseCount = computed(() =>
  quiz.value?.questions?.filter(
    q => q.question_type === 'true_false'
  ).length || 0
)

function difficultyLabel(value) {
  return {
    1: 'Easy',
    2: 'Medium',
    3: 'Hard'
  }[value] || 'Unknown'
}

// ========================================
// VALIDATION
// ========================================

function validateQuiz() {
  if (!quiz.value) {
    return 'Quiz not found.'
  }

  if (!quiz.value.title.trim()) {
    return 'Quiz name cannot be empty.'
  }

  if (!quiz.value.topic.trim()) {
    return 'Topic cannot be empty.'
  }

  if (!quiz.value.questions.length) {
    return 'A quiz must contain at least one question.'
  }

  for (let i = 0; i < quiz.value.questions.length; i++) {
    const question = quiz.value.questions[i]

    if (!question.question_text.trim()) {
      return `Question ${i + 1} cannot be empty.`
    }

    if (!['mcq', 'true_false'].includes(
      question.question_type
    )) {
      return `Question ${i + 1} has an invalid type.`
    }

    if (![1, 2, 3].includes(question.difficulty)) {
      return `Question ${i + 1} has an invalid difficulty.`
    }

    const requiredCount =
      question.question_type === 'true_false' ? 2 : 4

    if (question.options.length !== requiredCount) {
      return `Question ${i + 1} has an invalid number of options.`
    }

    const emptyOption = question.options.some(
      option => !option.option_text.trim()
    )

    if (emptyOption) {
      return `Please complete all options for Question ${i + 1}.`
    }

    const correctOptionExists = question.options.some(
      option =>
        option.id === question.answer.correct_option_id
    )

    if (!correctOptionExists) {
      return `Please select a correct answer for Question ${i + 1}.`
    }
  }

  return null
}

// ========================================
// SAVE CHANGES LOCALLY
// ========================================

function saveChanges() {
  errorMessage.value = ''
  successMessage.value = ''

  const validationError = validateQuiz()

  if (validationError) {
    errorMessage.value = validationError
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  const saved = saveAdminQuiz(quiz.value)

  if (!saved) {
    errorMessage.value = 'Unable to save quiz changes.'
    return
  }

  // Refresh from shared data to show the saved version
  loadQuiz()

  successMessage.value =
    'Quiz changes saved successfully!'
}
</script>

<template>
  <div class="admin-layout">
    <AdminNav />

    <main class="admin-content quiz-details-content">

      <!-- QUIZ NOT FOUND -->
      <section v-if="!quiz" class="quiz-panel">
        <h2>Quiz not found</h2>
        <p>
          This quiz is not available in the sample data.
        </p>

        <button
          class="quiz-primary-btn"
          type="button"
          @click="goBack"
        >
          Back to Quizzes
        </button>
      </section>

      <template v-else>

        <!-- ==================================
             HEADER
        ================================== -->
        <header class="details-header">

          <div>
            <button
              class="back-btn"
              type="button"
              @click="goBack"
            >
              ← Back to Quizzes
            </button>

            <h1>
              {{ editMode ? 'Edit Quiz' : 'Quiz Details' }}
            </h1>

            <p>
              {{
                editMode
                  ? 'Update quiz information, questions and answers.'
                  : 'Review quiz information and correct answers.'
              }}
            </p>
          </div>

          <div class="header-actions">

            <template v-if="editMode">
              <button
                class="quiz-outline-btn"
                type="button"
                @click="cancelEditing"
              >
                Cancel Editing
              </button>

              <button
                class="quiz-primary-btn"
                type="button"
                @click="saveChanges"
              >
                ✓ Save Changes
              </button>
            </template>

            <button
              v-else
              class="quiz-primary-btn"
              type="button"
              @click="startEditing"
            >
              ✎ Edit Quiz
            </button>

          </div>
        </header>

        <!-- NOTIFICATIONS -->
        <div
          v-if="errorMessage"
          class="alert error"
        >
          {{ errorMessage }}
        </div>

        <div
          v-if="successMessage"
          class="alert success"
        >
          ✓ {{ successMessage }}
        </div>

        <!-- ==================================
             SUMMARY CARDS
        ================================== -->
        <div class="summary-grid">

          <div class="summary-card yellow-card">
            <span>Total Questions</span>
            <strong>{{ questionCount }}</strong>
          </div>

          <div class="summary-card green-card">
            <span>Multiple Choice</span>
            <strong>{{ mcqCount }}</strong>
          </div>

          <div class="summary-card blue-card">
            <span>True / False</span>
            <strong>{{ trueFalseCount }}</strong>
          </div>

        </div>

        <!-- ==================================
             QUIZ INFORMATION
        ================================== -->
        <section class="quiz-panel">

          <div class="section-heading">
            <span class="section-number">1</span>

            <div>
              <h2>Quiz Information</h2>
              <p>Basic information about this quiz.</p>
            </div>
          </div>

          <div class="details-grid">

            <!-- QUIZ NAME -->
            <div class="field-group full-width">
              <label>Quiz Name</label>

              <input
                v-if="editMode"
                v-model="quiz.title"
                class="form-control detail-input"
                type="text"
              />

              <div v-else class="read-value">
                {{ quiz.title }}
              </div>
            </div>

            <!-- SCHOOL LEVEL -->
            <div class="field-group">
              <label>School Level</label>

              <select
                v-if="editMode"
                v-model="quiz.level"
                class="form-select detail-input"
              >
                <option
                  v-for="level in 6"
                  :key="level"
                  :value="`P${level}`"
                >
                  Primary {{ level }}
                </option>
              </select>

              <div v-else class="read-value">
                {{ quiz.level }}
              </div>
            </div>

            <!-- SUBJECT -->
            <div class="field-group">
              <label>Subject</label>

              <select
                v-if="editMode"
                v-model="quiz.subject"
                class="form-select detail-input"
              >
                <option value="Science">Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="English">English</option>
              </select>

              <div v-else class="read-value">
                {{ quiz.subject }}
              </div>
            </div>

            <!-- TOPIC -->
            <div class="field-group">
              <label>Topic</label>

              <input
                v-if="editMode"
                v-model="quiz.topic"
                class="form-control detail-input"
                placeholder="Enter topic"
              />

              <div v-else class="read-value">
                {{ quiz.topic }}
              </div>
            </div>

            <!-- STATUS -->
            <div class="field-group">
              <label>Status</label>

              <select
                v-if="editMode"
                v-model="quiz.active"
                class="form-select detail-input"
              >
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select>

              <div v-else class="read-value">
                <span
                  class="status-pill"
                  :class="quiz.active ? 'active' : 'inactive'"
                >
                  ● {{ quiz.active ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>

          </div>
        </section>

        <!-- ==================================
             QUIZ QUESTIONS
        ================================== -->
        <section class="questions-section">

          <div class="questions-header">
            <div>
              <h2>Quiz Questions</h2>
              <p>
                {{ questionCount }}
                question(s) in this quiz
              </p>
            </div>

            <button
              v-if="editMode"
              class="quiz-primary-btn"
              type="button"
              @click="addQuestion"
            >
              ＋ Add Question
            </button>
          </div>

          <!-- QUESTION CARD -->
          <div
            v-for="(question, qIndex) in quiz.questions"
            :key="question.id"
            class="quiz-panel question-card"
          >

            <!-- QUESTION HEADER -->
            <div class="question-top">

              <div class="question-title-row">

                <span class="question-number">
                  Question {{ qIndex + 1 }}
                </span>

                <span class="type-badge">
                  {{
                    question.question_type === 'mcq'
                      ? 'MCQ'
                      : 'True / False'
                  }}
                </span>

                <span class="difficulty-badge">
                  {{ difficultyLabel(question.difficulty) }}
                </span>

              </div>

              <button
                v-if="editMode"
                class="remove-btn"
                type="button"
                @click="removeQuestion(qIndex)"
              >
                ✕ Remove
              </button>

            </div>

            <!-- QUESTION SETTINGS -->
            <div
              v-if="editMode"
              class="details-grid settings-grid"
            >

              <div class="field-group">
                <label>Question Type</label>

                <select
                  v-model="question.question_type"
                  class="form-select detail-input"
                  @change="changeQuestionType(question)"
                >
                  <option value="mcq">
                    Multiple Choice (MCQ)
                  </option>

                  <option value="true_false">
                    True / False
                  </option>
                </select>
              </div>

              <div class="field-group">
                <label>Difficulty</label>

                <select
                  v-model.number="question.difficulty"
                  class="form-select detail-input"
                >
                  <option :value="1">Easy</option>
                  <option :value="2">Medium</option>
                  <option :value="3">Hard</option>
                </select>
              </div>

            </div>

            <!-- QUESTION TEXT -->
            <div class="field-group question-text-field">
              <label>Question</label>

              <textarea
                v-if="editMode"
                v-model="question.question_text"
                class="form-control detail-input"
                rows="3"
                placeholder="Enter question here..."
              ></textarea>

              <p v-else class="question-text">
                {{ question.question_text }}
              </p>
            </div>

            <!-- ANSWER OPTIONS -->
            <div class="answers-section">

              <div class="answer-heading">
                <h3>Answer Options</h3>

                <span v-if="editMode">
                  Select the correct answer
                </span>
              </div>

              <div class="options-grid">

                <label
                  v-for="(option, optionIndex) in question.options"
                  :key="option.id"
                  class="answer-option"
                  :class="{
                    'correct-answer':
                      question.answer.correct_option_id === option.id
                  }"
                >

                  <!-- RADIO BUTTON -->
                  <input
                    v-if="editMode"
                    v-model="question.answer.correct_option_id"
                    type="radio"
                    :name="`answer-${question.id}`"
                    :value="option.id"
                  />

                  <!-- OPTION LETTER -->
                  <span class="option-letter">
                    {{ String.fromCharCode(65 + optionIndex) }}
                  </span>

                  <!-- EDITABLE MCQ OPTION -->
                  <input
                    v-if="
                      editMode &&
                      question.question_type === 'mcq'
                    "
                    v-model="option.option_text"
                    class="option-input"
                    type="text"
                    placeholder="Enter answer option"
                  />

                  <!-- READ-ONLY / TRUE FALSE -->
                  <span v-else class="option-text">
                    {{ option.option_text }}
                  </span>

                  <!-- CORRECT LABEL -->
                  <span
                    v-if="
                      question.answer.correct_option_id === option.id
                    "
                    class="correct-label"
                  >
                    ✓ Correct
                  </span>

                </label>

              </div>
            </div>

            <!-- EXPLANATION -->
            <div class="explanation-box">
              <label>Answer Explanation</label>

              <textarea
                v-if="editMode"
                v-model="question.answer.explanation"
                class="form-control detail-input"
                rows="2"
                placeholder="Explain why this answer is correct..."
              ></textarea>

              <p v-else>
                {{
                  question.answer.explanation ||
                  'No explanation provided.'
                }}
              </p>
            </div>

          </div>
        </section>

        <!-- BOTTOM BUTTONS -->
        <div
          v-if="editMode"
          class="bottom-actions"
        >
          <button
            class="quiz-outline-btn"
            type="button"
            @click="cancelEditing"
          >
            Cancel
          </button>

          <button
            class="quiz-primary-btn"
            type="button"
            @click="saveChanges"
          >
            ✓ Save Changes
          </button>
        </div>

      </template>
    </main>
  </div>
</template>

<style scoped>
.quiz-details-content {
  min-width: 0;
  padding: 30px;
  color: #30304b;
  box-sizing: border-box;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 26px;
}

.details-header h1 {
  font-size: 30px;
  font-weight: 800;
  margin: 0 0 5px;
}

.details-header p {
  font-size: 14px;
  color: #7b8095;
  margin: 0;
}

.back-btn {
  border: 0;
  background: transparent;
  padding: 0;
  margin-bottom: 14px;
  color: #7b8095;
  font: inherit;
  cursor: pointer;
}

.back-btn:hover {
  color: #30304b;
}

.header-actions,
.bottom-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.quiz-primary-btn {
  border: 0;
  border-radius: 10px;
  padding: 11px 19px;
  background: #ffd31b;
  color: #30304b;
  font-weight: 800;
  cursor: pointer;
}

.quiz-primary-btn:hover {
  background: #f4c500;
}

.quiz-outline-btn {
  border: 1px solid #dedee5;
  border-radius: 10px;
  padding: 11px 19px;
  background: #fff;
  color: #30304b;
  font-weight: 700;
  cursor: pointer;
}

.quiz-outline-btn:hover {
  background: #f5f5f9;
}

.quiz-panel {
  padding: 22px;
  margin-bottom: 24px;
  border: 1px solid #ececf0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(48, 48, 75, 0.05);
}

/* SUMMARY */

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 115px;
  padding: 20px;
  border: 1px solid #ece8de;
  border-radius: 16px;
}

.summary-card span {
  font-size: 13px;
  font-weight: 700;
}

.summary-card strong {
  font-size: 34px;
  line-height: 1;
}

.yellow-card {
  background: #fff3ce;
}

.green-card {
  background: #e9f5ec;
}

.blue-card {
  background: #eaf0fb;
}

/* SECTION HEADINGS */

.section-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.section-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #ffd31b;
  font-weight: 800;
}

.section-heading h2,
.questions-header h2 {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 4px;
}

.section-heading p,
.questions-header p {
  font-size: 14px;
  color: #7b8095;
  margin: 0;
}

/* QUIZ INFORMATION */

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.full-width {
  grid-column: 1 / -1;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.field-group label,
.explanation-box label {
  font-size: 13px;
  font-weight: 700;
  color: #5f6273;
}

.detail-input {
  min-height: 43px;
  border: 1px solid #dedee5;
  border-radius: 9px;
  padding: 10px 12px;
  color: #30304b;
  background: #fff;
  font: inherit;
}

.detail-input:focus {
  outline: none;
  border-color: #edbf18;
  box-shadow: 0 0 0 0.2rem rgba(255, 211, 27, 0.2);
}

.read-value {
  display: flex;
  align-items: center;
  min-height: 43px;
  padding: 10px 12px;
  border-radius: 9px;
  background: #f8f8fa;
  font-size: 14px;
}

.status-pill {
  font-size: 12px;
  font-weight: 800;
}

.status-pill.active {
  color: #287d49;
}

.status-pill.inactive {
  color: #85858b;
}

/* QUESTIONS */

.questions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin: 30px 0 18px;
}

.question-card {
  margin-bottom: 18px;
}

.question-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.question-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.question-number {
  font-size: 17px;
  font-weight: 800;
}

.type-badge,
.difficulty-badge {
  padding: 5px 10px;
  border-radius: 8px;
  background: #f2f3f7;
  color: #5f6273;
  font-size: 11px;
  font-weight: 700;
}

.difficulty-badge {
  background: #fff3ce;
  color: #85630c;
}

.remove-btn {
  border: 0;
  border-radius: 8px;
  padding: 8px 12px;
  background: #fff0f0;
  color: #c34b4b;
  font: inherit;
  cursor: pointer;
}

.remove-btn:hover {
  background: #ffe1e1;
}

.settings-grid {
  margin-bottom: 20px;
}

.question-text-field {
  margin-bottom: 22px;
}

.question-text {
  margin: 0;
  padding: 14px;
  border-radius: 10px;
  background: #f8f8fa;
  font-size: 16px;
  font-weight: 600;
  white-space: pre-wrap;
}

/* ANSWERS */

.answers-section {
  margin-top: 20px;
}

.answer-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.answer-heading h3 {
  font-size: 15px;
  font-weight: 800;
  margin: 0;
}

.answer-heading span {
  color: #7b8095;
  font-size: 12px;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.answer-option {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  border: 1px solid #dedee5;
  border-radius: 10px;
  background: #fff;
  cursor: default;
}

.answer-option.correct-answer {
  border-color: #78c98b;
  background: #e9f5ec;
}

.answer-option input[type="radio"] {
  accent-color: #48a667;
  flex-shrink: 0;
  cursor: pointer;
}

.option-letter {
  color: #7b8095;
  font-weight: 800;
}

.option-text {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 14px;
}

.option-input {
  flex: 1;
  min-width: 0;
  border: 1px solid #dedee5;
  border-radius: 7px;
  padding: 8px 10px;
  color: #30304b;
  font: inherit;
}

.option-input:focus {
  outline: none;
  border-color: #edbf18;
}

.correct-label {
  color: #287d49;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

/* EXPLANATION */

.explanation-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 24px;
  padding: 16px;
  background: #f7f9f6;
  border-radius: 12px;
}

.explanation-box p {
  margin: 0;
  color: #555e71;
  font-size: 14px;
  white-space: pre-wrap;
}

/* ACTIONS + ALERTS */

.bottom-actions {
  justify-content: flex-end;
  margin-top: 28px;
}

.alert {
  padding: 14px 16px;
  margin-bottom: 20px;
  border-radius: 10px;
}

.alert.error {
  background: #fff0f0;
  color: #b34d4d;
}

.alert.success {
  background: #eef9ef;
  color: #287949;
}

/* RESPONSIVE */

@media (max-width: 767px) {
  .quiz-details-content {
    padding: 18px;
  }

  .details-header h1 {
    font-size: 25px;
  }

  .quiz-panel {
    padding: 15px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .details-grid,
  .options-grid {
    grid-template-columns: 1fr;
  }

  .summary-card {
    min-height: auto;
  }
}
</style>
