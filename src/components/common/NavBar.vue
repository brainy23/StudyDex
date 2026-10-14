
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const currentTime = ref(new Date())

let clockInterval

onMounted(() => {
  clockInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  clearInterval(clockInterval)
})

const time = () => {
  return currentTime.value.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

const date = () => {
  return currentTime.value.toLocaleDateString('en-SG', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  })
}

</script>

<template>
  <nav class="navbar">

    <!-- Clock -->
    <div class="clock">
      <div class="clock-time">
        ☀️ {{ time() }}
      </div>
      <div class="clock-date">
        {{ date() }}
      </div>
    </div>

    <!-- Logo -->
    <div class="logo">
      StudyDex
    </div>

    <!-- Trainer -->
    <div class="trainer">
      <img src="/assets/male.png" alt="Trainer">
      <span>Trainer A</span>
    </div>

    <!-- Navigation Links -->
    <div class="nav-links">
      <RouterLink to="/study-decks" class="nav-btn">
        Study Decks
      </RouterLink>

      <RouterLink to="/progress" class="nav-btn">
        My Progress
      </RouterLink>

      <RouterLink to="/pokepacks" class="nav-btn">
        View Pokepacks
      </RouterLink>

      <RouterLink to="/" class="nav-btn">
        Home
      </RouterLink>
    </div>

  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  gap: 20px;

  width: 100%;
  padding: 10px 12px;
  box-sizing: border-box;

  background-color: rgba(255, 255, 255, 0.85);
  border-radius: 15px;

  min-height: 65px;
}

/* CLOCK */
.clock {
  background-color: #ffe49b;
  border: 2px solid #30304b;

  padding: 5px 8px;
  text-align: center;

  min-width: 115px;
  flex-shrink: 0;
}

.clock-time {
  font-size: 19px;
  font-weight: 900;
  color: #243954;
  white-space: nowrap;
}

.clock-date {
  font-size: 11px;
  font-weight: bold;
  color: #243954;
  text-transform: uppercase;
}

/* LOGO */
.logo {
  font-size: 25px;
  font-weight: 900;
  color: #30304b;

  white-space: nowrap;
  margin: 0 15px;
}

/* TRAINER PROFILE */
.trainer {
  display: flex;
  align-items: center;
  gap: 7px;

  background-color: #adb5bd;
  border: 2px solid white;
  border-radius: 25px;

  padding: 3px 12px 3px 4px;
  white-space: nowrap;
  font-weight: bold;
  color: #30304b;
}

.trainer img {
  width: 25px;
  height: 25px;
  object-fit: contain;
}

/* NAVIGATION */
.nav-links {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 15px;
  min-width: 0;
}

.nav-btn {
  flex: 1;

  background-color: #aeb6bf;
  border: 3px solid white;
  border-radius: 25px;

  padding: 5px 12px;

  color: #30304b;
  font-weight: bold;
  font-size: 14px;

  text-align: center;
  text-decoration: none;
  white-space: nowrap;

  transition: 0.2s;
}

.nav-btn:hover {
  background-color: #ffd942;
}

.nav-btn.router-link-exact-active {
  background-color: #ffd942;
}

/* RESPONSIVE */
@media (max-width: 1050px) {
  .navbar {
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-links {
    flex-basis: 100%;
  }
}

@media (max-width: 600px) {
  .nav-links {
    flex-wrap: wrap;
    gap: 8px;
  }

  .nav-btn {
    flex: 1 1 40%;
  }

  .logo {
    margin: 0;
  }
}
</style>
