import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/HomeView2.vue'
import Pokebuddy from '../components/pokebuddy/PokeBuddy.vue'
import Landing from '../components/landing/landing.vue'
import Landinginfo from '../components/landing-info/landing-info.vue'
import Characterdesign from '../components/characterdesign/characterdesign.vue'

import RegisterView from '../views/RegisterView.vue'
import LoginView from '../views/LoginView.vue'
import AccountView from '../views/AccountView.vue'
import TimerView from '../views/timerView.vue'
import RewardsView from '../views/rewardsView2.vue'
import QuizView from '../views/quizView.vue'
import StudyView from '../views/studyView.vue'
import StarterView from '../views/starterSelectionView.vue'
import CollectionView from '../views/collectionView.vue'

import AdminHome from '@/views/admin/AdminHome.vue'
import AdminUsers from '@/views/admin/AdminUsers.vue'
import AdminEducation from '@/views/admin/AdminEducation.vue'
import AdminQuiz from '@/views/admin/AdminQuiz.vue'
import AdminAddQuiz from '@/views/admin/AdminAddQuiz.vue'
import AdminQuizDetails from '@/views/admin/AdminQuizDetails.vue'
import AdminAddDeck from '@/views/admin/AdminAddDeck.vue'
import AdminEducationDetails from '@/views/admin/AdminEducationDetails.vue'

import { getSupabase } from '../lib/supabase'
import { sleepRouteGuard } from '../utils/buddySleep'
import { selectionRoutes } from './selectionRoutes'
import { getOnboardingStatus } from '../services/onboardingService'

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
        meta: { requiresAuth: true },
      },
      {
        path: '/tutorialguide',
        name: 'tutorialguide',
        redirect: { name: 'tutorial' },
        meta: { requiresAuth: true },
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
        path: '/collection',
        name: 'collection',
        component: CollectionView,
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

      // Admin routes
      {
        path: '/admin-home',
        name: 'adminHome',
        component: AdminHome,
        meta: { requiresAuth: true },
      },
      {
        path: '/admin-users',
        name: 'adminUsers',
        component: AdminUsers,
        meta: { requiresAuth: true },
      },
      {
        path: '/admin-education',
        name: 'adminEducation',
        component: AdminEducation,
        meta: { requiresAuth: true },
      },
      {
        path: '/admin-quiz',
        name: 'adminQuiz',
        component: AdminQuiz,
        meta: { requiresAuth: true },
      },
      {
        path: '/admin-addquiz',
        name: 'adminAddQuiz',
        component: AdminAddQuiz,
        meta: { requiresAuth: true },
      },
      {
        path: '/admin-quiz/:id',
        name: 'adminQuizDetails',
        component: AdminQuizDetails,
        meta: { requiresAuth: true },
      },
      {
        path: '/admin-adddeck',
        name: 'adminAddDeck',
        component: AdminAddDeck,
        meta: { requiresAuth: true },
      },
      {
        path: '/admin-education/:id',
        name: 'adminEducationDetails',
        component: AdminEducationDetails,
        meta: { requiresAuth: true },
      },
    ],
  })

  router.beforeEach(sleepRouteGuard)

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

    if (!to.meta.requiresAuth) return true

    try {
      const { data, error } = await getSupabase().auth.getSession()

      if (!error && data.session) {
        // Setup pages remain reachable for retry/recovery. Other protected pages
        // cannot bypass the persisted first-time journey by entering a URL.
        if (['landing', 'account', 'characterdesign', 'starter'].includes(to.name)) return true
        try {
          const setup = await getOnboardingStatus()
          if (setup.onboarding_complete) return true
        } catch { /* Landing presents a retry instead of inventing completion. */ }
        return { name: 'landing' }
      }
    } catch {
      // Protected pages require a valid session.
    }

    return { name: 'login' }
  })

  return router
}

export default createAppRouter()
