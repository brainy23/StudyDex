
<script setup>
import { ref, computed, onMounted } from 'vue'
import { getCurrentProfile } from '../services/profileService'
import { useRouter } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'

const router = useRouter()

function goBack() {
  router.back()
}

// ========================================
// STUDENT DATA (SAMPLE)
// ========================================

const student = ref({
  name: 'Loading…',
  totalXP: 1250,
  xpGainedThisWeek: 120,
  studyStreak: 7,
  streakIncrease: 2,
  decksCompleted: 8,
  decksThisWeek: 2,
  quizAverage: 85,
  quizImprovement: 10,
})

// Only the greeting is connected; the statistics below remain preview data.
onMounted(async () => {
  try {
    const profile = await getCurrentProfile()
    student.value.name = profile.display_name
  } catch {
    student.value.name = 'Trainer'
  }
})

// ========================================
// DASHBOARD STATISTICS
// ========================================

const stats = computed(() => [
  {
    title: 'Total XP',
    value: student.value.totalXP.toLocaleString(),
    change: `+${student.value.xpGainedThisWeek} this week`,
    icon: '⭐',
    color: 'yellow',
  },
  {
    title: 'Study Streak',
    value: `${student.value.studyStreak} days`,
    change: `+${student.value.streakIncrease} days`,
    icon: '🔥',
    color: 'blue',
  },
  {
    title: 'Decks Completed',
    value: student.value.decksCompleted,
    change: `+${student.value.decksThisWeek} this week`,
    icon: '📖',
    color: 'pink',
  },
  {
    title: 'Quiz Average',
    value: `${student.value.quizAverage}%`,
    change: `+${student.value.quizImprovement}% from last week`,
    icon: '🏆',
    color: 'purple',
  },
])

// ========================================
// LEARNING ACTIVITY CHART
// ========================================

const selectedPeriod = ref('7')

const activityData = {
  7: [20, 40, 33, 52, 39, 52, 70],
  14: [
    15, 25, 35, 30, 45, 38, 50,
    20, 40, 33, 52, 39, 52, 70,
  ],
  30: [
    15, 25, 35, 30, 45, 38, 50,
    20, 40, 33, 52, 39, 52, 70,
    30, 45, 50, 25, 40, 55, 60,
    35, 50, 45, 65, 55, 60, 75,
    50, 65,
  ],
}

const activityDates = computed(() => {
  const days = Number(selectedPeriod.value)

  return Array.from({ length: days }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (days - 1 - index))

    return date.toLocaleDateString('en-SG', {
      month: 'short',
      day: 'numeric',
    })
  })
})

const chartSeries = computed(() => [
  {
    name: 'Study Minutes',
    data: activityData[selectedPeriod.value],
  },
])

const chartOptions = computed(() => ({
  chart: {
    type: 'area',
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'Fredoka, sans-serif',
    parentHeightOffset: 0,
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 500,
    },
  },

  colors: ['#ffca28'],

  stroke: {
    curve: 'smooth',
    width: 3,
  },

  markers: {
    size: 3,
    strokeWidth: 2,
    strokeColors: '#ffca28',
    colors: ['#ffffff'],
    hover: { size: 6 },
  },

  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.04,
      stops: [0, 95, 100],
    },
  },

  dataLabels: { enabled: false },

  grid: {
    borderColor: '#eef0f5',
    strokeDashArray: 4,
    padding: {
      top: 5,
      right: 8,
      bottom: 0,
      left: 4,
    },
  },

  xaxis: {
    categories: activityDates.value,
    tickAmount: selectedPeriod.value === '30' ? 6 : undefined,
    labels: {
      rotate: 0,
      hideOverlappingLabels: true,
      style: {
        colors: '#7a8295',
        fontSize: '10px',
      },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },

  yaxis: {
    min: 0,
    tickAmount: 4,
    labels: {
      style: {
        colors: '#7a8295',
        fontSize: '10px',
      },
    },
    title: {
      text: 'Minutes',
      style: {
        color: '#7a8295',
        fontSize: '10px',
      },
    },
  },

  tooltip: {
    theme: 'light',
    y: {
      formatter: (value) => `${value} minutes`,
    },
  },

  legend: { show: false },
}))

// ========================================
// SUBJECT MASTERY - MATH AND SCIENCE ONLY
// ========================================

const subjects = ref([
  {
    name: 'Mathematics',
    icon: '🔢',
    mastery: 78,
    quizzesCompleted: 12,
    averageScore: 82,
    color: 'blue',
  },
  {
    name: 'Science',
    icon: '🌿',
    mastery: 92,
    quizzesCompleted: 9,
    averageScore: 90,
    color: 'green',
  },
])

// ========================================
// RECENT PROGRESS
// ========================================

const recentProgress = ref([
  {
    id: 1,
    title: 'Plants and Their Parts',
    icon: '🌱',
    type: 'Deck',
    score: null,
    date: '20 Oct 2026',
  },
  {
    id: 2,
    title: 'Fractions',
    icon: '🔢',
    type: 'Quiz',
    score: 90,
    date: '19 Oct 2026',
  },
  {
    id: 3,
    title: 'Human Body Systems',
    icon: '❤️',
    type: 'Deck',
    score: null,
    date: '18 Oct 2026',
  },
  {
    id: 4,
    title: 'Area and Perimeter',
    icon: '📐',
    type: 'Quiz',
    score: 80,
    date: '17 Oct 2026',
  },
  {
    id: 5,
    title: 'Forces and Motion',
    icon: '⚛️',
    type: 'Deck',
    score: null,
    date: '16 Oct 2026',
  },
  {
    id: 6,
    title: 'Whole Numbers',
    icon: '🔢',
    type: 'Quiz',
    score: 95,
    date: '15 Oct 2026',
  },
  {
    id: 7,
    title: 'Life Cycles',
    icon: '🦋',
    type: 'Quiz',
    score: 88,
    date: '14 Oct 2026',
  },
  {
    id: 8,
    title: 'Decimals',
    icon: '📏',
    type: 'Deck',
    score: null,
    date: '13 Oct 2026',
  },
])

const showAllProgress = ref(false)

const visibleProgress = computed(() =>
  showAllProgress.value
    ? recentProgress.value
    : recentProgress.value.slice(0, 5)
)

// ========================================
// UPCOMING QUIZZES
// ========================================

const upcomingQuizzes = ref([
  {
    id: 1,
    title: 'Light and Shadows',
    subject: 'Science',
    level: 'P3',
    icon: '💡',
    date: '23 Oct 2026',
  },
  {
    id: 2,
    title: 'Multiplication and Division',
    subject: 'Mathematics',
    level: 'P4',
    icon: '🔢',
    date: '24 Oct 2026',
  },
  {
    id: 3,
    title: 'Living Things',
    subject: 'Science',
    level: 'P3',
    icon: '🌱',
    date: '25 Oct 2026',
  },
  {
    id: 4,
    title: 'Fractions',
    subject: 'Mathematics',
    level: 'P4',
    icon: '📐',
    date: '27 Oct 2026',
  },
  {
    id: 5,
    title: 'Matter and Materials',
    subject: 'Science',
    level: 'P3',
    icon: '🧪',
    date: '29 Oct 2026',
  },
  {
    id: 6,
    title: 'Problem Solving',
    subject: 'Mathematics',
    level: 'P4',
    icon: '🧮',
    date: '31 Oct 2026',
  },
  {
    id: 7,
    title: 'The Water Cycle',
    subject: 'Science',
    level: 'P3',
    icon: '💧',
    date: '2 Nov 2026',
  },
])

const showAllQuizzes = ref(false)

const visibleQuizzes = computed(() =>
  showAllQuizzes.value
    ? upcomingQuizzes.value
    : upcomingQuizzes.value.slice(0, 5)
)
</script>

<template>
  <main class="student-dashboard">

    <!-- ========================================
         WELCOME BANNER
    ======================================== -->

    <header class="welcome-banner">
      <div class="welcome-content">

        <button
          type="button"
          class="back-button"
          @click="goBack"
        >
          ← Back
        </button>

        <div class="welcome-title">
          <h1>Hello, {{ student.name }}!</h1>
          <span class="welcome-sparkle">✨</span>
        </div>

        <p>Keep going! You're doing great!</p>
        <p>Sample progress preview — your study and quiz history is not connected yet.</p>
      </div>

      <div class="welcome-mascot">
        <img
          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
          alt="Pikachu"
        />

        <div class="mascot-sign">
          Small Steps<br />
          Big Wins!
        </div>
      </div>
    </header>

    <div class="dashboard-content">

      <!-- ========================================
           STATISTICS
      ======================================== -->

      <section class="row g-2 stats-section">
        <div
          v-for="stat in stats"
          :key="stat.title"
          class="col-12 col-sm-6 col-xl-3"
        >
          <div
            class="stat-card"
            :class="`stat-${stat.color}`"
          >
            <div class="stat-icon">
              {{ stat.icon }}
            </div>

            <div class="stat-info">
              <p class="stat-title">{{ stat.title }}</p>

              <h2 class="stat-value">
                {{ stat.value }}
              </h2>

              <p class="stat-change">
                <span>▲</span> {{ stat.change }}
              </p>
            </div>

            <span class="stat-pokeball">◉</span>
          </div>
        </div>
      </section>

      <!-- ========================================
           LEARNING ACTIVITY + SUBJECT MASTERY
      ======================================== -->

      <section class="row g-2 charts-section">

        <!-- Learning Activity -->
        <div class="col-12 col-xl-7">
          <div class="dashboard-panel">

            <div class="panel-heading">
              <div class="heading-info">
                <div class="heading-icon">🎯</div>

                <div>
                  <h3>Learning Activity</h3>
                  <p>Time spent studying</p>
                </div>
              </div>

              <select
                v-model="selectedPeriod"
                class="period-select"
                aria-label="Select activity date range"
              >
                <option value="7">Last 7 Days</option>
                <option value="14">Last 14 Days</option>
                <option value="30">Last 30 Days</option>
              </select>
            </div>

            <div class="activity-chart">
              <VueApexCharts
                type="area"
                height="100%"
                width="100%"
                :options="chartOptions"
                :series="chartSeries"
              />
            </div>
          </div>
        </div>

        <!-- Subject Mastery -->
        <div class="col-12 col-xl-5">
          <div class="dashboard-panel">

            <div class="panel-heading">
              <div class="heading-info">
                <div class="heading-icon">📚</div>

                <div>
                  <h3>Subject Mastery</h3>
                  <p>Your performance by subject</p>
                </div>
              </div>
            </div>

            <div class="subject-list">
              <div
                v-for="subject in subjects"
                :key="subject.name"
                class="subject-card"
                :class="`subject-${subject.color}`"
              >
                <div class="subject-card-header">
                  <div class="subject-heading">
                    <span class="subject-icon">
                      {{ subject.icon }}
                    </span>

                    <span class="subject-name">
                      {{ subject.name }}
                    </span>
                  </div>

                  <span class="mastery-value">
                    {{ subject.mastery }}%
                  </span>
                </div>

                <div
                  class="mastery-track"
                  role="progressbar"
                  :aria-label="`${subject.name} mastery`"
                  :aria-valuenow="subject.mastery"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    class="mastery-fill"
                    :class="`mastery-${subject.color}`"
                    :style="{
                      width: `${subject.mastery}%`
                    }"
                  ></div>
                </div>

                <div class="subject-details">
                  <span>
                    📝 {{ subject.quizzesCompleted }} Quizzes Completed
                  </span>

                  <span>
                    ⭐ {{ subject.averageScore }}% Avg. Score
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- ========================================
           RECENT PROGRESS + UPCOMING QUIZZES
      ======================================== -->

      <section class="row g-2 tables-section">

        <!-- Recent Progress -->
        <div class="col-12 col-xl-6">
          <div class="dashboard-panel">

            <div class="panel-heading">
              <div class="heading-info">
                <div class="heading-icon">📋</div>

                <div>
                  <h3>Recent Progress</h3>
                  <p>Your latest learning activity</p>
                </div>
              </div>

              <button
                type="button"
                class="view-all-btn"
                @click="showAllProgress = !showAllProgress"
              >
                {{ showAllProgress ? 'Show Less' : 'View All →' }}
              </button>
            </div>

            <!-- SCROLLABLE TABLE -->
            <div
              class="table-responsive progress-scroll"
              tabindex="0"
              aria-label="Recent progress, scrollable"
            >
              <table class="progress-table">
                <thead>
                  <tr>
                    <th>Deck / Quiz</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="item in visibleProgress"
                    :key="item.id"
                  >
                    <td>
                      <span class="activity-icon">
                        {{ item.icon }}
                      </span>
                      {{ item.title }}
                    </td>

                    <td>
                      <span
                        class="type-badge"
                        :class="item.type.toLowerCase()"
                      >
                        {{ item.type }}
                      </span>
                    </td>

                    <td>
                      {{
                        item.score !== null
                          ? `${item.score}%`
                          : '–'
                      }}
                    </td>

                    <td>{{ item.date }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>

        <!-- Upcoming Quizzes -->
        <div class="col-12 col-xl-6">
          <div class="dashboard-panel">

            <div class="panel-heading">
              <div class="heading-info">
                <div class="heading-icon">🗓️</div>

                <div>
                  <h3>Upcoming Quizzes</h3>
                  <p>Quizzes you have coming up</p>
                </div>
              </div>

              <button
                type="button"
                class="view-all-btn"
                @click="showAllQuizzes = !showAllQuizzes"
              >
                {{ showAllQuizzes ? 'Show Less' : 'View All →' }}
              </button>
            </div>

            <!-- SCROLLABLE QUIZ LIST -->
            <div
              class="quiz-list"
              tabindex="0"
              aria-label="Upcoming quizzes, scrollable"
            >
              <div
                v-for="quiz in visibleQuizzes"
                :key="quiz.id"
                class="quiz-row"
              >
                <div class="quiz-icon">
                  {{ quiz.icon }}
                </div>

                <div class="quiz-info">
                  <h4>{{ quiz.title }}</h4>
                  <p>{{ quiz.subject }} ({{ quiz.level }})</p>
                </div>

                <span class="quiz-date">
                  {{ quiz.date }}
                </span>
              </div>
            </div>

          </div>
        </div>

      </section>
    </div>
  </main>
</template>

<style scoped>

/* ========================================
   DASHBOARD BASE
======================================== */

.student-dashboard {
  width: 100%;
  height: 100dvh;
  min-height: 0;
  padding: 10px 14px;

  display: flex;
  flex-direction: column;
  overflow: hidden;

  background: #fffaf0;
  font-family: 'Fredoka', sans-serif;
  color: #13264f;
}

.dashboard-content {
  flex: 1;
  min-height: 0;

  display: flex;
  flex-direction: column;
  gap: 8px;

  padding: 8px 0 0;
  overflow: hidden;
}

/* ========================================
   WELCOME BANNER
======================================== */

.welcome-banner {
  position: relative;
  flex: 0 0 115px;
  min-height: 0;

  padding: 12px 25px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  background: linear-gradient(
    110deg,
    #fff8e8 35%,
    #e5f7d9 100%
  );

  border-radius: 14px;
  border-bottom: 2px solid #e8edce;
  overflow: hidden;
}

.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.welcome-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.welcome-title h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #102456;
}

.welcome-sparkle {
  font-size: 22px;
}

.welcome-content p {
  margin: 0;
  padding: 0;
  font-size: 12px;
  color: #637086;
}

.welcome-mascot {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.welcome-mascot img {
  width: 78px;
  height: 75px;
  object-fit: contain;
  image-rendering: pixelated;
  animation: mascot-bounce 3s ease-in-out infinite;
}

.mascot-sign {
  padding: 7px 10px;
  background: #f3bd70;
  border: 2px solid #ad6e2c;
  border-radius: 9px;

  color: #4c321a;
  font-size: 11px;
  font-weight: 800;
  text-align: center;
  line-height: 1.25;

  transform: rotate(7deg);
  box-shadow: 2px 3px 0 rgba(107, 76, 37, 0.15);
}

@keyframes mascot-bounce {
  0%, 100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-5px);
  }
}

/* ========================================
   BACK BUTTON
======================================== */

.back-button {
  position: static;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 4px 12px;

  background: #fff0b3;
  color: #73551a;

  border: 1.5px solid #eacb6b;
  border-radius: 10px;

  font-family: 'Fredoka', sans-serif;
  font-size: 11px;
  font-weight: 600;

  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.back-button:hover {
  background: #ffdf80;
  border-color: #d9ad3d;
  color: #59400f;
  transform: translateY(-2px);
}

/* ========================================
   BOOTSTRAP SECTION HEIGHTS
======================================== */

.stats-section {
  flex: 0 0 105px;
  min-height: 0;
}

.charts-section {
  flex: 1 1 0;
  min-height: 0;
}

.tables-section {
  flex: 1 1 0;
  min-height: 0;
}

.stats-section > div,
.charts-section > div,
.tables-section > div {
  min-height: 0;
}

.dashboard-content > .row {
  margin-top: 0;
  margin-bottom: 0 !important;
}

/* ========================================
   STATISTIC CARDS
======================================== */

.stat-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;

  height: 100%;
  min-height: 0;
  padding: 10px 12px;

  border: 2px solid white;
  border-radius: 14px;

  box-shadow: 0 2px 8px rgba(38, 43, 80, 0.08);
  overflow: hidden;

  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-yellow {
  background: #fff9e2;
}

.stat-blue {
  background: #e6f5ff;
}

.stat-pink {
  background: #fff0f0;
}

.stat-purple {
  background: #f2eeff;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 52px;
  height: 52px;
  flex-shrink: 0;

  border-radius: 50%;
  background: rgba(255, 211, 89, 0.35);

  font-size: 27px;
}

.stat-blue .stat-icon {
  background: #d0eaff;
}

.stat-pink .stat-icon {
  background: #ffdade;
}

.stat-purple .stat-icon {
  background: #e3d9ff;
}

.stat-info {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.stat-title {
  margin: 0 0 3px;
  font-size: 12px;
  font-weight: 600;
}

.stat-value {
  margin: 0;
  font-size: 25px;
  font-weight: 800;
  white-space: nowrap;
}

.stat-change {
  margin: 4px 0 0;
  color: #21a66a;
  font-size: 10px;
  font-weight: 700;
}

.stat-change span {
  margin-right: 2px;
}

.stat-pokeball {
  position: absolute;
  right: 9px;
  bottom: 6px;
  font-size: 25px;
  opacity: 0.1;
}

/* ========================================
   DASHBOARD PANELS
======================================== */

.dashboard-panel {
  display: flex;
  flex-direction: column;

  height: 100%;
  min-height: 0;
  min-width: 0;

  padding: 12px 14px;

  background: white;
  border: 1.5px solid #fff0bc;
  border-radius: 14px;

  box-shadow: 0 2px 8px rgba(38, 43, 80, 0.05);
  overflow: hidden;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;

  flex-shrink: 0;
  margin-bottom: 10px;
}

.heading-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.heading-icon {
  font-size: 23px;
  flex-shrink: 0;
}

.heading-info h3 {
  margin: 0 0 2px;
  font-size: 16px;
  font-weight: 750;
  color: #13264f;
}

.heading-info p {
  margin: 0;
  font-size: 10px;
  color: #778198;
}

/* ========================================
   LEARNING ACTIVITY CHART
======================================== */

.period-select {
  padding: 6px 9px;

  background: white;
  color: #13264f;

  border: 1px solid #dfe3ec;
  border-radius: 9px;

  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.period-select:focus {
  outline: 2px solid #ffcf45;
}

.activity-chart {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  width: 100%;
  position: relative;
}

/* Allow ApexCharts to fill its parent */
.activity-chart :deep(.vue-apexcharts) {
  width: 100%;
  height: 100%;
}

/* ========================================
   SUBJECT MASTERY
======================================== */

.subject-list {
  flex: 1;
  min-height: 0;

  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  gap: 10px;
}

.subject-card {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1.5px solid;
}

.subject-blue {
  background: #eef7ff;
  border-color: #c9e5ff;
}

.subject-green {
  background: #effcf3;
  border-color: #c9efd7;
}

.subject-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.subject-heading {
  display: flex;
  align-items: center;
  gap: 9px;
}

.subject-icon {
  font-size: 21px;
}

.subject-name {
  font-size: 13px;
  font-weight: 700;
}

.mastery-value {
  font-size: 18px;
  font-weight: 800;
  color: #13264f;
}

.mastery-track {
  height: 11px;
  background: #e6e9ee;
  border-radius: 20px;
  overflow: hidden;
}

.mastery-fill {
  height: 100%;
  border-radius: inherit;
  transition: width 0.6s ease;
}

.mastery-blue {
  background: #69b6fa;
}

.mastery-green {
  background: #65d48f;
}

.subject-details {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 5px;

  margin-top: 8px;

  font-size: 10px;
  font-weight: 600;
  color: #657087;
}

/* ========================================
   VIEW ALL BUTTONS
======================================== */

.view-all-btn {
  padding: 5px 9px;

  white-space: nowrap;
  background: white;

  border: 1px solid #dfe3ec;
  border-radius: 9px;

  color: #142650;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;

  cursor: pointer;
  transition: background 0.2s ease;
}

.view-all-btn:hover {
  background: #fff5cb;
  border-color: #ffca28;
}

/* ========================================
   RECENT PROGRESS - SCROLLABLE
======================================== */

.progress-scroll {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;

  overflow-y: auto;
  overflow-x: auto;
  overscroll-behavior: contain;
}

.progress-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.progress-table th {
  position: sticky;
  top: 0;
  z-index: 2;

  padding: 7px 8px;
  text-align: left;

  background: #f4f5f7;
  color: #657087;

  font-weight: 700;
  white-space: nowrap;
}

.progress-table th:first-child {
  border-radius: 8px 0 0 8px;
}

.progress-table th:last-child {
  border-radius: 0 8px 8px 0;
}

.progress-table td {
  padding: 7px 8px;

  border-bottom: 1px solid #edf0f4;
  vertical-align: middle;
  white-space: nowrap;
}

.progress-table tbody tr:hover {
  background: #fffaf0;
}

.activity-icon {
  margin-right: 5px;
  font-size: 15px;
}

.type-badge {
  display: inline-block;
  min-width: 43px;

  padding: 3px 7px;
  border-radius: 7px;

  text-align: center;
  font-size: 10px;
  font-weight: 700;
}

.type-badge.deck {
  background: #fff0a9;
  color: #7c651a;
}

.type-badge.quiz {
  background: #ffd7df;
  color: #a3425d;
}

/* ========================================
   UPCOMING QUIZZES - SCROLLABLE
======================================== */

.quiz-list {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;

  display: flex;
  flex-direction: column;
  justify-content: flex-start;

  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.quiz-row {
  display: flex;
  align-items: center;
  gap: 8px;

  padding: 7px;
  border-bottom: 1px solid #edf0f4;

  flex-shrink: 0;
  transition: background 0.2s ease;
}

.quiz-row:hover {
  background: #fffaf0;
}

.quiz-icon {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 30px;
  height: 30px;
  flex-shrink: 0;

  background: #fff6e9;
  border-radius: 9px;
  font-size: 18px;
}

.quiz-info {
  flex: 1;
  min-width: 0;
}

.quiz-info h4 {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 700;
}

.quiz-info p {
  margin: 0;
  color: #8992a5;
  font-size: 10px;
}

.quiz-date {
  color: #758097;
  font-size: 10px;
  white-space: nowrap;
}

/* ========================================
   SOFT SCROLLBARS
======================================== */

.progress-scroll,
.quiz-list {
  scrollbar-width: thin;
  scrollbar-color: #e8dba5 transparent;
}

.progress-scroll::-webkit-scrollbar,
.quiz-list::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.progress-scroll::-webkit-scrollbar-thumb,
.quiz-list::-webkit-scrollbar-thumb {
  background: #e8dba5;
  border-radius: 10px;
}

/* ========================================
   RESPONSIVENESS
======================================== */

/* Smaller desktops and tablets */
@media (max-width: 1199px) {
  .student-dashboard {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }

  .dashboard-content {
    overflow: visible;
  }

  .stats-section,
  .charts-section,
  .tables-section {
    flex: none;
  }

  .stat-card {
    min-height: 95px;
  }

  .dashboard-panel {
    min-height: 240px;
  }

  .activity-chart {
    flex: none;
    height: 230px;
  }

  .progress-scroll,
  .quiz-list {
    flex: none;
    max-height: 220px;
    overflow-y: auto;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .student-dashboard {
    padding: 8px;
  }

  .welcome-banner {
    padding: 8px 12px;
  }

  .welcome-title h1 {
    font-size: 21px;
  }

  .welcome-content p {
    font-size: 11px;
  }

  .welcome-mascot img {
    width: 60px;
    height: 60px;
  }

  .mascot-sign {
    display: none;
  }

  .dashboard-panel {
    padding: 10px;
  }

  .subject-card {
    padding: 10px 12px;
  }

  .subject-details {
    flex-wrap: wrap;
  }

  .quiz-date {
    font-size: 9px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .welcome-mascot img {
    animation: none;
  }

  .stat-card,
  .mastery-fill {
    transition: none;
  }
}

</style>
