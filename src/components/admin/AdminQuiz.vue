
<script setup>
import AdminNav from '../common/adminNav.vue';


</script>

<template>
  <div class="admin-layout">

    <!-- Sidebar Component -->
     <AdminNav />

    <!-- Main Content -->
    <main class="admin-content">
      <h1>Hello Admin-Quiz!</h1>
    </main>

  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

.admin-content {
  flex: 1;
  min-width: 0;
  background-color: white;
  margin-left: 20px;
}

.admin-content h1 {
  font-size: 26px;
  font-weight: bold;
  color: #30304b;
}
</style>
