import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Pokebuddy from '../components/pokebuddy/PokeBuddy.vue'
import Landing from '../components/landing/landing.vue'
import Landinginfo from '../components/landing-info/landing-info.vue'
import Characterdesign from '../components/characterdesign/characterdesign.vue'
import 'bootstrap/dist/css/bootstrap.min.css'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
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
    },
    {
      path: '/landing-info',
      name: 'landing-info',
      component: Landinginfo,
    },
    {
      path: '/characterdesign',
      name: 'characterdesign',
      component: Characterdesign,
    },
  ],
})

export default router
