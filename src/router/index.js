import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AdminHome from '@/views/admin/AdminHome.vue'
import AdminUsers from '@/views/admin/AdminUsers.vue'
import AdminEducation from '@/views/admin/AdminEducation.vue'
import AdminQuiz from '@/views/admin/AdminQuiz.vue'
import AdminAddQuiz from '@/views/admin/AdminAddQuiz.vue'
import AdminAddDeck from '@/views/admin/AdminAddDeck.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/admin-home',
      name: 'adminHome',
      component: AdminHome
    },
      {
      path: '/admin-users',
      name: 'adminUsers',
      component: AdminUsers
    }
    ,
      {
      path: '/admin-education',
      name: 'adminEducation',
      component: AdminEducation
    },
     {
      path: '/admin-quiz',
      name: 'adminQuiz',
      component: AdminQuiz
    },
    {
      path: '/admin-addquiz',
      name: 'adminAddQuiz',
      component: AdminAddQuiz
    },
    {
      path: '/admin-adddeck',
      name: 'adminAddDeck',
      component: AdminAddDeck
    }

  ],
})

export default router
