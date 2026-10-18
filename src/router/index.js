import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Pokebuddy from '../components/pokebuddy/PokeBuddy.vue'
import Landing from '../components/landing/landing.vue'
import Landinginfo from '../components/landing-info/landing-info.vue'
import RegisterView from '../views/RegisterView.vue'
import LoginView from '../views/LoginView.vue'
import AccountView from '../views/AccountView.vue'
import { getSupabase } from '../lib/supabase'

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
    ],
  })

  router.beforeEach(async (to) => {
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
