import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Bootstrap loads after the app/router so view styles keep their existing
// cascade position relative to Bootstrap.
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// Global app styles load after Bootstrap so its reboot does not reset the body font.
import './assets/main.css'
import './assets/studydex-theme.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
