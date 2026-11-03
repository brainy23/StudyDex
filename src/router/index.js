import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView2.vue'
import Landing from '../components/landing/landing.vue'
import Landinginfo from '../components/landing-info/landing-info.vue'
import RegisterView from '../views/RegisterView.vue'
import LoginView from '../views/LoginView.vue'
import AccountView from '../views/AccountView.vue'
import { getSupabase } from '../lib/supabase'
import TimerView from '../views/timerView.vue'
import RewardsView from '../views/rewardsView2.vue'
import QuizView from '../views/quizView.vue'
import StudyView from '../views/studyView.vue'
import { requestedTopicId } from '../utils/studyNavigation'
import { selectionRoutes } from './selectionRoutes'

export function createAppRouter(history = createWebHistory(import.meta.env.BASE_URL)) {
  const router = createRouter({
    history,

    routes: [
      ...selectionRoutes.map(route => ({ ...route, meta: { ...route.meta, requiresAuth: true } })),
      {
        path: '/account',
        name: 'account',
        component: AccountView,
        meta: { requiresAuth: true },
      },
      {
        path: '/register',
        alias: '/signup',
        name: 'register',
        component: RegisterView,
      },
      {
        path: '/',
        redirect: { name: 'landing-info' },
      },
      {
        path: '/login',
        name: 'login',
        component: LoginView,
      },
      {
        path: '/home',
        name: 'home',
        component: HomeView,
        meta: { requiresAuth: true },
      },
      {
        path: '/trainer',
        name: 'trainer',
        component: () => import('../views/TrainerView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: '/dashboard',
        name: 'studentdashboard',
        component: () => import('../views/dashboardView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: '/pokebuddy',
        name: 'pokebuddy',
        redirect: { name: 'trainer' },
        meta: { requiresAuth: true },
      },
      {
        path: '/landing',
        name: 'landing',
        component: Landing,
        meta: { requiresAuth: true },
      },
      {
        path: '/landing-info',
        name: 'landing-info',
        component: Landinginfo,
      },
      {
        path: '/timer',
        name: 'timer',
        component: TimerView,
      },
      {
        path: '/starter',
        name: 'starter',
        component: () => import('../views/starterSelectionView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: '/rewards',
        alias: '/pokepacks',
        name: 'rewards',
        component: RewardsView,
        meta: { requiresAuth: true },
      },
      {
        path: '/study-decks',
        name: 'study-decks',
        component: StudyView,
        meta: { requiresAuth: true },
      },
      {
        path: '/quiz',
        name: 'quiz',
        component: QuizView,
        meta: { requiresAuth: true },
      },
      {
        path: '/surprise-boss',
        name: 'surprise-boss',
        component: () => import('../views/SurpriseBossView.vue'),
        meta: { requiresAuth: true },
      },
      {
        path: '/tutorial',
        name: 'tutorial',
        component: HomeView,
        meta: { requiresAuth: true, tutorial: true },
      }
    ],
  })

  router.beforeEach(async (to) => {
    // Keep existing Lab assessment bookmarks working in the dedicated Arena route.
    if (to.name === 'study-decks' && ['quiz', 'boss_battle'].includes(to.query.mode)) {
      return {
        name: 'quiz',
        replace: true,
        query: {
          ...(typeof to.query.subject === 'string' ? { subject: to.query.subject } : {}),
          ...(requestedTopicId(to.query) ? { topic_id: requestedTopicId(to.query) } : {}),
          ...(to.query.mode === 'boss_battle' || to.query.battle === 'boss' ? { battle: 'boss' } : {}),
        },
      }
    }
    if (!to.meta.requiresAuth) return true
    try {
      const { data, error } = await getSupabase().auth.getSession()
      if (!error && data.session) return true
    } catch {
      // Keep protected pages behind login if the client is unavailable.
    }
    return { name: 'login' }
  })
  return router
}

export default createAppRouter()
