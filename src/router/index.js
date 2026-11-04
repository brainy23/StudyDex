import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/HomeView2.vue'
import Pokebuddy from '../components/pokebuddy/PokeBuddy.vue'
import Landing from '../components/landing/landing.vue'
import Landinginfo from '../components/landing-info/landing-info.vue'
import Characterdesign from '../components/characterdesign/characterdesign.vue'
import Tutorialguide from '../components/tutorialguide/tutorialguide.vue'

import RegisterView from '../views/RegisterView.vue'
import LoginView from '../views/LoginView.vue'
import AccountView from '../views/AccountView.vue'
import TimerView from '../views/timerView.vue'
import RewardsView from '../views/rewardsView2.vue'
import QuizView from '../views/quizView.vue'
import StudyView from '../views/studyView.vue'
import StarterView from '../views/starterSelectionView.vue'

import { getSupabase } from '../lib/supabase'
import { selectionRoutes } from './selectionRoutes'

export function createAppRouter(
  history = createWebHistory(import.meta.env.BASE_URL),
) {
  const protectedSelectionRoutes = selectionRoutes.map(route => ({
    ...route,
    meta: {
      ...route.meta,
      requiresAuth: true,
    },
  }))

  const hasStarterRoute = selectionRoutes.some(
    route => route.path === '/starter' || route.name === 'starter',
  )

  const router = createRouter({
    history,

    routes: [
      ...protectedSelectionRoutes,

      {
        path: '/',
        redirect: { name: 'landing-info' },
      },
      {
        path: '/register',
        alias: '/signup',
        name: 'register',
        component: RegisterView,
      },
      {
        path: '/login',
        name: 'login',
        component: LoginView,
      },
      {
        path: '/landing-info',
        name: 'landing-info',
        component: Landinginfo,
      },
      {
        path: '/landing',
        name: 'landing',
        component: Landing,
        meta: { requiresAuth: true },
      },
      {
        path: '/characterdesign',
        name: 'characterdesign',
        component: Characterdesign,
      },
      {
        path: '/tutorialguide',
        name: 'tutorialguide',
        component: Tutorialguide,
      },
      {
        path: '/home',
        name: 'home',
        component: HomeView,
        meta: { requiresAuth: true },
      },
      {
        path: '/account',
        name: 'account',
        component: AccountView,
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
        meta: {
          requiresAuth: true,
          tutorial: true,
        },
      },

      ...(!hasStarterRoute
        ? [
            {
              path: '/starter',
              name: 'starter',
              component: StarterView,
              meta: { requiresAuth: true },
            },
          ]
        : []),
    ],
  })

  router.beforeEach(async to => {
    // Support older study-deck links to the learning page.
    if (to.name === 'study-decks' && to.query.mode === 'learn') {
      const query = { ...to.query }
      delete query.mode

      return {
        name: 'learn',
        replace: true,
        query,
      }
    }

    // Support older study-deck links to quizzes and boss battles.
    if (
      to.name === 'study-decks' &&
      ['quiz', 'boss_battle'].includes(to.query.mode)
    ) {
      return {
        name: 'quiz',
        replace: true,
        query: {
          ...(typeof to.query.subject === 'string'
            ? { subject: to.query.subject }
            : {}),
          ...(typeof to.query.topic === 'string'
            ? { topic: to.query.topic }
            : {}),
          ...(to.query.mode === 'boss_battle' || to.query.battle === 'boss'
            ? { battle: 'boss' }
            : {}),
        },
      }
    }

    // Optional authentication bypass for local development only.
    if (
      import.meta.env.DEV &&
      import.meta.env.VITE_SKIP_AUTH === 'true'
    ) {
      return true
    }

    if (!to.meta.requiresAuth) return true

    try {
      const { data, error } = await getSupabase().auth.getSession()

      if (!error && data.session) return true
    } catch {
      // Protected pages require a valid session.
    }

    return { name: 'login' }
  })

  return router
}

export default createAppRouter()
