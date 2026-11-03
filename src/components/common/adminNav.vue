
<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <aside class="admin-sidebar">

    <p class="demo-notice" role="note"><strong>Local demo only</strong><br />Sample data. Nothing here changes students or lessons in Supabase.</p>
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

      <!-- Logout Button -->
      <RouterLink to="/home" class="nav-item logout-btn">Back to Town</RouterLink>



    </nav>

  </aside>
</template>

<style scoped>
.demo-notice { padding: 12px; background: #fff; color: #17324d; font-size: 14px; border-radius: 10px; }
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

/* =====================================================
   LOGOUT BUTTON
===================================================== */


.logout-btn {
  background-color: #ffd51a;
  color: #ea3030;
  border: none;
  cursor: pointer;
  padding-top: 10px;
  padding-bottom:10px;
}

.logout-btn:hover {
  background-color: #ea3030;
  color: white;
}
</style>
