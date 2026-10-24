import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView2.vue'
import Pokebuddy from '../components/pokebuddy/PokeBuddy.vue'
import Landing from '../components/landing/landing.vue'
import Landinginfo from '../components/landing-info/landing-info.vue'
import RegisterView from '../views/RegisterView.vue'
import LoginView from '../views/LoginView.vue'
import AccountView from '../views/AccountView.vue'
import { getSupabase } from '../lib/supabase'
import TimerView from '../views/timerView.vue'
import RewardsView from '../views/rewardsView.vue'
import QuizView from '../views/quizView.vue'
import StudyView from '../views/studyView.vue'

export function createAppRouter(history = createWebHistory(import.meta.env.BASE_URL)) {
  const router = createRouter({
    history,

    routes: [
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
        component: Pokebuddy,
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
        path: '/rewards',
        name: 'rewards',
        component: RewardsView,
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
          ...(typeof to.query.topic === 'string' ? { topic: to.query.topic } : {}),
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
