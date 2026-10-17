import { createRouter, createWebHistory } from 'vue-router'
import TrainerHomeView from '../views/TrainerView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [

    {
      path: '/trainer',
      name: 'trainer',
      component: TrainerHomeView,
    },
  ],
})

export default router