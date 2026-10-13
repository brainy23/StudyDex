import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Pokebuddy from '@/components/pokebuddy/pokebuddy.vue'


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

  ],
})

export default router
