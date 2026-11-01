<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'
import BackToHome from '../components/common/BackToHome.vue'
import PokemonBuddy from '@/components/pokebuddy/PokemonBuddy.vue'
import { getCurrentProfile } from '../services/profileService'

const authenticatedName = ref('Trainer')
let dashboardActive = true
onMounted(async () => {
  try {
    const profile = await getCurrentProfile()
    if (dashboardActive) authenticatedName.value = profile.display_name
  } catch { /* Sample charts remain available if the greeting cannot load. */ }
})
onUnmounted(() => { dashboardActive = false })


// ======================================================
// CONFIGURATION
// ======================================================

// All data is local. Refreshing resets the sample data.
// No Supabase connection is required.
const SESSION_XP = 15
const TIME_ZONE = 'Asia/Singapore'

const POKE_API_URL = (import.meta.env.VITE_POKE_API_URL || 'https://pokeapi.co/api/v2').replace(/\/+$/, '')

const currentTime = ref(new Date())

// Creates consistent sample UUIDs.
const sampleId = number =>
  `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`

// ======================================================
// DATE HELPERS
// ======================================================

function dayKey(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))

  const values = Object.fromEntries(
    parts.map(part => [part.type, part.value])
  )

  return `${values.year}-${values.month}-${values.day}`
}

function shiftDay(day, offset) {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)

  return date.toISOString().slice(0, 10)
}

const sampleToday = dayKey(currentTime.value)

// Keeps the sample data recent whenever you open the page.
function sampleDate(daysAgo, time = '12:00:00') {
  const date = shiftDay(sampleToday, -daysAgo)
  return `${date}T${time}+08:00`
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-SG', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatLogin(value) {
  if (!value) return 'Not recorded'

  return new Date(value).toLocaleString('en-SG', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isCompletedDate(value) {
  if (!value) return false

  const time = Date.parse(value)

  return (
    Number.isFinite(time) &&
    time <= currentTime.value.getTime()
  )
}

function signed(value) {
  return `${value > 0 ? '+' : ''}${value}`
}

// ======================================================
// LOCAL SAMPLE TABLE: LEVELS
// ======================================================

const levels = ref([
  {
    id: sampleId(1),
    level_number: 3,
    name: 'Primary 3',
  },
])

// ======================================================
// LOCAL SAMPLE TABLE: SUBJECTS
// ======================================================

const subjects = ref([
  {
    id: sampleId(2),
    name: 'Science',
  },
])

// ======================================================
// LOCAL SAMPLE TABLE: USERS
// Equivalent to your profiles table.
//
// last_login_at is an extra LOCAL sample field.
// total_study_streak is calculated in the user object below.
// ======================================================

const users = ref([
  {
    id: sampleId(101),
    display_name: 'testuseR',
    school_level_id: sampleId(1),
    avatar_choice: 'prefer_not_to_say',
    created_at: sampleDate(40),
    last_login_at: currentTime.value.toISOString(),
  },
  {
    id: sampleId(102),
    display_name: 'Ash',
    school_level_id: sampleId(1),
    avatar_choice: 'male',
    created_at: sampleDate(25),
    last_login_at: sampleDate(1, '18:00:00'),
  },
  {
    id: sampleId(103),
    display_name: 'New Trainer',
    school_level_id: sampleId(1),
    avatar_choice: 'prefer_not_to_say',
    created_at: currentTime.value.toISOString(),
    last_login_at: currentTime.value.toISOString(),
  },
])

// sample data to get user selected pokemon
const userPokemons = ref([
  {
    id: sampleId(301),
    user_id: sampleId(101),
    pokemon_id: sampleId(201),
    pokeapi_id: 1, // Bulbasaur
    xp: 70,
    level: 3,
    is_selected: true,
    is_defeated: false,
    obtained_at: sampleDate(30),
  },
  {
    id: sampleId(302),
    user_id: sampleId(101),
    pokemon_id: sampleId(204),
    pokeapi_id: 25, // Pikachu
    xp: 10,
    level: 1,
    is_selected: false,
    is_defeated: false,
    obtained_at: sampleDate(15),
  },
  {
    id: sampleId(303),
    user_id: sampleId(102),
    pokemon_id: sampleId(202),
    pokeapi_id: 4, // Charmander
    xp: 98,
    level: 6,
    is_selected: true,
    is_defeated: false,
    obtained_at: sampleDate(20),
  },
  {
    id: sampleId(304),
    user_id: sampleId(103),
    pokemon_id: sampleId(203),
    pokeapi_id: 7, // Squirtle
    xp: 0,
    level: 1,
    is_selected: true,
    is_defeated: false,
    obtained_at: currentTime.value.toISOString(),
  },
])


async function getSelectedPokemon(userId) {
  const selected = userPokemons.value.find(
    pokemon =>
      pokemon.user_id === userId &&
      pokemon.is_selected === true
  )

  if (!selected) return null

  try {
    const response = await fetch(
      `${POKE_API_URL}/pokemon/${selected.pokeapi_id}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch Pokémon')
    }

    const data = await response.json()

    const name =
      data.name.charAt(0).toUpperCase() +
      data.name.slice(1)

    const staticImage = data.sprites.front_default || ''

    const animatedImage =
      data.sprites.versions?.['generation-v']?.['black-white']
        ?.animated?.front_default || staticImage

    return {
      ...selected,

      // Preserve the owned record's UUID separately.
      ownedId: selected.id,

      // PokemonBuddy uses the numeric PokéAPI ID.
      id: data.id,

      name,
      species: name,
      originalSpeciesId: selected.pokeapi_id,
      isDefeated: selected.is_defeated,

      // Your current sample Pokémon start at evolution stage 0.
      // Pokémon level and evolution stage are different values.
      evolution_stage: selected.evolution_stage ?? 0,
      stageBeforeMax: selected.stageBeforeMax,

      animated_img: animatedImage,
      static_img: staticImage
    }
  } catch (error) {
    console.error('Error fetching Pokémon:', error)
    return null
  }
}

// Change this value to switch users programmatically.
const currentUserId = ref(sampleId(101))

// Selected buddy and its loading state.
const selectedPokemon = ref(null)
const pokemonLoading = ref(false)

watch(
  currentUserId,
  async (userId, _, onCleanup) => {
    let cancelled = false

    onCleanup(() => {
      cancelled = true
    })

    pokemonLoading.value = true
    selectedPokemon.value = null

    try {
      const pokemon = await getSelectedPokemon(userId)

      if (!cancelled) {
        selectedPokemon.value = pokemon
      }
    } finally {
      if (!cancelled) {
        pokemonLoading.value = false
      }
    }
  },
  { immediate: true }
)


// ======================================================
// LOCAL SAMPLE TABLE: TOPICS
// ======================================================

const topics = ref([
  {
    id: sampleId(201),
    level_id: sampleId(1),
    subject_id: sampleId(2),
    name: 'Plants and Their Parts',
    description: 'Explore the different parts of a plant.',
    topic_order: 1,
    created_at: sampleDate(40),
  },
  {
    id: sampleId(202),
    level_id: sampleId(1),
    subject_id: sampleId(2),
    name: 'Light and Shadows',
    description: 'Explore how light and shadows work.',
    topic_order: 2,
    created_at: sampleDate(40),
  },
  {
    id: sampleId(203),
    level_id: sampleId(1),
    subject_id: sampleId(2),
    name: 'Matter and Materials',
    description: 'Explore materials and their properties.',
    topic_order: 3,
    created_at: sampleDate(40),
  },
  {
    id: sampleId(204),
    level_id: sampleId(1),
    subject_id: sampleId(2),
    name: 'Living Things',
    description: 'Explore the characteristics of living things.',
    topic_order: 4,
    created_at: sampleDate(40),
  },
])

// Icons are display settings, not database fields.
const topicIcons = {
  [sampleId(201)]: '🌱',
  [sampleId(202)]: '💡',
  [sampleId(203)]: '🧊',
  [sampleId(204)]: '🦋',
}

// ======================================================
// LOCAL SAMPLE TABLE: QUIZ ATTEMPTS
//
// score = number of correct answers in this sample.
// xp_change can be positive, zero, or negative.
// ======================================================

function createSampleAttempt(
  id,
  userId,
  topicId,
  daysAgo,
  score,
  totalQuestions,
  xpChange,
  attemptType = 'quiz'
) {
  return {
    id: sampleId(id),
    user_id: sampleId(userId),
    topic_id: sampleId(topicId),
    attempt_type: attemptType,
    score,
    total_questions: totalQuestions,
    xp_change: xpChange,
    created_at: sampleDate(daysAgo, '13:50:00'),
    completed_at: sampleDate(daysAgo, '14:00:00'),
  }
}

const quizAttempts = ref([
  // testuseR: regular quizzes
  createSampleAttempt(301, 101, 201, 11, 6, 10, 30),
  createSampleAttempt(302, 101, 201, 9, 8, 10, 40),
  createSampleAttempt(303, 101, 201, 6, 9, 10, 45),
  createSampleAttempt(304, 101, 202, 5, 2, 5, 10),
  createSampleAttempt(305, 101, 202, 3, 3, 5, 15),
  createSampleAttempt(306, 101, 203, 2, 7, 10, 35),

  // testuseR: boss battle with an XP penalty
  createSampleAttempt(
    307, 101, 201, 1, 2, 5, -10, 'boss_battle'
  ),

  // Ash: separate records to test user filtering
  createSampleAttempt(308, 102, 201, 4, 5, 10, 25),
  createSampleAttempt(309, 102, 202, 2, 4, 5, 20),

  // New Trainer has no attempts yet.
])

// ======================================================
// LOCAL SAMPLE TABLE: STUDY SESSIONS
//
// Every completed session earns 15 XP.
// In-progress and abandoned sessions earn 0 XP.
// Completing the same row twice does not award extra XP.
// ======================================================

function createSampleSession(
  id,
  userId,
  topicId,
  daysAgo,
  minutes,
  status = 'completed'
) {
  const startedAt = sampleDate(daysAgo, '10:00:00')

  return {
    id: sampleId(id),
    user_id: sampleId(userId),
    topic_id: topicId === null ? null : sampleId(topicId),
    started_at: startedAt,
    completed_at:
      status === 'completed'
        ? new Date(
            Date.parse(startedAt) + minutes * 60000
          ).toISOString()
        : null,
    status,
    created_at: startedAt,
  }
}

const studySessions = ref([
  // testuseR: seven consecutive days
  createSampleSession(401, 101, 201, 7, 20),
  createSampleSession(402, 101, 201, 6, 25),
  createSampleSession(403, 101, 202, 5, 30),
  createSampleSession(404, 101, 202, 4, 20),
  createSampleSession(405, 101, 203, 3, 40),
  createSampleSession(406, 101, 203, 2, 25),
  createSampleSession(407, 101, 201, 1, 35),

  // A second session yesterday.
  // Counts as another session, but not another streak day.
  {
    id: sampleId(408),
    user_id: sampleId(101),
    topic_id: sampleId(201),
    started_at: sampleDate(1, '16:00:00'),
    completed_at: sampleDate(1, '16:15:00'),
    status: 'completed',
    created_at: sampleDate(1, '16:00:00'),
  },

  // Abandoned session: earns no XP.
  createSampleSession(
    409, 101, 202, 2, 10, 'abandoned'
  ),

  // Current session: use the preview button to complete it.
  {
    id: sampleId(410),
    user_id: sampleId(101),
    topic_id: sampleId(202),
    started_at: new Date(
      currentTime.value.getTime() - 10 * 60000
    ).toISOString(),
    completed_at: null,
    status: 'in_progress',
    created_at: new Date(
      currentTime.value.getTime() - 10 * 60000
    ).toISOString(),
  },

  // Ash
  createSampleSession(411, 102, 201, 4, 25),
  createSampleSession(412, 102, 202, 2, 25),
])

// ======================================================
// RETRIEVE RECORDS FOR THE SELECTED USER
// ======================================================

const selectedProfile = computed(() =>
  users.value.find(profile => profile.id === currentUserId.value)
)

const userQuizAttempts = computed(() =>
  quizAttempts.value.filter(attempt =>
    attempt.user_id === currentUserId.value &&
    isCompletedDate(attempt.completed_at)
  )
)

const completedSessions = computed(() =>
  studySessions.value.filter(session =>
    session.user_id === currentUserId.value &&
    session.status === 'completed' &&
    isCompletedDate(session.completed_at)
  )
)

const pendingSession = computed(() =>
  studySessions.value.find(session =>
    session.user_id === currentUserId.value &&
    session.status === 'in_progress'
  )
)

function completeSampleSession() {
  const session = pendingSession.value

  if (!session || session.status !== 'in_progress') return

  currentTime.value = new Date()

  session.status = 'completed'
  session.completed_at = currentTime.value.toISOString()

  // XP updates through computed values.
  // No separate increment, so this row cannot award XP twice.
}

// ======================================================
// DATE RANGES
// ======================================================

const today = computed(() => dayKey(currentTime.value))

const weekStart = computed(() => {
  const weekday = new Date(
    `${today.value}T00:00:00Z`
  ).getUTCDay()

  // Monday = first day of the week.
  return shiftDay(today.value, -((weekday + 6) % 7))
})

function isThisWeek(value) {
  const day = dayKey(value)

  return day >= weekStart.value && day <= today.value
}

function isLastWeek(value) {
  const day = dayKey(value)

  return (
    day >= shiftDay(weekStart.value, -7) &&
    day < weekStart.value
  )
}

// ======================================================
// XP CALCULATIONS
// ======================================================

const totalQuizXP = computed(() =>
  userQuizAttempts.value.reduce(
    (total, attempt) => total + attempt.xp_change,
    0
  )
)

const totalStudyXP = computed(() =>
  completedSessions.value.length * SESSION_XP
)

const totalXP = computed(() =>
  totalQuizXP.value + totalStudyXP.value
)

const xpThisWeek = computed(() => {
  const quizXP = userQuizAttempts.value
    .filter(attempt => isThisWeek(attempt.completed_at))
    .reduce((total, attempt) => total + attempt.xp_change, 0)

  const sessionXP = completedSessions.value
    .filter(session => isThisWeek(session.completed_at))
    .length * SESSION_XP

  return quizXP + sessionXP
})

const sessionsThisWeek = computed(() =>
  completedSessions.value.filter(session =>
    isThisWeek(session.completed_at)
  ).length
)

// ======================================================
// QUIZ SCORES
//
// Quiz averages and topic progress use regular quizzes.
// Boss battles still contribute to XP and study activity.
// ======================================================

function quizPercentage(attempt) {
  if (
    !attempt ||
    !Number.isFinite(attempt.score) ||
    !Number.isFinite(attempt.total_questions) ||
    attempt.total_questions <= 0 ||
    attempt.score < 0 ||
    attempt.score > attempt.total_questions
  ) return null

  return Math.round(
    attempt.score / attempt.total_questions * 100
  )
}

const regularQuizAttempts = computed(() =>
  userQuizAttempts.value.filter(attempt =>
    attempt.attempt_type === 'quiz' &&
    quizPercentage(attempt) !== null
  )
)

function averagePercentage(attempts) {
  if (!attempts.length) return null

  const total = attempts.reduce(
    (sum, attempt) =>
      sum + attempt.score / attempt.total_questions * 100,
    0
  )

  // Each quiz attempt has equal weight.
  return Math.round(total / attempts.length * 10) / 10
}

const quizAverage = computed(() =>
  averagePercentage(regularQuizAttempts.value)
)

const quizImprovement = computed(() => {
  const thisWeek = averagePercentage(
    regularQuizAttempts.value.filter(attempt =>
      isThisWeek(attempt.completed_at)
    )
  )

  const lastWeek = averagePercentage(
    regularQuizAttempts.value.filter(attempt =>
      isLastWeek(attempt.completed_at)
    )
  )

  if (thisWeek === null || lastWeek === null) return null

  return Math.round((thisWeek - lastWeek) * 10) / 10
})

// ======================================================
// STUDY STREAK
//
// An active day has a completed study session OR quiz.
// Multiple activities on one day count as ONE streak day.
// Logging in alone does not extend the study streak.
//
// Yesterday's streak remains until the end of today,
// giving the user today to complete an activity.
// ======================================================

const activeStudyDays = computed(() =>
  new Set([
    ...completedSessions.value.map(session =>
      dayKey(session.completed_at)
    ),
    ...userQuizAttempts.value.map(attempt =>
      dayKey(attempt.completed_at)
    ),
  ])
)

const totalStudyStreak = computed(() => {
  const days = activeStudyDays.value

  let day = days.has(today.value)
    ? today.value
    : shiftDay(today.value, -1)

  let streak = 0

  while (days.has(day)) {
    streak++
    day = shiftDay(day, -1)
  }

  return streak
})

const longestStudyStreak = computed(() => {
  const days = [...activeStudyDays.value].sort()

  let longest = 0
  let current = 0
  let previousDay = null

  for (const day of days) {
    current =
      previousDay && day === shiftDay(previousDay, 1)
        ? current + 1
        : 1

    longest = Math.max(longest, current)
    previousDay = day
  }

  return longest
})

// ======================================================
// USER OBJECT USED BY THE DASHBOARD
// Replaces the old hardcoded student object.
// ======================================================

const user = computed(() => ({
  ...selectedProfile.value,
  display_name: selectedProfile.value?.display_name ?? 'Trainer',
  total_xp: totalXP.value,
  total_study_sessions: completedSessions.value.length,
  total_study_streak: totalStudyStreak.value,
  longest_study_streak: longestStudyStreak.value,
  total_study_days: activeStudyDays.value.size,
}))

const userLevel = computed(() =>
  levels.value.find(level =>
    level.id === user.value.school_level_id
  )?.name ?? ''
)

// ======================================================
// DASHBOARD STATISTIC CARDS
// ======================================================

const stats = computed(() => [
  {
    title: 'Total XP',
    value: user.value.total_xp.toLocaleString(),
    change: `${signed(xpThisWeek.value)} XP this week`,
    icon: '⭐',
    color: 'yellow',
    explanation:
      `${totalQuizXP.value} quiz/boss XP + ` +
      `${completedSessions.value.length} sessions × ${SESSION_XP} XP`,
  },
  {
    title: 'Study Streak',
    value: `${user.value.total_study_streak} days`,
    change:
      `Best: ${user.value.longest_study_streak} days · ` +
      `${user.value.total_study_days} active days`,
    icon: '🔥',
    color: 'blue',
    explanation:
      'Consecutive days with completed study or quiz activity.',
  },
  {
    title: 'Sessions Completed',
    value: user.value.total_study_sessions,
    change: `${sessionsThisWeek.value} this week · ${SESSION_XP} XP each`,
    icon: '📖',
    color: 'pink',
    explanation:
      'Only completed sessions count. Repeated topics can count as new sessions.',
  },
  {
    title: 'Quiz Average',
    value: quizAverage.value === null
      ? '—'
      : `${quizAverage.value}%`,
    change: quizImprovement.value === null
      ? `${regularQuizAttempts.value.length} quizzes completed`
      : `${signed(quizImprovement.value)} percentage points vs last week`,
    icon: '🏆',
    color: 'purple',
    explanation:
      'Average percentage across regular quizzes. Boss battles excluded.',
  },
])

// ======================================================
// LEARNING ACTIVITY CHART
//
// Uses elapsed time from completed study sessions.
// Includes breaks; it is not focus-only time.
// Sessions crossing midnight are split between days.
// ======================================================

const selectedPeriod = ref('7')

const chartDays = computed(() =>
  Array.from(
    { length: Number(selectedPeriod.value) },
    (_, index) =>
      shiftDay(
        today.value,
        index - Number(selectedPeriod.value) + 1
      )
  )
)

const activityDates = computed(() =>
  chartDays.value.map(day =>
    new Date(`${day}T12:00:00+08:00`).toLocaleDateString(
      'en-SG',
      {
        timeZone: TIME_ZONE,
        day: 'numeric',
        month: 'short',
      }
    )
  )
)

const chartSeries = computed(() => [
  {
    name: 'Study Minutes',
    data: chartDays.value.map(day => {
      const dayStart = Date.parse(`${day}T00:00:00+08:00`)
      const dayEnd = Date.parse(
        `${shiftDay(day, 1)}T00:00:00+08:00`
      )

      const milliseconds = completedSessions.value.reduce(
        (total, session) => {
          const start = Date.parse(session.started_at)
          const end = Date.parse(session.completed_at)

          if (
            !Number.isFinite(start) ||
            !Number.isFinite(end) ||
            end < start
          ) return total

          const overlap = Math.max(
            0,
            Math.min(end, dayEnd) - Math.max(start, dayStart)
          )

          return total + overlap
        },
        0
      )

      return Math.round(milliseconds / 60000 * 10) / 10
    }),
  },
])

const chartOptions = computed(() => ({
  chart: {
    type: 'area',
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'Fredoka, sans-serif',
    parentHeightOffset: 0,
    redrawOnParentResize: true,
    redrawOnWindowResize: true,
  },
  colors: ['#ffca28'],
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  markers: {
    size: 3,
    colors: ['#ffffff'],
    strokeColors: '#ffca28',
    strokeWidth: 2,
  },
  fill: {
    type: 'gradient',
    gradient: {
      opacityFrom: 0.35,
      opacityTo: 0.03,
      stops: [0, 100],
    },
  },
  dataLabels: { enabled: false },
  grid: {
    borderColor: '#eef0f5',
    strokeDashArray: 4,
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
    y: {
      formatter: value => `${value} minutes`,
    },
  },
  legend: { show: false },
}))

// ======================================================
// SCIENCE TOPIC PROGRESS
// Joins topics with subjects and the user's school level.
// ======================================================

const scienceTopics = computed(() =>
  topics.value
    .filter(topic =>
      topic.level_id === user.value.school_level_id &&
      subjects.value.some(subject =>
        subject.id === topic.subject_id &&
        subject.name === 'Science'
      )
    )
    .sort((a, b) =>
      (a.topic_order ?? Infinity) - (b.topic_order ?? Infinity)
    )
)

const topicProgress = computed(() =>
  scienceTopics.value.map(topic => {
    const attempts = regularQuizAttempts.value
      .filter(attempt => attempt.topic_id === topic.id)
      .sort((a, b) =>
        Date.parse(b.completed_at) - Date.parse(a.completed_at) ||
        a.id.localeCompare(b.id)
      )

    const latestScore = quizPercentage(attempts[0])
    const previousScore = quizPercentage(attempts[1])

    return {
      ...topic,
      icon: topicIcons[topic.id] ?? '🔬',
      attempts,
      latestScore,
      improvement:
        latestScore !== null && previousScore !== null
          ? latestScore - previousScore
          : null,
      color:
        latestScore === null
          ? 'grey'
          : latestScore >= 80
            ? 'green'
            : 'yellow',
    }
  })
)

const completedTopicCount = computed(() =>
  topicProgress.value.filter(topic =>
    topic.latestScore !== null &&
    topic.latestScore >= 80
  ).length
)

const totalTopicCount = computed(() =>
  topicProgress.value.length
)

const topicCompletionPercentage = computed(() =>
  totalTopicCount.value === 0
    ? 0
    : Math.round(
        completedTopicCount.value / totalTopicCount.value * 100
      )
)

const nextChallenge = computed(() =>
  recommendedTopics.value[0] ?? null
)

const hasActivityInPeriod = computed(() =>
  chartSeries.value.some(series =>
    series.data.some(minutes => minutes > 0)
  )
)

const minutesInPeriod = computed(() =>
  Math.round(
    chartSeries.value.reduce(
      (total, series) =>
        total + series.data.reduce((sum, minutes) => sum + minutes, 0),
      0
    )
  )
)

function topicStatusLabel(topic) {
  if (topic.latestScore === null) return 'Not started'
  return topic.latestScore >= 80 ? 'Completed' : 'In progress'
}

const expandedTopic = ref(null)

function toggleAttempts(topicId) {
  expandedTopic.value =
    expandedTopic.value === topicId ? null : topicId
}

// Prioritise:
// 1. Attempted topics below 80%
// 2. Unattempted topics
// 3. Other topics for continued practice
const recommendedTopics = computed(() => {
  function priority(topic) {
    if (topic.latestScore === null) return 1
    return topic.latestScore < 80 ? 0 : 2
  }

  return [...topicProgress.value].sort((a, b) =>
    priority(a) - priority(b) ||
    (a.latestScore ?? 0) - (b.latestScore ?? 0) ||
    a.topic_order - b.topic_order
  )
})
// ======================================================
// RECENT PROGRESS
// Built dynamically from quizzes + completed sessions.
// ======================================================

function findTopic(topicId) {
  return topics.value.find(topic => topic.id === topicId)
}

const recentProgress = computed(() => {
  const quizzes = userQuizAttempts.value.map(attempt => ({
    id: `quiz-${attempt.id}`,
    title: findTopic(attempt.topic_id)?.name ?? 'Unknown topic',
    icon: topicIcons[attempt.topic_id] ?? '🔬',
    type:
      attempt.attempt_type === 'boss_battle'
        ? 'Boss battle'
        : 'Quiz',
    badge: 'quiz',
    score: quizPercentage(attempt),
    xp: attempt.xp_change,
    completed_at: attempt.completed_at,
  }))

  const sessions = completedSessions.value.map(session => ({
    id: `session-${session.id}`,
    title: findTopic(session.topic_id)?.name ?? 'General study',
    icon: topicIcons[session.topic_id] ?? '📖',
    type: 'Study',
    badge: 'study',
    score: null,
    xp: SESSION_XP,
    completed_at: session.completed_at,
  }))

  return [...quizzes, ...sessions].sort((a, b) =>
    Date.parse(b.completed_at) - Date.parse(a.completed_at) ||
    a.id.localeCompare(b.id)
  )
})

const showAllProgress = ref(false)

const visibleProgress = computed(() =>
  showAllProgress.value
    ? recentProgress.value
    : recentProgress.value.slice(0, 5)
)

// Reset expanded panels when switching sample users.
watch(currentUserId, () => {
  expandedTopic.value = null
  showAllProgress.value = false
})

// Keep date-based calculations current while the page is open.
let clockInterval

onMounted(() => {
  clockInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 60000)
})

onUnmounted(() => {
  clearInterval(clockInterval)
})
</script>

<template>
  <main class="trainer-dashboard student-dashboard">
    <div class="dashboard-shell">
      <!-- COMPACT WELCOME HEADER -->
      <header class="dashboard-header">
        <div class="header-main">
          <BackToHome variant="custom" class="back-button" />

          <div class="welcome-copy welcome-title">
            <span class="eyebrow">YOUR TRAINER JOURNEY</span>
            <h1>Hello, {{ authenticatedName }}!</h1>
            <p class="study-note">Sample progress preview — these figures are demonstration data.</p>

            <p class="welcome-message">
              Small steps today. Bigger wins tomorrow.
            </p>

            <p class="last-login">
              Last login: {{ formatLogin(user.last_login_at) }} · SGT
            </p>
          </div>
        </div>
        <div class="dashboard-buddy">
          <h3 class="town-buddy-heading">
            Your Town Buddy Progress
          </h3>

          <p v-if="pokemonLoading" role="status">
            Loading Pokémon...
          </p>

          <PokemonBuddy
            v-else-if="selectedPokemon"
            :key="selectedPokemon.ownedId"
            :active-pokemon="selectedPokemon"
          />

          <p v-else>No Pokémon selected.</p>
        </div>


      </header>

      <!-- COLLAPSIBLE LOCAL DEMO CONTROLS -->
      <details class="demo-panel">
        <summary>
          <span>⚙️ Demo controls</span>
          <span class="demo-label">Local sample data</span>
        </summary>

        <div class="demo-controls">
          <label for="sample-user">Preview user</label>

          <select id="sample-user" v-model="currentUserId">
            <option
              v-for="profile in users"
              :key="profile.id"
              :value="profile.id"
            >
              {{ profile.display_name }}
            </option>
          </select>

          <button
            type="button"
            class="button button-secondary"
            :disabled="!pendingSession"
            @click="completeSampleSession"
          >
            {{
              pendingSession
                ? `Complete sample session (+${SESSION_XP} XP)`
                : 'No pending sample session'
            }}
          </button>

          <small>Changes reset when you refresh.</small>
        </div>
      </details>

      <!-- OVERVIEW CARDS -->
      <section class="stats-grid" aria-label="Your learning statistics">
        <article
          v-for="stat in stats"
          :key="stat.title"
          class="stat-card"
          :class="`stat-${stat.color}`"
          :title="stat.explanation"
        >
          <div class="stat-top">
            <span class="stat-label">{{ stat.title }}</span>
            <span class="stat-icon" aria-hidden="true">
              {{ stat.icon }}
            </span>
          </div>

          <strong class="stat-value">{{ stat.value }}</strong>
          <p class="stat-description">{{ stat.change }}</p>
        </article>
      </section>

      <!-- MAIN CONTENT -->
      <div class="main-grid">
        <!-- SCIENCE TOPICS: THE MAIN FOCUS -->
        <section
          class="dashboard-panel topic-panel"
          aria-labelledby="science-title"
        >
          <div class="panel-heading">
            <div>
              <span class="eyebrow">EXPLORE · PRACTISE · COMPLETE</span>
              <h2 id="science-title">🌿 Science Topic Progress</h2>
              <p>Reach 80% in your latest quiz to complete a topic.</p>
            </div>

            <span v-if="userLevel" class="level-badge">
              {{ userLevel }}
            </span>
          </div>

          <!-- OVERALL COMPLETION -->
          <div class="completion-summary">
            <div class="completion-heading">
              <div>
                <strong>{{ completedTopicCount }}</strong>
                <span>of {{ totalTopicCount }} topics completed</span>
              </div>

              <span class="completion-percentage">
                {{ topicCompletionPercentage }}%
              </span>
            </div>


            <div
              class="completion-track"
              role="progressbar"
              aria-label="Science topics completed"
              :aria-valuenow="completedTopicCount"
              aria-valuemin="0"
              :aria-valuemax="totalTopicCount || 1"
            >
              <div
                class="completion-fill"
                :style="{ width: `${topicCompletionPercentage}%` }"
              ></div>
            </div>
          </div>
          <!-- ONE RECOMMENDATION INSTEAD OF ANOTHER PANEL -->
          <aside v-if="nextChallenge" class="next-challenge">
            <div class="challenge-icon" aria-hidden="true">💡</div>

            <div class="challenge-copy">
              <span class="eyebrow">YOUR NEXT CHALLENGE</span>
              <h3>{{ nextChallenge.name }}</h3>

              <p v-if="nextChallenge.latestScore === null">
                A new topic to discover. Give it your first try!
              </p>

              <p v-else-if="nextChallenge.latestScore < 80">
                Your latest score is {{ nextChallenge.latestScore }}%.
                Keep practising to reach 80%.
              </p>

              <p v-else>
                You’re doing well! Keep your knowledge fresh with another quiz.
              </p>
            </div>

            <RouterLink to="/quiz" class="button button-primary">
              Open Quiz Arena →
            </RouterLink>
          </aside>

          <!-- COMPACT TOPIC ROWS -->
          <div class="topic-list">
            <p v-if="!topicProgress.length" class="simple-empty">
              Your Science topics will appear here.
            </p>

            <article
              v-for="topic in topicProgress"
              :key="topic.id"
              class="topic-item"
              :class="[
                `topic-${topic.color}`,
                { 'topic-expanded': expandedTopic === topic.id },
              ]"
            >
              <button
                type="button"
                class="topic-toggle"
                :aria-expanded="expandedTopic === topic.id"
                :aria-controls="`topic-details-${topic.id}`"
                @click="toggleAttempts(topic.id)"
              >
                <span class="topic-icon" aria-hidden="true">
                  {{ topic.icon }}
                </span>

                <span class="topic-name">
                  {{ topic.name }}
                </span>

                <span class="topic-status">
                  {{
                    topic.latestScore !== null &&
                    topic.latestScore >= 80
                      ? '✓ '
                      : ''
                  }}
                  {{ topicStatusLabel(topic) }}
                </span>

                <span
                  class="topic-score"
                  :aria-label="
                    topic.latestScore === null
                      ? 'No quiz score yet'
                      : `Latest quiz score: ${topic.latestScore}%`
                  "
                >
                  {{
                    topic.latestScore === null
                      ? '—'
                      : `${topic.latestScore}%`
                  }}
                </span>

                <span class="topic-chevron" aria-hidden="true">
                  {{ expandedTopic === topic.id ? '−' : '+' }}
                </span>
              </button>

              <!-- DETAILS ONLY APPEAR WHEN EXPANDED -->
              <div
                v-if="expandedTopic === topic.id"
                :id="`topic-details-${topic.id}`"
                class="topic-details"
              >
                <div class="topic-detail-heading">
                  <div>
                    <h3>
                      {{
                        topic.attempts.length
                          ? 'Your quiz attempts'
                          : 'Ready to explore?'
                      }}
                    </h3>

                    <p v-if="topic.improvement !== null">
                      {{
                        topic.improvement > 0
                          ? '↑'
                          : topic.improvement < 0
                            ? '↓'
                            : '→'
                      }}
                      {{ Math.abs(topic.improvement) }}
                      percentage points since your previous quiz
                    </p>

                    <p v-else-if="topic.attempts.length">
                      Your first result is in. Keep going!
                    </p>

                    <p v-else>
                      Choose this topic in the Quiz Arena to get started.
                    </p>
                  </div>

                  <RouterLink to="/quiz" class="button button-secondary">
                    Open Quiz Arena →
                  </RouterLink>
                </div>

                <ul
                  v-if="topic.attempts.length"
                  class="attempt-list"
                >
                  <li
                    v-for="attempt in topic.attempts"
                    :key="attempt.id"
                    class="attempt-row"
                  >
                    <div class="attempt-result">
                      <strong>{{ quizPercentage(attempt) }}%</strong>

                      <span>
                        {{ attempt.score }}/{{ attempt.total_questions }}
                        correct
                      </span>
                    </div>

                    <span class="attempt-date">
                      {{ formatDate(attempt.completed_at) }}
                    </span>

                    <span class="attempt-xp">
                      {{ signed(attempt.xp_change) }} XP
                    </span>
                  </li>
                </ul>
              </div>
            </article>
          </div>
        </section>

        <!-- LEARNING ACTIVITY -->
        <section
          class="dashboard-panel activity-panel"
          aria-labelledby="activity-title"
        >
          <div class="panel-heading">
            <div>
              <span class="eyebrow">BUILD YOUR STUDY HABIT</span>
              <h2 id="activity-title">🎯 Learning Activity</h2>
              <p>Time spent in completed study sessions.</p>
            </div>

            <select
              v-model="selectedPeriod"
              class="period-select"
              aria-label="Select activity date range"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </div>

          <template v-if="hasActivityInPeriod">
            <div class="activity-total">
              <strong>{{ minutesInPeriod }}</strong>
              <span>minutes in the last {{ selectedPeriod }} days</span>
            </div>

            <div class="activity-chart">
              <VueApexCharts
                type="area"
                height="260"
                width="100%"
                :options="chartOptions"
                :series="chartSeries"
              />
            </div>

            <p class="chart-note">
              Session duration includes breaks.
            </p>
          </template>

          <!-- FRIENDLIER EMPTY STATE -->
          <div v-else class="activity-empty">
            <span class="empty-icon" aria-hidden="true">🌱</span>

            <h3>
              {{
                user.total_study_sessions === 0
                  ? 'Your learning journey starts here'
                  : 'Ready for your next study session?'
              }}
            </h3>

            <p>
              {{
                user.total_study_sessions === 0
                  ? 'Complete your first study session to start growing your progress.'
                  : `No completed study time in the last ${selectedPeriod} days. Your next session will appear here.`
              }}
            </p>

            <RouterLink
              to="/study-decks"
              class="button button-primary"
            >
              Explore study decks →
            </RouterLink>

            <small>Earn 15 XP for each completed study session.</small>
          </div>
        </section>
      </div>

      <!-- FULL-WIDTH HISTORY -->
      <section
        class="dashboard-panel history-panel"
        aria-labelledby="history-title"
      >
        <div class="panel-heading">
          <div>
            <span class="eyebrow">EVERY STEP COUNTS</span>
            <h2 id="history-title">📋 Recent Progress</h2>
            <p>Your completed study sessions, quizzes and boss battles.</p>
          </div>

          <button
            v-if="recentProgress.length > 5"
            type="button"
            class="button button-secondary"
            :aria-expanded="showAllProgress"
            aria-controls="progress-history"
            @click="showAllProgress = !showAllProgress"
          >
            {{ showAllProgress ? 'Show recent 5' : 'View all activity →' }}
          </button>
        </div>

        <div
          v-if="visibleProgress.length"
          id="progress-history"
          class="history-table-wrap"
          tabindex="0"
          aria-label="Recent activity table, scrollable"
        >
          <table class="progress-table">
            <thead>
              <tr>
                <th scope="col">Topic / Activity</th>
                <th scope="col">Type</th>
                <th scope="col">Score</th>
                <th scope="col">XP</th>
                <th scope="col">Completed</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="item in visibleProgress"
                :key="item.id"
              >
                <td>
                  <span class="history-topic">
                    <span aria-hidden="true">{{ item.icon }}</span>
                    {{ item.title }}
                  </span>
                </td>

                <td>
                  <span class="type-badge" :class="item.badge">
                    {{ item.type }}
                  </span>
                </td>

                <td>
                  {{ item.score === null ? '—' : `${item.score}%` }}
                </td>

                <td
                  class="history-xp"
                  :class="{ 'xp-negative': item.xp < 0 }"
                >
                  {{ signed(item.xp) }}
                </td>

                <td class="history-date">
                  {{ formatDate(item.completed_at) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="history-empty">
          <span aria-hidden="true">📖</span>

          <div>
            <h3>Your first achievement is waiting!</h3>
            <p>
              Finish a study session or quiz and see it recorded here.
            </p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
/* ======================================================
   BASE
====================================================== */

.trainer-dashboard,
.trainer-dashboard * {
  box-sizing: border-box;
}

.trainer-dashboard {
  min-height: 100dvh;
  width: 100%;
  padding: 24px;

  background: #fcfaf3;
  color: #172c50;
  font-family: 'Fredoka', sans-serif;
}

.dashboard-shell {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}

button,
select {
  font-family: inherit;
}

button,
a,
select,
summary {
  -webkit-tap-highlight-color: transparent;
}

button:focus-visible,
a:focus-visible,
select:focus-visible,
summary:focus-visible,
.history-table-wrap:focus-visible {
  outline: 3px solid #416d9d;
  outline-offset: 3px;
}

.eyebrow {
  display: block;
  margin-bottom: 7px;

  color: #7a806e;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.3px;
}

/* ======================================================
   HEADER
====================================================== */

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;

  padding: 20px 26px;

  border: 1px solid #e9edcf;
  border-radius: 22px;
  background: linear-gradient(
    110deg,
    #fff9e8 25%,
    #edf7e5 100%
  );
}

.header-main {
  min-width: 0;
}

.back-button {
  position: static;
  display: inline-flex;
  align-items: center;

  margin-bottom: 14px;
  padding: 5px 10px;

  border: 1px solid #e4cf87;
  border-radius: 8px;

  background: #fff4c9;
  color: #715823;
  font-size: 11px;
  text-decoration: none;
}

.welcome-copy h1 {
  margin: 0;
  color: #142c55;
  font-size: clamp(23px, 2.3vw, 32px);
  font-weight: 750;
}

.welcome-message {
  margin: 6px 0 0;
  color: #61718a;
  font-size: 13px;
}

.last-login {
  margin: 6px 0 0;
  color: #7b8492;
  font-size: 11px;
}


/* ======================================================
   DEMO CONTROLS
====================================================== */

.demo-panel {
  margin: 10px 0 18px;
  color: #6c7685;
  font-size: 11px;
}

.demo-panel summary {
  display: list-item;
  width: fit-content;
  padding: 5px 2px;
  cursor: pointer;
}

.demo-label {
  margin-left: 10px;
  color: #9298a0;
  font-size: 10px;
}

.demo-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;

  margin-top: 8px;
  padding: 12px 14px;

  border: 1px dashed #ddd7c3;
  border-radius: 12px;
  background: #fffdf6;
}

.demo-controls select {
  min-height: 34px;
  padding: 6px 10px;

  border: 1px solid #ddd6bb;
  border-radius: 8px;
  background: white;
  color: #263955;
  font-size: 12px;
}

.demo-controls small {
  color: #7c8591;
}

.demo-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ======================================================
   STATISTICS
====================================================== */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 22px;
}

.stat-card {
  min-width: 0;
  padding: 16px 18px;

  border: 1px solid #ffffff;
  border-radius: 17px;
  box-shadow: 0 3px 12px #23335406;
}

.stat-yellow {
  background: #fff5d8;
}

.stat-blue {
  background: #eaf5fc;
}

.stat-pink {
  background: #fff0ef;
}

.stat-purple {
  background: #f1edfc;
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 5px;
}

.stat-label {
  color: #526078;
  font-size: 12px;
  font-weight: 500;
}

.stat-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;

  border-radius: 10px;
  background: #ffffff80;
  font-size: 19px;
}

.stat-value {
  display: block;
  color: #172c50;
  font-size: 29px;
  font-weight: 750;
  line-height: 1.2;
}

.stat-description {
  margin: 7px 0 0;
  color: #6e7888;
  font-size: 11px;
  line-height: 1.5;
}

/* ======================================================
   MAIN PANELS
====================================================== */

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 22px;
  margin-bottom: 22px;
}
/* Desktop: the chart determines the row height */
@media (min-width: 1200px) {
  .main-grid {
    align-items: stretch;
  }

  .topic-panel {
    /* Stops the topic content from making the row taller */
    contain: size;
    min-height: 0;

    display: flex;
    flex-direction: column;
    overflow-y: auto;

    scrollbar-width: thin;
    scrollbar-color: #ddd7c7 transparent;
  }

  .topic-panel > * {
    flex-shrink: 0;
  }
}

.dashboard-panel {
  min-width: 0;
  padding: 24px;

  border: 1px solid #eae7db;
  border-radius: 20px;
  background: white;
  box-shadow: 0 4px 20px #23335404;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 20px;
}

.panel-heading > div {
  min-width: 0;
}

.panel-heading h2 {
  margin: 0;
  color: #172c50;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
}

.panel-heading p {
  margin: 7px 0 0;
  color: #7b8494;
  font-size: 12px;
  line-height: 1.5;
}

.level-badge {
  flex-shrink: 0;
  padding: 6px 9px;

  border-radius: 8px;
  background: #f2f5ed;
  color: #63734c;
  font-size: 11px;
  white-space: nowrap;
}

/* ======================================================
   TOPIC COMPLETION SUMMARY
====================================================== */

.completion-summary {
  margin-bottom: 18px;
  padding: 14px 16px;

  border: 1px solid #edf0e4;
  border-radius: 12px;
  background: #f8faf3;
}

.completion-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.completion-heading > div {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
}

.completion-heading strong {
  font-size: 22px;
  font-weight: 700;
  color: #315e42;
}

.completion-heading span {
  color: #697760;
  font-size: 12px;
}

.completion-percentage {
  font-weight: 600;
}

.completion-track {
  height: 7px;
  border-radius: 10px;
  background: #e5e9df;
  overflow: hidden;
}

.completion-fill {
  height: 100%;
  border-radius: inherit;
  background: #78ba83;
}

/* ======================================================
   COMPACT EXPANDABLE TOPICS
====================================================== */

.topic-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.topic-item {
  border: 1px solid #e5e8ee;
  border-radius: 12px;
  background: #f6f7fa;
}

.topic-green {
  border-color: #dcecdf;
  background: #f4faf4;
}

.topic-yellow {
  border-color: #eee5cb;
  background: #fffbf1;
}

.topic-toggle {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto 45px 14px;
  align-items: center;
  gap: 10px;

  width: 100%;
  min-height: 66px;
  padding: 12px;

  border: 0;
  border-radius: inherit;
  background: transparent;
  color: #263955;
  text-align: left;
  cursor: pointer;
}

.topic-toggle:hover {
  background: #ffffff70;
}

.topic-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;

  border-radius: 10px;
  background: #ffffffa6;
  font-size: 21px;
}

.topic-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.topic-status {
  padding: 4px 7px;
  border-radius: 6px;

  background: #e9ecf1;
  color: #747e8c;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
}

.topic-green .topic-status {
  background: #e2f1e5;
  color: #4b7b55;
}

.topic-yellow .topic-status {
  background: #fff0c5;
  color: #8b712b;
}

.topic-score {
  font-size: 14px;
  font-weight: 650;
  text-align: right;
}

.topic-grey .topic-score {
  color: #929aa6;
}

.topic-chevron {
  color: #8c96a6;
  font-size: 18px;
  text-align: center;
}

.topic-details {
  padding: 0 14px 14px;
}

.topic-detail-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  padding: 14px 0;
  border-top: 1px solid #dfe5de;
}

.topic-detail-heading h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
}

.topic-detail-heading p {
  margin: 5px 0 0;
  color: #747e8b;
  font-size: 11px;
  line-height: 1.5;
}

.attempt-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.attempt-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 14px;

  padding: 10px 0;
  border-top: 1px solid #e1e6df;
  font-size: 11px;
}

.attempt-result {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.attempt-result > span,
.attempt-date {
  color: #788290;
}

.attempt-xp {
  color: #536a51;
  font-weight: 500;
  white-space: nowrap;
}

/* ======================================================
   NEXT CHALLENGE
====================================================== */

.next-challenge {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

  margin-top: 5px;
  margin-bottom: 15px;
  padding: 16px;

  border: 1px solid #f0dfa5;
  border-radius: 13px;
  background: #fff8df;
}

.challenge-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;

  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: #ffedaf;
  font-size: 22px;
}

.challenge-copy {
  flex: 1 1 170px;
  min-width: 0;
}

.challenge-copy .eyebrow {
  margin-bottom: 5px;
  color: #9a8247;
  font-size: 9px;
}

.challenge-copy h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
}

.challenge-copy p {
  margin: 5px 0 0;
  color: #847650;
  font-size: 11px;
  line-height: 1.5;
}

/* ======================================================
   ACTIVITY CHART / EMPTY STATE
====================================================== */

.period-select {
  flex-shrink: 0;
  padding: 7px 9px;

  border: 1px solid #e1e5ed;
  border-radius: 8px;
  background: white;
  color: #45546d;
  font-size: 11px;
}

.activity-total {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}

.activity-total strong {
  color: #263955;
  font-size: 30px;
  font-weight: 650;
}

.activity-total span {
  color: #8590a0;
  font-size: 11px;
}

.activity-chart {
  min-width: 0;
  width: 100%;
  height: 260px;
}

.chart-note {
  margin: 8px 0 0;
  color: #9299a5;
  font-size: 10px;
}

.activity-empty {
  display: flex;
  flex-direction: column;
  align-items: center;

  padding: 30px 16px 24px;
  text-align: center;
}

.empty-icon {
  display: grid;
  place-items: center;

  width: 70px;
  height: 70px;
  margin-bottom: 18px;

  border-radius: 23px;
  background: #f0f6e9;
  font-size: 36px;
}

.activity-empty h3 {
  max-width: 270px;
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  line-height: 1.4;
}

.activity-empty p {
  max-width: 290px;
  margin: 11px 0 20px;
  color: #7e8998;
  font-size: 12px;
  line-height: 1.7;
}

.activity-empty small {
  margin-top: 13px;
  color: #90998a;
  font-size: 10px;
}

/* ======================================================
   BUTTONS
====================================================== */

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-height: 36px;
  padding: 8px 12px;

  border: 1px solid transparent;
  border-radius: 9px;

  font-family: inherit;
  font-size: 11px;
  font-weight: 550;
  text-decoration: none;
  text-align: center;
  cursor: pointer;
}

.button-primary {
  border-color: #e6c653;
  background: #ffdf73;
  color: #634f1f;
}

.button-primary:hover {
  background: #ffd550;
  color: #634f1f;
}

.button-secondary {
  border-color: #dde3ec;
  background: white;
  color: #54657f;
}

.button-secondary:hover {
  background: #f5f7fa;
  color: #314b70;
}

/* ======================================================
   FULL-WIDTH RECENT PROGRESS
====================================================== */

.history-panel {
  margin-bottom: 12px;
}

.history-table-wrap {
  max-height: 420px;
  overflow: auto;

  scrollbar-width: thin;
  scrollbar-color: #ddd7c7 transparent;
}

.progress-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.progress-table th {
  position: sticky;
  top: 0;
  z-index: 1;

  padding: 12px 14px;
  background: #f6f7f9;
  color: #8590a0;

  font-size: 10px;
  font-weight: 550;
  text-align: left;
  white-space: nowrap;
}

.progress-table td {
  padding: 15px 14px;
  border-bottom: 1px solid #eef0f4;
  vertical-align: middle;
  white-space: nowrap;
}

.progress-table tbody tr:last-child td {
  border-bottom: 0;
}

.progress-table tbody tr:hover {
  background: #fffdf5;
}

.history-topic {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.history-topic > span {
  font-size: 18px;
}

.type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 500;
}

.type-badge.study {
  background: #fff1c2;
  color: #8a742d;
}

.type-badge.quiz {
  background: #f2eafb;
  color: #8965a7;
}

.history-xp {
  color: #5e8d63;
  font-weight: 550;
}

.history-xp.xp-negative {
  color: #ad6a62;
}

.history-date {
  color: #87909c;
  font-size: 11px;
}

.history-empty {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 8px;
}

.history-empty > span {
  display: grid;
  place-items: center;
  flex-shrink: 0;

  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: #fff7dd;
  font-size: 27px;
}

.history-empty h3 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
}

.history-empty p,
.simple-empty {
  margin: 0;
  color: #87909c;
  font-size: 12px;
  line-height: 1.6;
}

/* ======================================================
   RESPONSIVE LAYOUT
====================================================== */

@media (max-width: 1199px) {
  .trainer-dashboard {
    padding: 18px;
  }

  .main-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .activity-empty {
    padding: 24px 16px;
  }
}

@media (max-width: 800px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .dashboard-panel {
    padding: 20px;
  }
}

@media (max-width: 600px) {
  .trainer-dashboard {
    padding: 12px;
  }

  .dashboard-header {
    padding: 18px;
    border-radius: 17px;
  }

  .welcome-copy .eyebrow {
    font-size: 9px;
  }

  .stat-card {
    padding: 14px;
  }

  .stat-value {
    font-size: 25px;
  }

  .stat-description {
    font-size: 10px;
  }

  .dashboard-panel {
    padding: 16px;
    border-radius: 16px;
  }

  .panel-heading {
    flex-wrap: wrap;
    gap: 10px;
  }

  .panel-heading h2 {
    font-size: 18px;
  }

  .panel-heading p {
    font-size: 11px;
  }

  .level-badge {
    font-size: 10px;
  }

  .topic-toggle {
    grid-template-columns: 30px minmax(0, 1fr) 42px 12px;
    gap: 8px;
    padding: 12px 10px;
  }

  .topic-icon {
    grid-column: 1;
    grid-row: 1 / 3;
    width: 30px;
    height: 30px;
    font-size: 19px;
  }

  .topic-name {
    grid-column: 2;
    grid-row: 1;
    font-size: 12px;
  }

  .topic-status {
    grid-column: 2;
    grid-row: 2;
    justify-self: start;
    font-size: 9px;
  }

  .topic-score {
    grid-column: 3;
    grid-row: 1 / 3;
    font-size: 13px;
  }

  .topic-chevron {
    grid-column: 4;
    grid-row: 1 / 3;
  }

  .attempt-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 5px 10px;
  }

  .attempt-date {
    grid-column: 1;
    grid-row: 2;
    font-size: 10px;
  }

  .attempt-xp {
    grid-column: 2;
    grid-row: 1 / 3;
  }

  .next-challenge {
    padding: 14px;
  }

  .next-challenge > .button {
    width: 100%;
  }

  .history-empty {
    align-items: flex-start;
    gap: 12px;
  }

  .history-empty h3 {
    font-size: 14px;
  }

  .history-empty p {
    font-size: 11px;
  }
}

/* Compact town buddy */
.dashboard-buddy {
  flex: 0 1 300px;
  width: 300px;
  min-width: 0;
  color: #26365b;
}

.town-buddy-heading {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #ffde59;
  font-family: 'Luckiest Guy', cursive;
  font-size: 17px;
  text-align: center;
}

/* Pokémon image left, details right */
.dashboard-buddy :deep(.pokemon-buddy) {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  align-items: center;
  gap: 4px 12px;
  padding: 0;
  text-align: left;
}

.dashboard-buddy :deep(.pokemon-buddy > h2) {
  display: none;
}

.dashboard-buddy :deep(.buddy-image-container) {
  grid-column: 1;
  grid-row: 1 / 4;
  width: 90px;
  height: 110px;
}

.dashboard-buddy :deep(.buddy-sprite) {
  width: auto;
  height: 75px;
  max-width: 100%;
}

.dashboard-buddy :deep(.pokemon-buddy > h3) {
  grid-column: 2;
  grid-row: 1;
  align-self: end;
  margin: 0;
  font-size: 18px;
}

.dashboard-buddy :deep(.buddy-level) {
  grid-column: 2;
  grid-row: 2;
  margin: 0;
  font-size: 13px;
}

/* XP label and value above the bar */
.dashboard-buddy :deep(.buddy-xp) {
  grid-column: 2;
  grid-row: 3;
  align-self: start;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  width: 100%;
  max-width: none;
  margin-top: 4px;
}

.dashboard-buddy :deep(.buddy-xp > p) {
  margin: 0;
  font-size: 11px;
  color: #647394;
}

.dashboard-buddy :deep(.buddy-xp > p:first-child) {
  grid-column: 1;
  grid-row: 1;
}

.dashboard-buddy :deep(.buddy-xp > p:last-child) {
  grid-column: 2;
  grid-row: 1;
  text-align: right;
  white-space: nowrap;
}

.dashboard-buddy :deep(.buddy-xp .xp-track) {
  grid-column: 1 / -1;
  grid-row: 2;
  height: 9px;
  margin: 0;
  border-radius: 999px;
  background: #e5e9df;
}

.dashboard-buddy :deep(.buddy-xp .xp-fill) {
  background: #78c98b;
  border-radius: inherit;
}

/* Keep animation feedback below the details */
.dashboard-buddy :deep(.buddy-message),
.dashboard-buddy :deep(.buddy-error),
.dashboard-buddy :deep(.buddy-status) {
  grid-column: 1 / -1;
  font-size: 11px;
  text-align: center;
}

@media (max-width: 700px) {
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard-buddy {
    flex: none;
    width: 100%;
    max-width: 300px;
    align-self: center;
  }
}
</style>
