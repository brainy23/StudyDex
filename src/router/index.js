import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AdminHome from '@/components/admin/AdminHome.vue'
import AdminUsers from '@/components/admin/AdminUsers.vue'
import AdminEducation from '@/components/admin/AdminEducation.vue'

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
    }

  ],
})

export default router
