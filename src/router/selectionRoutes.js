import QuizView from '../views/quizView.vue'

// New selection screens share the existing authenticated learning/preview engines.
export const selectionRoutes = [
  {
    path: '/learn',
    name: 'learn',
    redirect: (to) => ({ name: 'study-decks', query: { ...to.query, mode: 'learn' } }),
    meta: { requiresAuth: true },
  },
  {
    path: '/subjects',
    name: 'selection-subjects',
    component: () => import('../views/SubjectsView.vue'),
  },
  {
    path: '/subjects/topics',
    alias: '/subjects/science/topics',
    name: 'selection-topics',
    component: () => import('../views/TopicsView.vue'),
  },
  {
    path: '/study-mode',
    name: 'study-mode',
    component: () => import('../views/StudyModeView.vue'),
  },
  { path: '/quiz-battle', name: 'quiz-battle', component: QuizView },
]
