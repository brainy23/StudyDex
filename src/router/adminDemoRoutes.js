// Local prototypes only: no live admin privileges or Supabase CRUD.
export const adminDemoRoutes = [
  ['/admin-home', 'adminHome', () => import('../views/admin/AdminHome.vue')],
  ['/admin-users', 'adminUsers', () => import('../views/admin/AdminUsers.vue')],
  ['/admin-education', 'adminEducation', () => import('../views/admin/AdminEducation.vue')],
  ['/admin-quiz', 'adminQuiz', () => import('../views/admin/AdminQuiz.vue')],
  ['/admin-addquiz', 'adminAddQuiz', () => import('../views/admin/AdminAddQuiz.vue')],
  ['/admin-quiz/:id', 'adminQuizDetails', () => import('../views/admin/AdminQuizDetails.vue')],
  ['/admin-adddeck', 'adminAddDeck', () => import('../views/admin/AdminAddDeck.vue')],
  ['/admin-education/:id', 'adminEducationDetails', () => import('../views/admin/AdminEducationDetails.vue')],
].map(([path, name, component]) => ({
  path, name, component, meta: { requiresAuth: true, adminDemo: true },
}))
