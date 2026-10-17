import { createRouter, createWebHistory } from 'vue-router'

import HomeView2 from '@/views/HomeView2.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
   
    {
      path: '/home',
      name: 'home',
      component: HomeView2,
    },

  ],
})

export default router
