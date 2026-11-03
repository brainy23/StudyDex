
<script setup>
import AdminNav from '@/components/common/adminNav.vue';
// import { getSupabase } from '../../lib/supabase';
import { ref, computed } from 'vue';

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

const sampleData = ref([
  {
   'id':1,
   'display_name': "orangutan67",
   'school_level_id': 1,
   'created_at': '2026-10-17',
   'avatar_choice': 'female',
   'email': 'testing1@gmail.com',
   'banned': true
  },
  {
   'id':2,
   'display_name': "aligator68",
   'school_level_id': 5,
   'created_at': '2026-10-17',
   'avatar_choice': 'male',
   'email': 'testing2@gmail.com',
   'banned': true
  },
  {
   'id':3,
   'display_name': "idek69",
   'school_level_id': 3,
   'created_at': '2026-10-18',
   'avatar_choice': 'male',
   'email': 'testing3@gmail.com',
   'banned': true
  },
  {
   'id':4,
   'display_name': "Demo Student Four",
   'school_level_id': 3,
   'created_at': '2026-10-19',
   'avatar_choice': 'male',
   'email': 'testing4@gmail.com',
   'banned': true
  },
  {
   'id':5,
   'display_name': "saylor twift",
   'school_level_id': 6,
   'created_at': '2026-10-20',
   'avatar_choice': 'male',
   'email': 'saylortwift@gmail.com',
   'banned': true
  }
]);

const searchQuery = ref('')

const filteredData = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) return sampleData.value

  return sampleData.value.filter(user =>
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
    if (sortKey.value === 'school_level_id') {
      result = a.school_level_id - b.school_level_id;
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

function banUser(user,bool){
  user.banned = bool
}


</script>

<template>
  <div class="admin-layout">

    <!-- Sidebar Component -->
     <AdminNav />

    <!-- Main Content -->
    <main class="admin-content">
      <h1 style="font-weight: 800; font-size: 30px;">User Overview</h1>
      <p style="font-size: 14px; color: #7D8095;">View and manage registered students</p>
        <div class="overview-panel">


          <!-- SEARCH BAR -->
          <div class="search-container">
            <span class="search-icon">⌕</span>

            <input
              v-model="searchQuery"
              type="search"
              class="search-bar"
              placeholder="Search students by username..."
            />
          </div>

            <!-- USER TABLE USING BOOTSTRAP GRID -->
            <div class="user-table">

              <!-- COLUMN HEADINGS -->

              <div class="row table-header align-items-center">

                <div class="col-2">
                  <button
                    class="sort-button"
                    @click="toggleSort('display_name')"
                  >
                    Username {{ arrow('display_name') }}
                  </button>
                </div>

                <div class="col-2">Email</div>

                <div class="col-1">Gender</div>

                <div class="col-1">
                  <button
                    class="sort-button"
                    @click="toggleSort('school_level_id')"
                  >
                    Level {{ arrow('school_level_id') }}
                  </button>
                </div>

                <div class="col-2">
                  <button
                    class="sort-button"
                    @click="toggleSort('created_at')"
                  >
                    Date Joined {{ arrow('created_at') }}
                  </button>
                </div>

                <!-- NEW COLUMN -->
                <div class="col-2">Account Status</div>

                <div class="col-2">Actions</div>

              </div>


              <!-- STUDENT ROWS -->

              <div
                v-for="user in displayedUsers"
                :key="user.id"
                class="row user-row align-items-center"
              >

                <!-- USERNAME -->
                <div class="col-2">
                  <div class="user-profile">
                    <div class="user-avatar">
                      {{ user.display_name.charAt(0).toUpperCase() }}
                    </div>

                    <span class="username">
                      {{ user.display_name }}
                    </span>
                  </div>
                </div>

                <!-- EMAIL -->
                <div class="col-2 email-cell">
                  {{ user.email }}
                </div>

                <!-- GENDER -->
                <div class="col-1">
                  {{
                    user.avatar_choice.charAt(0).toUpperCase()
                    + user.avatar_choice.slice(1)
                  }}
                </div>

                <!-- LEVEL -->
                <div class="col-1">
                  <span class="level-badge">
                    P{{ user.school_level_id }}
                  </span>
                </div>

                <!-- DATE JOINED -->
                <div class="col-2 date-cell">
                  {{ user.created_at }}
                </div>

                <!-- ACCOUNT STATUS -->
                <div class="col-2">
                  <span
                    class="account-status"
                    :class="user.banned ? 'status-banned' : 'status-active'"
                  >
                    {{ user.banned ? 'Banned' : 'Not Banned' }}
                  </span>
                </div>

                <!-- ACTION BUTTONS -->
                <div class="col-2">
                  <div class="action-buttons">

                    <button
                      class="action-btn unban-btn"
                      :disabled="!user.banned"

                      @click="banUser(user,false)"
                    >
                      Unban
                    </button>

                    <button
                      class="action-btn ban-btn"
                      :disabled="user.banned"

                      @click="banUser(user,true)"
                    >
                      Ban
                    </button>

                    <button class="action-btn remove-btn">
                      Remove
                    </button>

                  </div>
                </div>

              </div>


              <!-- EMPTY SEARCH RESULT -->
              <div
                v-if="displayedUsers.length === 0"
                class="empty-state"
              >
                No students found. Try another username.
              </div>

            </div>

            <div class="table-footer">
              Showing {{ displayedUsers.length }}
              of {{ sampleData.length }} students
            </div>

          </div>

    </main>

  </div>
</template>


<style scoped>

/* OVERVIEW PANEL */

.overview-panel {
  width: 100%;
  padding: 24px;
  background: #fff;
  border: 1px solid #ececf0;
  border-radius: 18px;
  box-shadow: 0 4px 18px rgba(48, 48, 75, 0.04);
}

/* HEADER */

.overview-header {
  margin-bottom: 18px;
}

.overview-header h1 {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 800;
  color: #30304b;
}

.overview-header p {
  margin: 0;
  font-size: 13px;
  color: #8a8b9c;
}

/* SEARCH */

.search-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 0 16px;
  margin-bottom: 20px;

  background: #fffdf7;
  border: 1.5px solid #e8e7e1;
  border-radius: 12px;

  transition: border-color 0.2s ease;
}

.search-container:focus-within {
  border-color: #ffd21f;
}

.search-icon {
  font-size: 24px;
  color: #b1a36d;
}

.search-bar {
  width: 100%;
  flex: 1;
  min-width: 0;
  padding: 13px 0;

  border: none;
  outline: none;
  background: transparent;

  font-family: inherit;
  font-size: 14px;
  color: #30304b;
}

.search-bar::placeholder {
  color: #a4a5b2;
}

/* TABLE CONTAINER */

.user-table {
  width: 100%;
  overflow-x: auto;
}

/* BOOTSTRAP GRID ROWS */

.user-table > .row {
  min-width: 920px;
  margin-left: 0;
  margin-right: 0;
}

/* TABLE HEADER */

.table-header {
  padding: 14px 4px;
  margin-bottom: 5px;

  background: #fff8df;
  border: 1px solid #f0e5c1;
  border-radius: 10px;

  font-size: 12px;
  font-weight: 700;
  color: #6b634b;
}

/* USER ROWS */

.user-row {
  padding: 12px 4px;
  margin-bottom: 3px;

  background: #fff;
  border-bottom: 1px solid #f1f1f4;

  font-size: 13px;
  font-weight: 500;
  color: #414158;

  transition: background 0.2s ease;
}

.user-row:hover {
  background: #fffdf3;
  border-radius: 10px;
}

/* SORT BUTTONS */

.sort-button {
  padding: 0;
  border: none;
  background: transparent;

  font-family: inherit;
  font-size: inherit;
  font-weight: 700;
  color: inherit;

  cursor: pointer;
}

.sort-button:hover {
  color: #a47c00;
}

/* USER PROFILE */

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 34px;
  height: 34px;
  flex-shrink: 0;

  background: #fff0b5;
  border-radius: 50%;

  font-size: 14px;
  font-weight: 800;
  color: #846317;
}

.username {
  min-width: 0;
  overflow-wrap: anywhere;
  font-weight: 700;
  color: #30304b;
}

.email-cell,
.date-cell {
  color: #73758a;
}

/* LEVEL BADGE */

.level-badge {
  display: inline-block;
  padding: 5px 11px;

  background: #f1f0ff;
  color: #7870b6;

  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
}

/* ACTION BUTTONS */

.action-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
}

.action-btn {
  padding: 7px 11px;
  border: 1px solid transparent;
  border-radius: 8px;

  font-family: inherit;
  font-size: 11px;
  font-weight: 700;

  cursor: pointer;
  transition: background 0.2s ease;
}

/* UNBAN */

.unban-btn {
  background: #e4f8ed;
  color: #27935b;
  border-color: #bcebd0;
}

.unban-btn:hover {
  background: #cef0dd;
}

/* BAN */

.ban-btn {
  background: #fff1d9;
  color: #b77b22;
  border-color: #f6dcad;
}

.ban-btn:hover {
  background: #ffe5b5;
}

/* REMOVE */

.remove-btn {
  background: #ffe8e8;
  color: #cd5454;
  border-color: #f8cccc;
}

.remove-btn:hover {
  background: #ffd7d7;
}

/* EMPTY STATE */

.empty-state {
  padding: 35px;
  text-align: center;
  color: #8a8b9c;
  font-size: 14px;
}

/* FOOTER */

.table-footer {
  margin-top: 14px;
  text-align: right;
  color: #9999a6;
  font-size: 12px;
}

/* RESPONSIVE */

@media (max-width: 768px) {
  .overview-panel {
    padding: 16px;
  }

  .overview-header h1 {
    font-size: 20px;
  }

  .user-table > .row {
    min-width: 920px;
  }
}

/* ACCOUNT STATUS */
.account-status {
  font-size: 12px;
  font-weight: 700;
}

/* BANNED - RED */
.status-banned {
  color: #d9534f;
}

/* NOT BANNED - GREEN */
.status-active {
  color: #2ca76b;
}

/* DISABLED ACTION BUTTONS */
.action-btn:disabled {
  background: #eeeeee;
  color: #aaaaaa;
  border-color: #dddddd;

  cursor: not-allowed;
  opacity: 0.65;
}

/* DISABLE HOVER EFFECT */
.action-btn:disabled:hover {
  background: #eeeeee;
  color: #aaaaaa;
  border-color: #dddddd;
  transform: none;
}

</style>
