
<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <aside class="admin-sidebar">

    <!-- Admin Logo -->
    <div class="logo-container">
      <img
        src="/assets/admin_logo.png"
        alt="StudyDex Admin"
        class="admin-logo"
      />
    </div>

    <!-- Navigation Links -->
    <nav class="admin-nav">

      <RouterLink
        to="/admin-home"
        class="nav-item"
        :class="{ active: route.path === '/admin-home' }"
      >
        Dashboard
      </RouterLink>

      <RouterLink
        to="/admin-users"
        class="nav-item"
        :class="{ active: route.path === '/admin-users' }"
      >
        Manage Students
      </RouterLink>

      <RouterLink
        to="/admin-education"
        class="nav-item"
        :class="{ active: route.path === '/admin-education' }"
      >
        Manage Study Decks
      </RouterLink>

       <RouterLink
        to="/admin-quiz"
        class="nav-item"
        :class="{ active: route.path === '/admin-quiz' }"
      >
        Manage Quizzes
      </RouterLink>
      <RouterLink
        to="/admin-rewards"
        class="nav-item"
        :class="{ active: route.path === '/admin-rewards' }"
      >
        Manage Rewards
      </RouterLink>
      <RouterLink
        to="/admin-feedback"
        class="nav-item"
        :class="{ active: route.path === '/admin-feedback' }"
      >
        Reports and Feedback
      </RouterLink>

    </nav>

  </aside>
</template>

<style scoped>
.admin-sidebar {
  width: 210px;
  min-width: 210px;
  min-height: 100vh;
  background-color: #ffd51a;

  display: flex;
  flex-direction: column;
  align-items: center;

  padding: 35px 15px;
}

/* Logo */
.logo-container {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
}

.admin-logo {
  width: 155px;
  height: auto;
  object-fit: contain;
}

/* Navigation */
.admin-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 25px;
  width: 100%;
}

.nav-item {
  text-decoration: none;
  color: #30304b;
  font-size: 15px;
  font-weight: bold;
  text-align: left;

  width: 100%;
  padding: 5px 10px;
  border-radius: 10px;

  transition: background-color 0.2s ease;
}

/* Hover effect */
.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.35);
  color: #30304b;
}

/* Active page */
.nav-item.active {
  background-color: rgba(255, 255, 255, 0.5);
  color: #30304b;
}
</style>
