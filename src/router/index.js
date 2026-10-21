import { createRouter, createWebHistory } from 'vue-router'

import HomeView2 from '@/views/HomeView2.vue'

import TrainerHomeView from '../views/TrainerView.vue'
import DashboardView from '@/views/dashboardView.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [

    {
      path: '/home',
      name: 'home',
      component: HomeView2,
    },

    {
      path: '/trainer',
      name: 'trainer',
      component: TrainerHomeView,
    },
    {
      path: '/dashboard',
      name: 'studentdashboard',
      component: DashboardView,
    },
  ],
})

export default router
