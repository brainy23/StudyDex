// Add these route records to your existing router. Do not replace index.js.
export const selectionRoutes = [
  { path:'/subjects', name:'selection-subjects', component:() => import('../views/SubjectsView.vue') },
  { path:'/subjects/science/topics', name:'selection-topics', component:() => import('../views/TopicsView.vue') },
  { path:'/study-mode', name:'study-mode', component:() => import('../views/StudyModeView.vue') },
  { path:'/quiz-battle', name:'quiz-battle', component:() => import('../views/quizView.vue') },
]
