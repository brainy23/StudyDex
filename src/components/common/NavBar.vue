<script setup>
import { ref, onMounted, onUnmounted,computed } from 'vue'
import axios from 'axios'

// Weather data
const temperature = ref(null)
const weatherCode = ref(null)
const isDay = ref(true)

let clockInterval
let weatherInterval

const weather_API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=1.3521&longitude=103.8198&current=temperature_2m,weather_code,is_day&timezone=Asia%2FSingapore'
const currentTime = ref(new Date())

// Fetch weather from Open-Meteo
const fetchWeather = async () => {
  try {
    const response = await axios.get(weather_API_URL)
    console.log(response.data.current)

    temperature.value = response.data.current.temperature_2m
    weatherCode.value = response.data.current.weather_code
    isDay.value = response.data.current.is_day === 1


  } catch (error) {
    console.error('Error fetching weather:', error)
  }
}


const weatherImg = computed(() => {
  const code = weatherCode.value

  if (code === null) return '/assets/cloud.png'


  // Rain / Thunderstorm (day or night)
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  ) {
    return '/assets/rain.png'
  }

  // Nighttime
  if (!isDay.value) {
    return '/assets/moon.png'
  }

  // Overcast / Fog
  if (code === 3 || code === 45 || code === 48) {
    return '/assets/cloud.png'
  }

  // Partly cloudy
  if (code === 1 || code === 2) {
    return '/assets/suncloud.png'
  }

  // Clear daytime
  return '/assets/sun.png'
})


onMounted(() => {
  clockInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)

  fetchWeather()
  // Refresh weather every 10 minutes
  weatherInterval = setInterval(fetchWeather, 600000)
})

onUnmounted(() => {
  clearInterval(clockInterval)
  clearInterval(weatherInterval)
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
        <img :src="weatherImg" alt="" style="width:40px;">{{ time() }}
      </div>
      <div class="clock-date">
        {{ date() }}
      </div>
    </div>

    <!-- Logo -->
    <div class="logo"><img src="/assets/studydexlogo.png" alt="StudyDex" style="width: 200px;"></div>

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

      <RouterLink to="/dashboard" class="nav-btn">
        My Progress
      </RouterLink>

      <RouterLink to="/rewards" class="nav-btn">
        View Pokepacks
      </RouterLink>

      <RouterLink to="/home" class="nav-btn">
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
