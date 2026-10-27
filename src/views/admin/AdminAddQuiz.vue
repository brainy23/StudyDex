
<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminNav from '@/components/common/adminNav.vue'

const router = useRouter()

// ======================================
// SAMPLE DATA - NO SUPABASE
// ======================================

const levels = ref([
  { id: 'level-1', name: 'Primary 1', level_number: 1 },
  { id: 'level-2', name: 'Primary 2', level_number: 2 },
  { id: 'level-3', name: 'Primary 3', level_number: 3 },
  { id: 'level-4', name: 'Primary 4', level_number: 4 },
  { id: 'level-5', name: 'Primary 5', level_number: 5 },
  { id: 'level-6', name: 'Primary 6', level_number: 6 },
])

const subjects = ref([
  { id: 'subject-science', name: 'Science' },
  { id: 'subject-math', name: 'Mathematics' },
  { id: 'subject-english', name: 'English' },
])

const topics = ref([
  {
    id: 'topic-1',
    level_id: 'level-3',
    subject_id: 'subject-science',
    name: 'Living and Non-Living Things',
  },
  {
    id: 'topic-2',
    level_id: 'level-3',
    subject_id: 'subject-science',
    name: 'Plants',
  },
  {
    id: 'topic-3',
    level_id: 'level-3',
    subject_id: 'subject-science',
    name: 'Animals',
  },
  {
    id: 'topic-4',
    level_id: 'level-4',
    subject_id: 'subject-science',
    name: 'Matter',
  },
  {
    id: 'topic-5',
    level_id: 'level-4',
    subject_id: 'subject-science',
    name: 'Heat and Temperature',
  },
  {
    id: 'topic-6',
    level_id: 'level-5',
    subject_id: 'subject-science',
    name: 'Human Body Systems',
  },
  {
    id: 'topic-7',
    level_id: 'level-5',
    subject_id: 'subject-science',
    name: 'Electrical Systems',
  },
  {
    id: 'topic-8',
    level_id: 'level-6',
    subject_id: 'subject-science',
    name: 'Energy',
  },
  {
    id: 'topic-9',
    level_id: 'level-6',
    subject_id: 'subject-science',
    name: 'Forces',
  },
  {
    id: 'topic-10',
    level_id: 'level-3',
    subject_id: 'subject-math',
    name: 'Fractions',
  },
  {
    id: 'topic-11',
    level_id: 'level-4',
    subject_id: 'subject-math',
    name: 'Decimals',
  },
])

// ======================================
// FORM STATE
// ======================================

const selectedLevel = ref('')
const selectedSubject = ref('')
const selectedTopic = ref('')

const savedQuestions = ref([])
const showPreview = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// ======================================
// QUESTION FACTORY
// ======================================

function createQuestion() {
  return {
    localId: crypto.randomUUID(),
    question_text: '',
    question_type: 'mcq',
    difficulty: 1,
    question_purpose: 'quiz',
    explanation: '',
    options: ['', '', '', ''],
    correctIndex: 0,
  }
}

const questions = ref([createQuestion()])

// ======================================
// FILTER TOPICS
// ======================================

const filteredTopics = computed(() => {
  return topics.value.filter(topic =>
    topic.level_id === selectedLevel.value &&
    topic.subject_id === selectedSubject.value
  )
})

watch([selectedLevel, selectedSubject], () => {
  selectedTopic.value = ''
  successMessage.value = ''
})

// ======================================
// QUESTION MANAGEMENT
// ======================================

function addQuestion() {
  questions.value.push(createQuestion())
}

function removeQuestion(index) {
  if (questions.value.length === 1) return

  questions.value.splice(index, 1)
}

function changeQuestionType(question) {
  question.correctIndex = 0

  if (question.question_type === 'true_false') {
    question.options = ['True', 'False']
  } else {
    question.options = ['', '', '', '']
  }
}

// ======================================
// VALIDATION
// ======================================

const isFormValid = computed(() => {
  if (!selectedTopic.value) return false

  if (questions.value.length === 0) return false

  return questions.value.every(question => {
    if (!question.question_text.trim()) return false

    if (
      question.question_type === 'mcq' &&
      (
        question.options.length !== 4 ||
        question.options.some(opt => !opt.trim())
      )
    ) {
      return false
    }

    if (
      question.correctIndex < 0 ||
      question.correctIndex >= question.options.length
    ) {
      return false
    }

    return true
  })
})

// ======================================
// SAVE TO LOCAL ARRAY
// ======================================

function saveQuiz() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!isFormValid.value) {
    errorMessage.value =
      'Please complete all required fields before saving.'
    return
  }

  const now = new Date().toISOString()

  // Sample records matching your SQL tables
  const newQuestions = questions.value.map(question => {
    const questionId = crypto.randomUUID()

    const options = question.options.map(
      (option, index) => ({
        id: crypto.randomUUID(),
        question_id: questionId,
        option_text: option.trim(),
        option_order: index + 1,
      })
    )

    return {
      // questions table
      id: questionId,
      topic_id: selectedTopic.value,
      question_text: question.question_text.trim(),
      question_type: question.question_type,
      difficulty: question.difficulty,
      question_purpose: 'quiz',
      concept_id: null,
      created_at: now,

      // Related question_options records
      options,

      // Related question_answers record
      answer: {
        question_id: questionId,
        correct_option_id:
          options[question.correctIndex].id,
        explanation:
          question.explanation.trim() || null,
      },
    }
  })

  savedQuestions.value.push(...newQuestions)

  console.log('Saved Quiz Questions:', savedQuestions.value)

  successMessage.value =
    `${newQuestions.length} question(s) saved locally!`

  // Clear question form, keep topic selection
  questions.value = [createQuestion()]
  showPreview.value = false
}

// ======================================
// PREVIEW
// ======================================

function togglePreview() {
  errorMessage.value = ''

  if (!isFormValid.value) {
    errorMessage.value =
      'Complete the questions before previewing.'
    return
  }

  showPreview.value = !showPreview.value
}

function goBack() {
  router.push('/admin-quiz')
}

const selectedTopicName = computed(() => {
  return topics.value.find(
    topic => topic.id === selectedTopic.value
  )?.name || 'No topic selected'
})
</script>

<template>
  <div class="admin-layout">
    <AdminNav />

    <main class="admin-content add-quiz-container">


      <!-- PAGE HEADER -->
      <header class="page-header">
        <div>
          <button
            type="button"
            class="back-btn"
            @click="goBack"
          >
            ← Back to Quizzes
          </button>

          <h1>⚔️ Create Quiz</h1>

          <p>
            Build questions for your StudyDex trainers.
          </p>
        </div>

        <div class="header-badge">
          ✨ Quiz Creator
        </div>
      </header>

      <!-- SUCCESS MESSAGE -->
      <div
        v-if="successMessage"
        class="alert success"
      >
        ✓ {{ successMessage }}
      </div>

      <!-- ERROR MESSAGE -->
      <div
        v-if="errorMessage"
        class="alert error"
      >
        {{ errorMessage }}
      </div>

      <!-- QUIZ DETAILS -->
      <section class="form-card">
        <div class="section-heading">
          <span class="section-number">1</span>

          <div>
            <h2>Quiz Details</h2>
            <p>Choose the learning category for this quiz.</p>
          </div>
        </div>

        <div class="form-grid">

          <div class="form-field">
            <label>School Level *</label>

            <select v-model="selectedLevel">
              <option value="">Select Level</option>

              <option
                v-for="level in levels"
                :key="level.id"
                :value="level.id"
              >
                {{ level.name }}
              </option>
            </select>
          </div>

          <div class="form-field">
            <label>Subject *</label>

            <select v-model="selectedSubject">
              <option value="">Select Subject</option>

              <option
                v-for="subject in subjects"
                :key="subject.id"
                :value="subject.id"
              >
                {{ subject.name }}
              </option>
            </select>
          </div>

          <div class="form-field full-width">
            <label>Topic *</label>

            <select
              v-model="selectedTopic"
              :disabled="!selectedLevel || !selectedSubject"
            >
              <option value="">Select Topic</option>

              <option
                v-for="topic in filteredTopics"
                :key="topic.id"
                :value="topic.id"
              >
                {{ topic.name }}
              </option>
            </select>

            <small>
              Questions will be associated with the selected topic.
            </small>
          </div>
        </div>
      </section>

      <!-- QUESTION LIST -->
      <section class="questions-section">

        <div class="questions-header">
          <div>
            <h2>Quiz Questions</h2>
            <p>
              {{ questions.length }} question(s) added
            </p>
          </div>

          <button
            type="button"
            class="add-question-btn"
            @click="addQuestion"
          >
            ＋ Add Question
          </button>
        </div>

        <div
          v-for="(question, qIndex) in questions"
          :key="question.localId"
          class="form-card question-card"
        >

          <div class="question-header">
            <h3>Question {{ qIndex + 1 }}</h3>

            <button
              v-if="questions.length > 1"
              type="button"
              class="remove-btn"
              @click="removeQuestion(qIndex)"
            >
              ✕ Remove
            </button>
          </div>

          <div class="form-grid">

            <!-- QUESTION TYPE -->
            <div class="form-field">
              <label>Question Type *</label>

              <select
                v-model="question.question_type"
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

            <!-- DIFFICULTY -->
            <div class="form-field">
              <label>Difficulty *</label>

              <select v-model.number="question.difficulty">
                <option :value="1">Easy</option>
                <option :value="2">Medium</option>
                <option :value="3">Hard</option>
              </select>
            </div>

            <!-- QUESTION TEXT -->
            <div class="form-field full-width">
              <label>Question *</label>

              <textarea
                v-model="question.question_text"
                rows="3"
                placeholder="Enter your question..."
              ></textarea>
            </div>
          </div>

          <!-- ANSWER OPTIONS -->
          <div class="answers-section">

            <div class="answers-heading">
              <h4>Answer Options</h4>

              <span>
                Select the correct answer
              </span>
            </div>

            <div class="options-grid">

              <label
                v-for="(option, optionIndex) in question.options"
                :key="optionIndex"
                class="option-row"
                :class="{
                  'correct-option':
                    question.correctIndex === optionIndex
                }"
              >
                <input
                  type="radio"
                  :name="`correct-${question.localId}`"
                  :value="optionIndex"
                  v-model.number="question.correctIndex"
                />

                <span class="option-letter">
                  {{ String.fromCharCode(65 + optionIndex) }}
                </span>

                <!-- MCQ -->
                <input
                  v-if="question.question_type === 'mcq'"
                  type="text"
                  v-model="question.options[optionIndex]"
                  :placeholder="`Option ${optionIndex + 1}`"
                />

                <!-- TRUE / FALSE -->
                <span v-else class="tf-option">
                  {{ option }}
                </span>

                <span
                  v-if="question.correctIndex === optionIndex"
                  class="correct-label"
                >
                  ✓ Correct
                </span>
              </label>
            </div>
          </div>

          <!-- EXPLANATION -->
          <div class="form-field explanation-field">
            <label>Answer Explanation (Optional)</label>

            <textarea
              v-model="question.explanation"
              rows="2"
              placeholder="Explain why this answer is correct..."
            ></textarea>

            <small>
              This explanation can be shown after a student answers.
            </small>
          </div>
        </div>
      </section>

      <!-- ACTION BUTTONS -->
      <div class="form-actions">

        <button
          type="button"
          class="cancel-btn"
          @click="goBack"
        >
          Cancel
        </button>

        <button
          type="button"
          class="preview-btn"
          @click="togglePreview"
        >
          {{ showPreview ? 'Hide Preview' : '👁 Preview Quiz' }}
        </button>

        <button
          type="button"
          class="save-btn"
          :disabled="!isFormValid"
          @click="saveQuiz"
        >
          ✓ Save Quiz
        </button>
      </div>

      <!-- QUIZ PREVIEW -->
      <section
        v-if="showPreview"
        class="form-card preview-section"
      >
        <h2>👁 Quiz Preview</h2>

        <p class="preview-topic">
          Topic: {{ selectedTopicName }}
        </p>

        <div
          v-for="(question, index) in questions"
          :key="question.localId"
          class="preview-question"
        >
          <h3>
            {{ index + 1 }}. {{ question.question_text }}
          </h3>

          <div class="preview-options">
            <div
              v-for="(option, optionIndex) in question.options"
              :key="optionIndex"
              class="preview-option"
              :class="{
                'preview-correct':
                  optionIndex === question.correctIndex
              }"
            >
              {{ String.fromCharCode(65 + optionIndex) }}.
              {{ option }}

              <span
                v-if="optionIndex === question.correctIndex"
              >
                ✓
              </span>
            </div>
          </div>

          <p v-if="question.explanation">
            <strong>Explanation:</strong>
            {{ question.explanation }}
          </p>
        </div>
      </section>

      <!-- SAVED DATA INFO -->
      <div
        v-if="savedQuestions.length"
        class="saved-summary"
      >
        <strong>
          {{ savedQuestions.length }} question(s)
          saved in this session
        </strong>

        <p>
          Sample data only — no Supabase connection.
          Check your browser console to see the saved records.
        </p>
      </div>

    </main>
  </div>
</template>

<style scoped>
.admin-add-quiz-page {
  min-height: 100vh;
  background: #fcfaf3;
  color: #26365b;
  font-family: 'Fredoka', sans-serif;
}

.add-quiz-container {
  max-width: 1050px;
  margin: 0 auto;
  padding: 36px 24px 80px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}

.back-btn {
  background: none;
  border: none;
  color: #71809b;
  padding: 0;
  margin-bottom: 16px;
  font: inherit;
  cursor: pointer;
}

.back-btn:hover {
  color: #26365b;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px;
}

.page-header p,
.section-heading p,
.questions-header p {
  color: #71809b;
  margin: 0;
}

.header-badge {
  background: #ffde59;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.form-card {
  background: white;
  border: 1px solid #e7e9e5;
  border-radius: 20px;
  padding: 28px;
  margin-bottom: 24px;
  box-shadow: 0 4px 15px rgba(38, 54, 91, 0.04);
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 25px;
}

.section-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #ffde59;
  border-radius: 12px;
  font-weight: 700;
}

.section-heading h2,
.questions-header h2 {
  font-size: 21px;
  margin: 0 0 4px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.full-width {
  grid-column: 1 / -1;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field label {
  font-size: 14px;
  font-weight: 600;
}

.form-field select,
.form-field textarea,
.option-row input[type='text'] {
  width: 100%;
  border: 1px solid #dce2e9;
  border-radius: 10px;
  padding: 12px 14px;
  color: #26365b;
  background: white;
  font: inherit;
  box-sizing: border-box;
}

.form-field textarea {
  resize: vertical;
}

.form-field select:focus,
.form-field textarea:focus,
.option-row input:focus {
  outline: none;
  border-color: #e7bb36;
  box-shadow: 0 0 0 3px rgba(255, 222, 89, 0.18);
}

.form-field small {
  font-size: 12px;
  color: #8894a8;
}

.questions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin: 30px 0 18px;
}

.add-question-btn {
  background: #ffde59;
  color: #26365b;
  border: none;
  padding: 12px 18px;
  border-radius: 11px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
}

.question-header h3 {
  font-size: 19px;
  margin: 0;
}

.remove-btn {
  border: none;
  background: #fff0f0;
  color: #c34b4b;
  padding: 9px 14px;
  border-radius: 8px;
  font: inherit;
  cursor: pointer;
}

.answers-section {
  margin-top: 26px;
}

.answers-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.answers-heading h4 {
  margin: 0;
}

.answers-heading span {
  font-size: 12px;
  color: #8592a7;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e1e5ec;
  border-radius: 12px;
  cursor: pointer;
  min-width: 0;
}

.option-row.correct-option {
  border-color: #78c98b;
  background: #f0faef;
}

.option-row input[type='radio'] {
  accent-color: #48a667;
  flex-shrink: 0;
}

.option-letter {
  color: #647394;
  font-weight: 700;
}

.option-row input[type='text'] {
  flex: 1;
  min-width: 0;
  padding: 8px;
  font-size: 13px;
}

.correct-label {
  color: #31925a;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.tf-option {
  flex: 1;
}

.explanation-field {
  margin-top: 24px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.cancel-btn,
.preview-btn,
.save-btn {
  padding: 13px 22px;
  border-radius: 12px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.cancel-btn {
  background: white;
  border: 1px solid #dce2e9;
  color: #647394;
}

.preview-btn {
  background: #e8eef8;
  border: none;
  color: #26365b;
}

.save-btn {
  background: #ffde59;
  border: none;
  color: #26365b;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.alert {
  padding: 14px 16px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.alert.success {
  background: #eef9ef;
  color: #287949;
}

.alert.error {
  background: #fff0f0;
  color: #b34d4d;
}

.preview-section {
  margin-top: 30px;
}

.preview-topic {
  color: #71809b;
  margin-bottom: 24px;
}

.preview-question {
  border-top: 1px solid #e7e9e5;
  padding: 20px 0;
}

.preview-question h3 {
  font-size: 16px;
  margin-bottom: 14px;
}

.preview-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.preview-option {
  background: #f6f7fa;
  border-radius: 10px;
  padding: 12px;
  font-size: 13px;
}

.preview-correct {
  background: #e7f7e7;
  color: #258348;
  font-weight: 700;
}

.saved-summary {
  background: #edf6e7;
  border: 1px solid #dce9d7;
  border-radius: 14px;
  padding: 20px;
  margin-top: 24px;
}

.saved-summary p {
  color: #71809b;
  font-size: 13px;
  margin-bottom: 0;
}

@media (max-width: 700px) {
  .add-quiz-container {
    padding: 24px 14px 60px;
  }

  .form-card {
    padding: 18px;
  }

  .form-grid,
  .options-grid,
  .preview-options {
    grid-template-columns: 1fr;
  }

  .questions-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-badge {
    display: none;
  }
}
</style>
