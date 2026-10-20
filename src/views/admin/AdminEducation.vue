
<script setup>
import '@/assets/admincommon.css'
import AdminNav from '@/components/common/adminNav.vue';
import { ref, onMounted, computed } from 'vue';

const sampleData = [
  {
   'id':1,
   'display_name': "orangutan67",
   'school_level_id': 1,
   'created_at': '2026-10-17',
   'avatar_choice': 'female',
   'email': 'testing1@gmail.com'
  },
  
];

const searchQuery = ref('')

const filteredData = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return sampleData;

  return sampleData.filter(user =>
    user.display_name.toLowerCase().includes(query)
  )
})

const sortKey = ref('');
const sortOrder = ref('asc');

function toggleSort(key) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const displayedUsers = computed(() => {
  const list = [...filteredData.value]
  if (!sortKey.value) return list

  list.sort((a, b) => {
    let result
    if (sortKey.value === 'level') {
      result = a.level - b.level
    } else {
      result = (a.display_name ?? '').localeCompare(b.display_name ?? '')
    }
    return sortOrder.value === 'asc' ? result : -result
  })
  return list
})

function arrow(key) {
  if (sortKey.value !== key) return '↕'
  return sortOrder.value === 'asc' ? '↑' : '↓'
}
</script>

<template>
  <div class="admin-layout">

    <!-- Sidebar Component -->
     <AdminNav />

    <!-- Main Content -->
    <main class="admin-content">
      <div class="admin-header">
        <div class="header-text">
          <h1 style="font-weight: 800; font-size: 30px;">StudyDeck Management</h1>
          <p style="font-size: 14px; color: #7D8095;">Manage all StudyDecks in a few clicks</p>
        </div>
        <button class="add-deck-button">+ Add StudyDeck</button>
      </div>

      <div class="overview-panel">
        <div class="overview-header">
          <h1>StudyDecks Overview</h1>
  
          <div><span class="search-prompt">⌕ Search for a StudyDeck:</span><input v-model="searchQuery" type="text" class="search-bar" placeholder="StudyDeck name..."></div>
        </div>

        <div class="user-table">
          <div class="row header">
            <span>
              Deck Name
              <button @click="toggleSort('username')">{{ arrow('display_name') }}</button>
            </span>
            <span>Subject</span>
            <span>
              Level
              <button @click="toggleSort('school_level_id')">{{ arrow('school_level_id') }}</button>
            </span>
            <span>Pages</span>
            <span>
              Difficulty
              <button @click="toggleSort('created_at')">{{ arrow('created_at') }}</button>
            </span>
            <span>Status</span>
            <span>
              Action
            </span>
          </div>

          <div v-for="user in displayedUsers" class="row">
            <span style="font-weight: bold;min-width: 0;overflow-wrap: anywhere;">{{ user.display_name }}</span>
            <span>{{ user.email }}</span>
            <span>{{ user.avatar_choice.charAt(0).toUpperCase() + user.avatar_choice.slice(1)}}</span>
            <span>P{{ user.school_level_id }}</span>
            <span>{{ user.created_at }}</span>
            <span><button id="unban-button">Unban</button><button id="ban-button">Ban</button><button id="remove-button">Remove</button></span>
          </div>
          <p class="row" v-if="filteredData.length == 0">No such user.</p>
        </div>
      </div>

    </main>

  </div>
</template>

<style scoped>
.admin-header {
  display: flex;
  justify-content: space-between;
}

.add-deck-button {
  border: 0;
  font-weight: 700;
  border-radius: 10px;
  background-color: #ffd117;
  padding: 14px;
  width: fit-content;
  height: fit-content;
  margin-right: 10px;
  align-self: center;

}

.overview-panel {
  padding: 22px;
  border: 1px solid #ececf0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(48, 48, 75, 0.05);
}

.overview-header {
  display: flex;
  justify-content: space-between;
}

.search-prompt {
  background-color: #fee67b;
  margin-right: 10px;
  border: 1.5px solid #f9d11f;
  border-radius: 6px;
  padding: 5px;
  color: rgb(0, 0, 0);
  font-weight: 600;
}

.search-bar {
  border: 1px solid grey;
  border-radius: 6px;
  background-color: #d7d6d6;
  padding: 2.5px;
  box-sizing: border-box;
}

.search-bar::placeholder{
  padding: 4px;
  color: rgb(106, 106, 106);
}

.user-table {
  max-width: 1200px;

  border-radius: 12px;
  padding: 12px;
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 120px 90px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  padding: 8px 12px;
  background-color: rgb(236, 235, 235);
  margin-top: 8px;
  /* border: 1px solid darkgrey; */
  border-radius: 9px;
  font-weight: 500;
}

.header {
  font-weight: bold;
  border: 1px solid #c3c3c3;
  margin-bottom: 4px;
}

button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
}

#unban-button{
  background-color: rgb(0, 193, 74);
  border-radius: 9px;
  font-size: small;
  padding: 3px 8px;
  color: rgb(255, 255, 255);
  margin-right: 8px;
}

#ban-button{
  background-color: rgb(254, 110, 54);
  border-radius: 9px;
  font-size: small;
  padding: 3px 8px;
  color: rgb(255, 255, 255);
  margin-right: 8px;
}

#remove-button{
  background-color: red;
  border-radius: 9px;
  font-size: small;
  padding: 3px 8px;
  color: rgb(238, 238, 238);
}
</style>
