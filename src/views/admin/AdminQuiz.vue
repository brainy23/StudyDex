
<script setup>
import AdminNav from '@/components/common/adminNav.vue';
import { computed, ref } from 'vue';

// =====================================================
// 1. SAMPLE QUIZ DATA
// Replace with API data later
// =====================================================
const quizzes = ref([
  {
    id: 1,
    title: 'Fractions Challenge',
    subject: 'Mathematics',
    level: 'P4',
    difficulty: 'Medium',
    questions: 15,
    active: true
  },
  {
    id: 2,
    title: 'Living Things Quiz',
    subject: 'Science',
    level: 'P3',
    difficulty: 'Easy',
    questions: 10,
    active: true
  },
  {
    id: 3,
    title: 'Forces & Motion',
    subject: 'Science',
    level: 'P6',
    difficulty: 'Hard',
    questions: 20,
    active: false
  },
  {
    id: 4,
    title: 'Area and Perimeter',
    subject: 'Mathematics',
    level: 'P5',
    difficulty: 'Medium',
    questions: 12,
    active: true
  },
  {
    id: 5,
    title: 'Plant Systems',
    subject: 'Science',
    level: 'P4',
    difficulty: 'Easy',
    questions: 10,
    active: false
  }
])

// =====================================================
// 2. SEARCH AND FILTERS
// =====================================================
const search = ref('')
const selectedSubject = ref('')
const selectedLevel = ref('')
const selectedStatus = ref('')

const filteredQuizzes = computed(() => {
  return quizzes.value.filter(quiz => {
    const matchesSearch = quiz.title
      .toLowerCase()
      .includes(search.value.trim().toLowerCase())

    const matchesSubject =
      !selectedSubject.value ||
      quiz.subject === selectedSubject.value

    const matchesLevel =
      !selectedLevel.value ||
      quiz.level === selectedLevel.value

    const matchesStatus =
      !selectedStatus.value ||
      (selectedStatus.value === 'Active'
        ? quiz.active
        : !quiz.active)

    return (
      matchesSearch &&
      matchesSubject &&
      matchesLevel &&
      matchesStatus
    )
  })
})

const activeCount = computed(() => {
  return quizzes.value.filter(quiz => quiz.active).length
})

function clearFilters() {
  search.value = ''
  selectedSubject.value = ''
  selectedLevel.value = ''
  selectedStatus.value = ''
}



</script>

<template>
  <div class="admin-layout">

    <!-- Sidebar Component -->
     <AdminNav/>

    <!-- Main Content -->
    <main class="admin-content">

      <!-- =========================================
           2. PAGE HEADER
      ========================================== -->
      <header
        class="quiz-page-header d-flex justify-content-between align-items-center flex-wrap gap-3"
      >
        <div>
          <h1>Quiz Management</h1>
          <p>Manage and organise student quizzes</p>
        </div>

        <button
          class="quiz-primary-btn"
          type="button"
          @click="showAddQuiz = true"
        >
          ＋ Add Quiz
        </button>
      </header>

      <!-- =========================================
           3. OVERVIEW CARDS
      ========================================== -->
      <div class="row g-3 mb-4">

        <!-- Total Quizzes -->
        <div class="col-12 col-sm-6">
          <div class="quiz-summary-card total-card">
            <span class="summary-label">
              📚 Total Quizzes
            </span>

            <strong class="summary-value">
              {{ quizzes.length }}
            </strong>
          </div>
        </div>

        <!-- Active Quizzes -->
        <div class="col-12 col-sm-6">
          <div class="quiz-summary-card active-card">
            <span class="summary-label">
              ✅ Active Quizzes
            </span>

            <strong class="summary-value">
              {{ activeCount }}
            </strong>
          </div>
        </div>

      </div>

      <!-- =========================================
           4. SEARCH AND FILTERS
      ========================================== -->
      <section class="quiz-panel mb-4">

        <!-- Search -->
        <div class="quiz-search-row">
          <label
            class="visually-hidden"
            for="quiz-search"
          >
            Search quizzes
          </label>

          <input
            id="quiz-search"
            v-model="search"
            class="form-control quiz-input"
            type="search"
            placeholder="🔍 Search quizzes by name..."
          />
        </div>
        <!-- Filter Dropdowns -->
        <div class="row g-3 mt-1">

          <!-- Subject -->
          <div class="col-12 col-md-4">
            <label
              for="quiz-subject"
              class="quiz-field-label"
            >
              Subject
            </label>

            <select
              id="quiz-subject"
              v-model="selectedSubject"
              class="form-select quiz-input"
            >
              <option value="">All Subjects</option>
              <option value="Science">Science</option>
              <option value="Mathematics">Mathematics</option>
            </select>
          </div>

          <!-- Level -->
          <div class="col-12 col-md-4">
            <label
              for="quiz-level"
              class="quiz-field-label"
            >
              Level
            </label>

            <select
              id="quiz-level"
              v-model="selectedLevel"
              class="form-select quiz-input"
            >
              <option value="">All Levels</option>

              <option
                v-for="level in 6"
                :key="level"
                :value="`P${level}`"
              >
                P{{ level }}
              </option>
            </select>
          </div>

          <!-- Status -->
          <div class="col-12 col-md-4">
            <label
              for="quiz-status"
              class="quiz-field-label"
            >
              Status
            </label>

            <select
              id="quiz-status"
              v-model="selectedStatus"
              class="form-select quiz-input"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

        </div>

        <!-- Filter Results -->
        <div
          class="filter-footer d-flex justify-content-between align-items-center gap-2 mt-3"
        >
          <span>
            Showing {{ filteredQuizzes.length }}
            of {{ quizzes.length }} quizzes
          </span>

          <button
            type="button"
            class="quiz-text-btn"
            @click="clearFilters"
          >
            Clear Filters
          </button>
        </div>

      </section>

      <!-- =========================================
           5. QUIZ LIBRARY TABLE
      ========================================== -->
      <section class="quiz-panel">

        <div class="quiz-section-heading">
          <h2>Quiz Library</h2>
          <p>View and manage all your quizzes</p>
        </div>

        <div class="table-responsive">
          <table class="table quiz-table align-middle">

            <thead>
              <tr>
                <th>Quiz Name</th>
                <th>Subject</th>
                <th>Level</th>
                <th>Questions</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              <!-- Quiz Rows -->
              <tr
                v-for="quiz in filteredQuizzes"
                :key="quiz.id"
              >
                <td class="quiz-title-cell">
                  {{ quiz.title }}
                </td>

                <td>{{ quiz.subject }}</td>

                <td>{{ quiz.level }}</td>

                <td>{{ quiz.questions }}</td>

                <td>{{ quiz.difficulty }}</td>

                <!-- Active / Inactive Badge -->
                <td>
                  <span
                    class="quiz-status"
                    :class="quiz.active
                      ? 'status-active'
                      : 'status-inactive'"
                  >
                    ● {{ quiz.active ? 'Active' : 'Inactive' }}
                  </span>
                </td>

                <!-- Action Buttons -->
                <td>
                  <div class="quiz-actions">

                    <button
                      class="quiz-outline-btn"
                      type="button"
                      @click="viewQuiz(quiz)"
                    >
                      View
                    </button>

                    <button
                      class="quiz-text-btn"
                      type="button"
                      @click="toggleQuiz(quiz)"
                    >
                      {{ quiz.active ? 'Deactivate' : 'Activate' }}
                    </button>

                  </div>
                </td>
              </tr>

              <!-- No Results -->
              <tr v-if="filteredQuizzes.length === 0">
                <td colspan="7" class="empty-state">
                  No quizzes found. Try clearing your filters.
                </td>
              </tr>

            </tbody>

          </table>
        </div>
      </section>
    </main>

  </div>
</template>

<style scoped>

/* =====================================================
   2. PAGE HEADER & BUTTONS
===================================================== */

.quiz-page-header {
  margin-bottom: 26px;
}

.quiz-page-header h1 {
  font-size: 30px;
  font-weight: 800;
  margin: 0 0 5px;
}

.quiz-page-header p,
.quiz-section-heading p {
  margin: 0;
  color: #7b8095;
  font-size: 14px;
}

/* Primary Button */

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

/* Outline Button */

.quiz-outline-btn {
  border: 1px solid #dedee5;
  border-radius: 8px;
  padding: 7px 12px;
  background: #fff;
  color: #30304b;
  cursor: pointer;
}

.quiz-outline-btn:hover {
  background: #f5f5f9;
}

/* Text Button */

.quiz-text-btn {
  border: 0;
  background: none;
  padding: 7px;
  color: #80610d;
  font-weight: 700;
  cursor: pointer;
}

.quiz-text-btn:hover {
  text-decoration: underline;
}

/* =====================================================
   3. OVERVIEW CARDS
===================================================== */

.quiz-summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 126px;
  padding: 22px;
  border-radius: 16px;
  border: 1px solid #ece8de;
}

.total-card {
  background: #fff3ce;
}

.active-card {
  background: #e9f5ec;
}

.summary-label {
  font-size: 14px;
  font-weight: 700;
}

.summary-value {
  font-size: 38px;
  line-height: 1;
}

/* =====================================================
   4. SEARCH & FILTERS
===================================================== */

.quiz-panel {
  padding: 22px;
  border: 1px solid #ececf0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(48, 48, 75, 0.05);
}

.quiz-field-label {
  display: block;
  margin-bottom: 7px;
  color: #5f6273;
  font-size: 13px;
  font-weight: 700;
}

.quiz-input {
  min-height: 43px;
  border-radius: 9px;
  border-color: #dedee5;
}

.quiz-input:focus {
  border-color: #edbf18;
  box-shadow: 0 0 0 0.2rem rgba(255, 211, 27, 0.2);
}

.filter-footer {
  color: #7b8095;
  font-size: 12px;
}

/* =====================================================
   5. QUIZ LIBRARY TABLE
===================================================== */

.quiz-section-heading {
  margin-bottom: 18px;
}

.quiz-section-heading h2 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 800;
}

.quiz-table {
  font-size: 13px;
  margin-bottom: 0;
}

.quiz-table thead th {
  background: #f6f6f8;
  padding: 13px 11px;
  white-space: nowrap;
}

.quiz-table tbody td {
  padding: 14px 11px;
}

.quiz-title-cell {
  font-weight: 700;
}

/* Status Badges */

.quiz-status {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.status-active {
  color: #287d49;
}

.status-inactive {
  color: #85858b;
}

/* Action Buttons */

.quiz-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

/* No Results */

.empty-state {
  text-align: center;
  padding: 35px !important;
  color: #7b8095;
}

/* =====================================================
   6. VIEW / ADD QUIZ MODALS
===================================================== */

.quiz-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  background: rgba(30, 30, 48, 0.55);

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 16px;
}

.quiz-modal {
  width: min(100%, 540px);
  max-height: 90vh;
  overflow-y: auto;

  border-radius: 16px;
  background: white;
  padding: 26px;

  box-shadow: 0 20px 65px rgba(0, 0, 0, 0.2);
}

.quiz-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.quiz-modal-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}

.quiz-close-btn {
  border: 0;
  background: none;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.quiz-checkbox-label {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
}

.quiz-help-text {
  color: #7b8095;
  font-size: 12px;
  line-height: 1.5;
}

/* =====================================================
   7. RESPONSIVE LAYOUT
===================================================== */

@media (max-width: 767px) {
  .admin-quiz-content {
    padding: 18px;
  }

  .quiz-page-header h1 {
    font-size: 25px;
  }

  .quiz-panel {
    padding: 15px;
  }

  .quiz-summary-card {
    padding: 17px;
  }

  .quiz-modal {
    padding: 20px;
  }
}


</style>
