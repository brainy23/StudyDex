
<script setup>
import AdminNav from '@/components/common/adminNav.vue';
import { getSupabase } from '../../lib/supabase';
import { onMounted, ref, computed } from 'vue';

// async function fetchUsers() {
//   const { data:profile, error } = await getSupabase()
//     .from('profiles')
//     .select('*')

//   if (error) {
//     console.log(error);
//   } else {
//     console.log(data);
    
//   }
// }

// onMounted(fetchUsers);

const sampleData = [
  {
   'id':1,
   'display_name': "orangutan67",
   'school_level_id': 1,
   'created_at': '2026-10-17',
   'avatar_choice': 'female',
   'email': 'testing1@gmail.com'
  },
  {
   'id':2,
   'display_name': "aligator68",
   'school_level_id': 5,
   'created_at': '2026-10-17',
   'avatar_choice': 'male',
   'email': 'testing2@gmail.com'
  },
  {
   'id':3,
   'display_name': "idek69",
   'school_level_id': 3,
   'created_at': '2026-10-18',
   'avatar_choice': 'male',
   'email': 'testing3@gmail.com'
  },
  {
   'id':4,
   'display_name': "idek70",
   'school_level_id': 3,
   'created_at': '2026-10-19',
   'avatar_choice': 'male',
   'email': 'testing4@gmail.com'
  },
  {
   'id':5,
   'display_name': "saylor twift",
   'school_level_id': 6,
   'created_at': '2026-10-20',
   'avatar_choice': 'male',
   'email': 'saylortwift@gmail.com'
  }
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
      <h1 style="font-weight: 800; font-size: 30px;">Account Management</h1>
      <p style="font-size: 14px; color: #7D8095;">Manage all StudyDex accounts in 1 click</p>
      <div class="overview-panel">
        <div class="overview-header">
          <h1>User Overview</h1>
  
          <div><span class="search-prompt">⌕ Search for a student:</span><input v-model="searchQuery" type="text" class="search-bar" placeholder="Username..."></div>
        </div>

        <div class="user-table">
          <div class="row header">
            <span>
              Username
              <button @click="toggleSort('username')">{{ arrow('display_name') }}</button>
            </span>
            <span>Email</span>
            <span>Gender</span>
            <span>
              Level
              <button @click="toggleSort('school_level_id')">{{ arrow('school_level_id') }}</button>
            </span>
            <span>
              Date Joined
              <button @click="toggleSort('created_at')">{{ arrow('created_at') }}</button>
            </span>
            <span>
              Action
            </span>
          </div>

          <div v-for="user in displayedUsers" class="row">
            <span style="font-weight: bold;">{{ user.display_name }}</span>
            <span>{{ user.email }}</span>
            <span>{{ user.avatar_choice.charAt(0).toUpperCase() + user.avatar_choice.slice(1)}}</span>
            <span>P{{ user.school_level_id }}</span>
            <span>{{ user.created_at }}</span>
            <span><button id="ban-button">Ban</button><button id="remove-button">Remove</button></span>
          </div>
          <p class="row" v-if="filteredData.length == 0">No such user.</p>
        </div>
      </div>
      
    </main>

  </div>
</template>

<style scoped>
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
  border-radius: 6px;
  padding: 5px;
  color: rgb(0, 0, 0);
  font-weight: 600;
}

.search-bar {
  border: 0px;
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
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
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
