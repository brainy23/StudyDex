import { ref, computed } from 'vue'
import { newExperienceId } from '../services/experienceService'

const FOCUS_SECONDS = 25 * 60

// Module-level state: it lives as long as the app does, so the timer keeps
// running while the user moves between pages.
const seconds = ref(FOCUS_SECONDS)
const running = ref(false)
const finished = ref(false)
const pendingRewards = ref([]) // ids of finished sessions still waiting for their XP

let deadline = 0
let interval = null
let userId = null

const display = computed(() => {
    const m = String(Math.floor(seconds.value / 60)).padStart(2, '0')
    const s = String(seconds.value % 60).padStart(2, '0')
    return m + ':' + s
})

// ---------- saving, so a refresh doesn't lose the timer ----------
function storageKey() {
    return userId ? 'studydex-focus-timer-v1:' + userId : null
}

function save() {
    const key = storageKey()
    if (!key) return
    try {
        localStorage.setItem(key, JSON.stringify({
            seconds: seconds.value,
            running: running.value,
            finished: finished.value,
            deadline,
            pending: pendingRewards.value,
        }))
    } catch (e) {
        // storage unavailable: the timer still works for this visit
    }
}

// ---------- timer ----------
function tick() {
    if (!running.value) return
    seconds.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    if (seconds.value === 0) complete()
}

function complete() {
    clearInterval(interval)
    running.value = false
    finished.value = true
    pendingRewards.value = [...pendingRewards.value, newExperienceId()]
    save()
}

function start() {
    if (running.value) return
    if (!seconds.value) seconds.value = FOCUS_SECONDS
    finished.value = false
    deadline = Date.now() + seconds.value * 1000
    running.value = true
    clearInterval(interval)
    interval = setInterval(tick, 250)
    save()
}

function pause() {
    tick()
    clearInterval(interval)
    running.value = false
    save()
}

// Does not touch pendingRewards: a session that already finished still earns its XP.
function reset() {
    clearInterval(interval)
    running.value = false
    finished.value = false
    seconds.value = FOCUS_SECONDS
    save()
}

function consumeReward(id) {
    pendingRewards.value = pendingRewards.value.filter((x) => x !== id)
    save()
}

// Call once the student is known. Safe to call again on every page visit.
function bind(id) {
    if (userId === id) return
    if (userId) {
        clearInterval(interval)
        running.value = false
        finished.value = false
        seconds.value = FOCUS_SECONDS
        pendingRewards.value = []
    }
    userId = id
    if (!id) return
    try {
        const raw = localStorage.getItem(storageKey())
        if (!raw) return
        const s = JSON.parse(raw)
        pendingRewards.value = Array.isArray(s.pending) ? s.pending : []
        if (s.running && Number(s.deadline) > 0) {
            deadline = Number(s.deadline)
            running.value = true
            clearInterval(interval)
            interval = setInterval(tick, 250)
            tick() // finishes straight away if the time ran out while the app was closed
        } else {
            const saved = Number(s.seconds)
            seconds.value = Number.isFinite(saved) ? Math.min(FOCUS_SECONDS, Math.max(0, saved)) : FOCUS_SECONDS
            finished.value = s.finished === true
        }
    } catch (e) {
        // ignore a broken saved value and start fresh
    }
}

export function useFocusTimer() {
    return { seconds, running, finished, display, pendingRewards, start, pause, reset, bind, consumeReward }
}