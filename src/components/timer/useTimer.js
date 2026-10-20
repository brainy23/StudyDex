import { ref, computed } from 'vue'

const DAILY_LIMIT = 4
const WORK_SECONDS = 1
const today = new Date().toDateString()

// state lives outside the function, so every component that calls
// useStudyTimer() shares the same timer
const sessionsDone = ref(Number(localStorage.getItem('sessions:' + today)) || 0)
const secondsLeft = ref(WORK_SECONDS)
const running = ref(false)
let interval = null
let endTime = 0

const display = computed(() => {
    const m = String(Math.floor(secondsLeft.value / 60)).padStart(2, '0')
    const s = String(secondsLeft.value % 60).padStart(2, '0')
    return m + ':' + s
})
const finished = computed(() => secondsLeft.value === 0)
const limitReached = computed(() => sessionsDone.value >= DAILY_LIMIT)
const timerDisabled = computed(() => limitReached.value && !running.value && !finished.value)
const timerLabel = computed(() => {
    if (finished.value) return 'RESET'
    if (running.value) return 'PAUSE'
    if (limitReached.value) return 'Daily limit reached'
    return 'Start Session ' + (sessionsDone.value + 1)
})

function startTimer() {
    endTime = Date.now() + secondsLeft.value * 1000
    running.value = true
    interval = setInterval(() => {
        secondsLeft.value = Math.max(0, Math.round((endTime - Date.now()) / 1000))
        if (secondsLeft.value === 0) completeSession()
    }, 250)
}

function pauseTimer() {
    clearInterval(interval)
    running.value = false
}

function resetTimer() {
    pauseTimer()
    secondsLeft.value = WORK_SECONDS
}

function completeSession() {
    pauseTimer()
    sessionsDone.value++
    localStorage.setItem('sessions:' + today, sessionsDone.value)
    // award XP here (only for the first DAILY_LIMIT sessions)
}

function toggleTimer() {
    if (finished.value) return resetTimer()
    running.value ? pauseTimer() : startTimer()
}

//admin func
function resetDay() {
    resetTimer()
    sessionsDone.value = 0
    localStorage.removeItem('sessions:' + today)
}

export function useTimer() {
    return {
        DAILY_LIMIT,
        sessionsDone,
        secondsLeft,
        running,
        finished,
        display,
        timerLabel,
        timerDisabled,
        toggleTimer,
        resetTimer,
        resetDay,
    }
}