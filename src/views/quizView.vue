<script setup>
import { ref, computed } from 'vue'
import { useTimer } from '../components/timer/useTimer.js'

// ---------- flashcards ----------
const decks = [
    {
        id: 'science',
        name: 'Science',
        cards: [
            { q: 'What do plants need to make food?', a: 'Sunlight, water and carbon dioxide (photosynthesis)' },
            { q: 'At what temperature does water boil?', a: '100°C' },
            { q: 'Which part of a plant absorbs water?', a: 'The roots' },
            { q: 'What force pulls objects towards the Earth?', a: 'Gravity' },
        ],
    },
    {
        id: 'english',
        name: 'English',
        cards: [
            { q: 'What is a noun?', a: 'A word that names a person, place or thing' },
            { q: 'What is the plural of "child"?', a: 'Children' },
            { q: 'Give an antonym of "happy".', a: 'Sad' },
            { q: 'What is a verb?', a: 'A word that shows an action' },
        ],
    },
]

const activeDeckId = ref('science')
const queue = ref([...decks[0].cards])
const index = ref(0)
const flipped = ref(false)

const activeDeck = computed(() => decks.find((d) => d.id === activeDeckId.value))
const current = computed(() => queue.value[index.value])
const frontText = computed(() => current.value ? current.value.q : 'Deck complete! Press Again to go through it once more.')
const backText = computed(() => current.value ? current.value.a : '')

function flip() {
    if (current.value) flipped.value = !flipped.value
}

// flips the card face-down first so the next answer never peeks through
function go(change) {
    if (flipped.value) {
        flipped.value = false
        setTimeout(change, 300)
    } else {
        change()
    }
}

function loadDeck(id) {
    activeDeckId.value = id
    queue.value = [...decks.find((d) => d.id === id).cards]
    index.value = 0
    flipped.value = false
}

function switchDeck(id) {
    go(() => loadDeck(id))
}

function next() {
    go(() => { if (index.value < queue.value.length - 1) index.value++ })
}

function prev() {
    go(() => { if (index.value > 0) index.value-- })
}

// Again: restart the whole deck, including cards marked Easy
function again() {
    go(() => loadDeck(activeDeckId.value))
}

// Easy: remove this card from the queue
function easy() {
    if (!current.value) return
    go(() => {
        queue.value.splice(index.value, 1)
        if (index.value >= queue.value.length) index.value = Math.max(0, queue.value.length - 1)
    })
}

// Hard: put a copy of this card back in the queue 4 cards ahead, then move on
function hard() {
    if (!current.value) return
    const card = current.value
    go(() => {
        const insertAt = Math.min(index.value + 4, queue.value.length)
        queue.value.splice(insertAt, 0, card)
        index.value++
    })
}

// ---------- study timer ----------
const { DAILY_LIMIT, sessionsDone, running, display, timerLabel, timerDisabled, toggleTimer, resetDay } = useTimer()
const isDev = import.meta.env.DEV

</script>

<template>
    <main>
        <div class="study-screen">
            <div class="nav"></div>
            <aside class="buddy"><BuddyPanel />
                <div class="b-circle">
                    icon
                </div>
                <div class="b-info">
                    info for pokemon
                    includes xp bar and level
                </div>

            </aside>
            <section class="main-quiz"><FlashcardViewer />
                <h1 class="deck-name">
                    {{ activeDeck.name }}
                </h1>
                <div class="card" :class="{ flipped }" @click="flip">
                    <div class="card-inner">
                        <div class="card-face card-front">
                            <div>
                                {{ frontText }}
                                <small v-if="current" class="flip-hint">Click the card to flip!</small>
                            </div>
                        </div>
                        <div class="card-face card-back">{{ backText }}</div>
                    </div>
                </div>
                <div class="selector">
                    <button class='back' :disabled="index === 0" @click="prev">←</button>
                    <p class="page-count">{{ current ? index + 1 : 0 }} / {{ queue.length }}</p>
                    <button class='next' :disabled="index >= queue.length - 1" @click="next">→</button>
                </div>
                <div class="actions">
                    <button class="again" @click="again">Again</button>
                    <button class="hard" :disabled="!current" @click="hard">Hard</button>
                    <button class="easy" :disabled="!current" @click="easy">Easy</button>
                </div>

            </section>
            <aside class="util">
                <div class="timer-box">
                    <h2>Study Block Timer</h2>
                    <div class="time">{{ display }}</div>
                    <button class="start" :class="{ pressed: running }" :disabled="timerDisabled" @click="toggleTimer">{{ timerLabel }}</button>
                    <p>{{ sessionsDone }} out of {{ DAILY_LIMIT }} study sessions done!</p>
                    <div class="dots">
                        <span v-for="n in DAILY_LIMIT" :key="n" class="dot" :class="{ done: n <= sessionsDone }"></span>
                        <!-- dev function -->
                        <button v-if="isDev" @click="resetDay">Reset day</button>
                    </div>
                </div>
                <div class="deck-box">
                    <h2>Current Study Decks</h2>
                    <div v-for="d in decks" :key="d.id" class="deck-row" :class="{ active: d.id === activeDeckId }">
                        <span>{{ d.name }}</span>
                        <button @click="switchDeck(d.id)">{{ d.id === activeDeckId ? 'Active' : 'Toggle' }}</button>
                    </div>
                </div>
            </aside>
        </div>
    </main>
</template>

<style scoped>

    html, body { margin: 0; }
    main{
        height: 100dvh;
        background-image: url(../../public/backgrounds/morning_homepage.png);
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        font-family:Verdana, Geneva, Tahoma, sans-serif;

    }

    .study-screen {
        display: grid;
        grid-template-columns: 360px 1fr 290px;
        grid-template-rows: auto minmax(0, 1fr);
        gap: 16px;
        height: 100%;
        box-sizing: border-box;
        padding: 16px;
    }

    .buddy {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap:20px;
    }

    .b-circle {
        background-color: rgba(255, 255, 255, 0.8);
        width: 360px;
        height: 360px;
        border-radius: 180px;
        text-align: center;
        align-content: center;
        padding: 10px;
        box-shadow: rgba(100, 100, 111, 0.7) 0px 7px 29px 0px;
    }

    .b-info {
        background-color: rgba(255, 255, 255, 0.8);
        height: 140px;
        width: 360px;
        border-radius: 30px;
        text-align: center;
        align-content: center;
        padding: 10px;
        box-shadow: rgba(100, 100, 111, 0.7) 0px 7px 29px 0px;
    }

    .main-quiz {
        background-color: rgba(255, 255, 255, 0.8);
        border-radius: 50px;
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 35px;
        box-shadow: rgba(100, 100, 111, 0.7) 0px 7px 29px 0px;
    }

    .card{
        height: 350px;
        background-color: transparent;
        border-radius: 30px;
        text-align: center;
        align-content: center;
        font-size: 30px;
        perspective: 1000px;
        cursor: pointer;
    }

    .selector {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        padding: 10px;
        gap: 40px;
    }

    .actions{
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 60px;
    }

    .actions button{
        font-family:Verdana, Geneva, Tahoma, sans-serif;
        font-size: 20px;
        padding: 25px;
        width: 130px;
        border-radius: 25px;
        color: white;
    }

    .actions .easy{
        background-color: green;
        border: 3px solid rgb(4, 184, 4)
    }

    .actions .hard{
        background-color: rgb(206, 0, 0);
        border: 3px solid red
    }

    .actions .again{
        background-color: rgb(0, 0, 190);
        border: 3px solid rgb(33, 33, 238);
    }
    .util {
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-sizing: border-box;
        overflow-y: auto;
    }

    .nav {
        border: 5px solid orange;
        background-color: gold;
        height: 80px;
        grid-column: 1 / -1;
    }

    .study-screen > nav { grid-column: 1 / -1; }

    .card-inner {
        position: relative;
        width: 100%;
        height: 100%;
        transition: transform 0.4s;
        transform-style: preserve-3d;
    }

    .card.flipped .card-inner {
        transform: rotateY(180deg);
    }

    .card-face {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        background-color: white;
        border-radius: 30px;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
    }

    .card-back {
        background-color: rgb(255, 248, 214);
        transform: rotateY(180deg);
    }

    .flip-hint {
        display: block;
        margin-top: 20px;
        font-size: 16px;
        color: gray;
    }

    .selector button, .actions button {
        cursor: pointer;
    }

    .selector button:disabled, .actions button:disabled {
        opacity: 0.4;
        cursor: default;
    }

    .timer-box, .deck-box {
        text-align: center;
        justify-content: center;
        background-color: rgba(255, 255, 255, 0.8);
        border-radius: 30px;
        box-shadow: rgba(100, 100, 111, 0.7) 0px 7px 29px 0px;
        padding: 30px;
        flex-shrink: 0;
    }

    .deck-box{
        flex-grow:1;
    }

    .timer-box h2, .deck-box h2 {
        margin: 0 0 10px;
        font-size: 20px;
    }

    .time {
        font-size: 70px;
        font-weight: bold;
    }

    .timer-box .start {
        font-family: inherit;
        font-size: 18px;
        padding: 10px 20px;
        border: 0;
        border-radius: 15px;
        background-color: rgb(255, 215, 37);
        box-shadow: 0 5px 0 rgb(200, 160, 0);
        cursor: pointer;
        transition: transform 150ms ease, box-shadow 150ms ease;
    }

    .timer-box .start.pressed {
        transform: translateY(5px);
        box-shadow: 0 0 0 rgb(200, 160, 0);
    }

    .timer-box .start:disabled {
        opacity: 0.6;
        cursor: default;
    }

    .dots {
        display: flex;
        justify-content: center;
        gap: 15px;
        
    }

    .dot {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: gray;
        border: 3px solid white;
        box-shadow: rgba(100, 100, 111, 0.7) 0px 7px 29px 0px;
    }

    .dot.done {
        background-color: rgb(255, 215, 37);
    }

    .deck-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        margin-top: 8px;
        border-radius: 10px;
        background-color: rgba(0, 0, 0, 0.08);
    }

    .deck-row.active {
        background-color: rgb(255, 230, 120);
        font-weight: bold;
    }

    .deck-row button {
        font-family: inherit;
        border: 0;
        border-radius: 8px;
        padding: 4px 12px;
        background-color: rgb(255, 215, 37);
        cursor: pointer;
    }

</style>