
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
   'created_at': '2026-10-17 14:08:35.709137+00',
   'avatar_choice': 'female'
  },
  {
   'id':2,
   'display_name': "aligator68",
   'school_level_id': 5,
   'created_at': '2026-10-17 14:08:35.709137+00',
   'avatar_choice': 'male'
  },
  {
   'id':3,
   'display_name': "idek69",
   'school_level_id': 3,
   'created_at': '2026-10-17 14:08:35.709137+00',
   'avatar_choice': 'male'
  },
  {
   'id':3,
   'display_name': "idek70",
   'school_level_id': 3,
   'created_at': '2026-10-17 14:08:35.709137+00',
   'avatar_choice': 'male'
  }
];

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

const sortedUsers = computed(() => {
  const list = [...sampleData];
  if (!sortKey.value) return list

  list.sort((a, b) => {
    let result
    if (sortKey.value === 'school_level_id') {
      result = a.school_level_id - b.school_level_id
    } else {
      result = a.display_name.localeCompare(b.display_name)
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
      <h1>Hello Admin-User!</h1>
      <h1>User Overview</h1>
      <div class="user-table">
        <div class="row header">
          <span>
            Username
            <button @click="toggleSort('username')">{{ arrow('display_name') }}</button>
          </span>
          <span>Gender</span>
          <span>
            Primary Level
            <button @click="toggleSort('level')">{{ arrow('school_level_id') }}</button>
          </span>
        </div>

        <div v-for="user in sortedUsers" class="row">
          <span>{{ user.display_name }}</span>
          <span>{{ user.avatar_choice }}</span>
          <span>{{ user.school_level_id }}</span>
        </div>
      </div>
    </main>

  </div>
</template>

<style scoped>
.user-table {
  max-width: 600px;

  border-radius: 12px;
  padding: 12px;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 8px 12px;
  background-color: rgb(236, 235, 235);
  margin-top: 8px;
  border: 1px solid darkgrey;
  border-radius: 9px;
}

.header {
  font-weight: bold;
  border-bottom: 1px solid #999;
  margin-bottom: 4px;
}

button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
}
</style>
