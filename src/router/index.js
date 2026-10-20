import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import Pokebuddy from '../components/pokebuddy/PokeBuddy.vue'
import TimerView from '../views/timerView.vue'
import RewardsView from '../views/rewardsView.vue'
import QuizView from '@/views/quizView.vue'


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
      path: '/quiz',
      name: 'quiz',
      component: QuizView,
    }

  ],
})

export default router
