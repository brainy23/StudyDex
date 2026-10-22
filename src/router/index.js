import { createRouter, createWebHistory } from 'vue-router'

import HomeView2 from '@/views/HomeView2.vue'
import TrainerHomeView from '@/views/TrainerView.vue'
import QuizView from '@/views/quizView.vue'
import surpirseBossBattle from '@/views/surpirseBossBattle.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      redirect: '/home',
    },
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
      path: '/quiz',
      name: 'quiz',
      component: QuizView,
    },
    {
      path: '/surprise-battle',
      name: 'surprise-battle',
      component: surpirseBossBattle,
    },
  ],
})

export default router