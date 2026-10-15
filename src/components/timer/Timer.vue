<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
const modes = [
  {id: 'pomodoro', label: 'Pomodoro', seconds: 25*60},
  {id: 'short', label: 'Short Break', seconds: 5*60},
  {id: 'long', label: 'Long Break', seconds: 15*60},
]
const status = [
    {id: 'start', label:'START'},
    {id: 'pause', label:'PAUSE'}
]
const mode = ref('pomodoro')
const secondsLeft = ref(modes[0].seconds)
const running = ref(false)
const finished = computed(() => secondsLeft.value === 0)
let interval = null
let endTime = 0

const display = computed(() => {
const m = String(Math.floor(secondsLeft.value / 60)).padStart(2, '0')
const s = String(secondsLeft.value % 60).padStart(2, '0')
return `${m}:${s}`
})

function start() {
    endTime = Date.now() + secondsLeft.value * 1000
    running.value = true
    interval = setInterval(() => {
        secondsLeft.value = Math.max(0, Math.round((endTime - Date.now()) / 1000))
        if (secondsLeft.value === 0) pause()
    }, 250)
}

function pause() {
    clearInterval(interval)
    running.value = false
}

function toggle() {
    if (finished.value) return reset()
    running.value ? pause() : start()
}

function reset() {
  pause()
  secondsLeft.value = modes.find((m) => m.id === mode.value).seconds
}

watch(mode, (id) => {
    reset()
})

onUnmounted(() => clearInterval(interval))
</script>


<template>
    <title>Study Session Timer</title>
    <main :class="`mode-${mode}`">
        <div class="title">
        Study Session Timer
        </div>

        <div class="timer">
            <div class="selector">
                <button v-for="m in modes" :key="m.id" :class="{active:mode === m.id}"
                :aria-pressed="mode === m.id"
                @click="mode = m.id">
                    {{ m.label }}
                </button>
            </div>
            <div class="timer-func">
                {{ display }}
            </div>
        <div class="status">
            <button @click="toggle">{{ finished ? 'RESET' : running ? 'PAUSE' : 'START' }}</button>
        </div>
        </div>
    </main>
</template>


<style>
    main {
        font-family:Verdana, Geneva, Tahoma, sans-serif;
        color: white;
        min-height: 100vh;
        transition: background-color 0.4s ease
    }
    main.mode-pomodoro {
        background-color: rgb(255, 208, 0);
        --btn: rgb(224, 183, 0);
        --btn-active: rgb(253, 224, 98);
    }

    main.mode-short {
        background-color: rgb(39, 39, 153);
        --btn: rgb(34, 34, 122);
        --btn-active: rgb(51, 51, 182);
    }

    main.mode-long {
        background-color: rgb(73, 35, 106);
        --btn: rgb(64, 32, 92);
        --btn-active: rgb(107, 46, 160);
    }

    .title{
        text-align: center;
        padding:40px;
        font-size: 40px;
    }

    .timer{
        text-align: center;
        display: flex;
        flex-direction: column;
        gap:50px;
    }

    .timer-func{
        font-size: 170px;
        margin: auto;
        line-height: 1;
    }

    .selector {
        font-family: Verdana, Geneva, Tahoma, sans-serif;

        margin: auto;
        display:flex;
        justify-content: center;
        gap: 30px;
    }

    .selector button{
        font-size: 20px;
        background-color: var(--btn);
        border-radius: 10px;
        color: white;
        padding: 15px;
        border:0px;
        transition: background-color 0.2s ease, transform 0.2s ease;
    }

    .selector button.active{
        background-color: var(--btn-active);
        transform: scale(1.2)
    }

    .selector button:hover{
        cursor:pointer;
        background-color: var(--btn-active);
    
    }

    .status button {
        font-family: Verdana, Geneva, Tahoma, sans-serif;
        font-size: 30px;
        border-radius: 15px;
        padding: 5px 40px;
        color: rgb(51, 51, 51);
        border:0px;
        box-shadow:0 5px 0 rgb(106, 106, 106);
        transition: transform 150ms ease, box-shadow 150ms ease;
    }
    .status button:hover{
        cursor: pointer;
    }
    .status button:active {
        transform: translateY(1.5px);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
</style>