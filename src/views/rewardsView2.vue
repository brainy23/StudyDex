<script setup>
import { ref, computed, onUnmounted } from 'vue'

// stages: browse > idle > zoom > ready > tear > rise > flip > revealed
const stage = ref('browse')
const rx = ref(0)
const ry = ref(0)
const card = ref(null)
const particles = ref([])
const confetti = ref([])
const soundOn = ref(true)

// ---------- drag-to-tear ----------
const tearProgress = ref(0) // 0 = sealed, 1 = fully torn
const tearDir = ref(1) // 1 = rips left to right, -1 = right to left
const dragging = ref(false)
let dragStartX = 0
let dragWidth = 1
let dragMoved = 0
let dirLocked = false
let finishing = false
let tearRaf = 0

const tearVars = computed(() => {
    const p = tearProgress.value * 100
    const ltr = tearDir.value === 1
    return {
        '--tp': tearProgress.value,
        '--rem-l': (ltr ? p : 0) + '%',
        '--rem-r': (ltr ? 0 : p) + '%',
        '--torn-l': (ltr ? 0 : 100 - p) + '%',
        '--torn-r': (ltr ? 100 - p : 0) + '%',
        '--flap-origin': (ltr ? p : 100 - p) + '%',
        '--flap-rot': (ltr ? 1 : -1) * tearProgress.value * 38 + 'deg',
        '--glow-l': (ltr ? 0 : 100 - p) + '%',
        '--head': (ltr ? p : 100 - p) + '%',
    }
})

// number of unopened packs the user owns (replace with a Supabase fetch)
const packCount = ref(5)
const packMessage = computed(() =>
    packCount.value > 0 ? "Let's rip some packs!" : 'Study to earn more packs!'
)

// Pokemon the user already owns (replace with a Supabase fetch)
const owned = ref(new Set([4, 25]))

// Only base forms can be pulled: every Pokemon in #1-151 that does not evolve
// from another Pokemon in #1-151. Delete IDs to trim the pool.
const BASE_FORMS = [
    1, 4, 7, 10, 13, 16, 19, 21, 23, 25, 27, 29, 32, 35, 37, 39, 41, 43, 46, 48,
    50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 74, 77, 79, 81, 83, 84, 86, 88, 90, 92,
    95, 96, 98, 100, 102, 104, 106, 107, 108, 109, 111, 113, 114, 115, 116, 118, 120,
    122, 123, 124, 125, 126, 127, 128, 129, 131, 132, 133, 137, 138, 140, 142, 143, 147,
    144, 145, 146, 150
]

// the reveal is themed by the Pokemon's type(s): rgb triplets
const TYPE_COLORS = {
    normal: '168 167 122',
    fire: '238 129 48',
    water: '99 144 240',
    electric: '247 208 44',
    grass: '122 199 76',
    ice: '150 217 214',
    fighting: '194 46 40',
    poison: '163 62 161',
    ground: '226 191 101',
    flying: '169 143 243',
    psychic: '249 85 135',
    bug: '166 185 26',
    rock: '182 161 54',
    ghost: '115 87 151',
    dragon: '111 53 252',
    dark: '112 87 70',
    steel: '183 183 206',
    fairy: '214 133 173',
}
const GOLD = '255 214 90'

const theme = computed(() => {
    const types = card.value ? card.value.types : []
    return {
        '--c1': TYPE_COLORS[types[0]] || '255 120 90',
        '--c2': TYPE_COLORS[types[1]] || GOLD,
    }
})

const HOLD = 850 // suspense pause before the flip (ms)
const opened = computed(() => ['tear', 'rise', 'flip', 'revealed'].includes(stage.value))
const flipped = computed(() => ['flip', 'revealed'].includes(stage.value))

function prettyName(name) {
    if (name === 'nidoran-f') return 'Nidoran ♀'
    if (name === 'nidoran-m') return 'Nidoran ♂'
    if (name === 'mr-mime') return 'Mr. Mime'
    if (name === 'farfetchd') return "Farfetch'd"
    return name.replace(/-/g, ' ')
}

// ---------- timers ----------
let timers = []
let loadToken = 0
function after(ms, fn) {
    timers.push(setTimeout(fn, ms))
}
function clearTimers() {
    timers.forEach(clearTimeout)
    timers = []
}
onUnmounted(() => {
    clearTimers()
    cancelAnimationFrame(tearRaf)
})

// ---------- sound (synthesised, no files needed) ----------
let audioCtx = null
function ctx() {
    if (!soundOn.value) return null
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
}
function tone(freq, at = 0, dur = 0.18, type = 'triangle', vol = 0.12) {
    const c = ctx()
    if (!c) return
    const t = c.currentTime + at
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(t)
    osc.stop(t + dur)
}
function rip() {
    const c = ctx()
    if (!c) return
    const len = Math.floor(c.sampleRate * 0.35)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = c.createBufferSource()
    const gain = c.createGain()
    gain.gain.value = 0.25
    src.buffer = buf
    src.connect(gain)
    gain.connect(c.destination)
    src.start()
}
function riser(seconds) {
    const c = ctx()
    if (!c) return
    const t = c.currentTime
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(140, t)
    osc.frequency.exponentialRampToValueAtTime(900, t + seconds)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.linearRampToValueAtTime(0.08, t + seconds * 0.9)
    gain.gain.linearRampToValueAtTime(0.0001, t + seconds)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(t)
    osc.stop(t + seconds)
}
function fanfare() {
    const notes = [523, 659, 784, 1047, 1319, 1568, 2093]
    notes.forEach((n, i) => tone(n, i * 0.08, 0.4, 'triangle', 0.14))
    tone(70, 0, 0.7, 'sine', 0.3)
    tone(2093, notes.length * 0.08, 0.9, 'square', 0.06)
}
const vibrate = (pattern) => navigator.vibrate && navigator.vibrate(pattern)

// ---------- particles ----------
function burst() {
    particles.value = Array.from({ length: 48 }, (_, i) => {
        const angle = Math.random() * Math.PI * 2
        const dist = 140 + Math.random() * 280
        return {
            id: i,
            dx: Math.round(Math.cos(angle) * dist),
            dy: Math.round(Math.sin(angle) * dist) - 80,
            sz: 4 + Math.round(Math.random() * 8),
            d: Math.round(Math.random() * 150),
            h: Math.round(Math.random() * 360),
        }
    })
}
function makeConfetti() {
    confetti.value = Array.from({ length: 70 }, (_, i) => ({
        id: i,
        x: Math.round(Math.random() * 100),
        sx: Math.round(Math.random() * 160 - 80),
        r: Math.round(Math.random() * 900 - 450),
        dur: (2.2 + Math.random() * 1.8).toFixed(2),
        d: (Math.random() * 0.8).toFixed(2),
        h: Math.round(Math.random() * 360),
    }))
}

// ---------- data ----------
async function loadPokemon() {
    const myToken = ++loadToken
    const id = BASE_FORMS[Math.floor(Math.random() * BASE_FORMS.length)]
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
    const data = await res.json()
    if (myToken !== loadToken) return
    card.value = {
        id,
        name: prettyName(data.name),
        img: data.sprites.other['official-artwork'].front_default,
        sprite:
            data.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default ||
            data.sprites.front_default,
        types: data.types.map((t) => t.type.name),
        isNew: !owned.value.has(id),
    }
}

// ---------- flow ----------
function choosePack() {
    if (packCount.value > 0) stage.value = 'idle'
}

async function openPack() {
    if (stage.value !== 'idle' || packCount.value <= 0) return

    clearTimers()
    card.value = null
    stage.value = 'zoom'
    tone(180, 0, 0.3, 'sine', 0.15)

    try {
        await loadPokemon()

        if (!card.value) return

        after(800, () => {
            if (stage.value === 'zoom') stage.value = 'ready'
        })
    } catch (error) {
        console.error('Failed to load Pokémon:', error)
        reset()
    }
}

function onMove(e) {
    if (dragging.value) {
        updateDrag(e)
        return
    }
    if (!['ready', 'tear', 'rise'].includes(stage.value)) return
    const x = (e.clientX / window.innerWidth - 0.5) * 2
    const y = (e.clientY / window.innerHeight - 0.5) * 2
    ry.value = x * 18
    rx.value = -y * 18
}

// ---------- drag to tear ----------
function animateTear(to, ms, done) {
    cancelAnimationFrame(tearRaf)
    const from = tearProgress.value
    const startTime = performance.now()
    const step = (now) => {
        const t = Math.min(1, (now - startTime) / ms)
        const eased = 1 - Math.pow(1 - t, 3)
        tearProgress.value = from + (to - from) * eased
        if (t < 1) tearRaf = requestAnimationFrame(step)
        else if (done) done()
    }
    tearRaf = requestAnimationFrame(step)
}

function onPackDown(e) {
    if (stage.value !== 'ready' || !card.value || finishing) return
    cancelAnimationFrame(tearRaf)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragging.value = true
    dragStartX = e.clientX
    dragWidth = e.currentTarget.getBoundingClientRect().width
    dragMoved = 0
    dirLocked = false
    tearProgress.value = 0
}

function updateDrag(e) {
    const dx = e.clientX - dragStartX
    dragMoved = Math.max(dragMoved, Math.abs(dx))
    if (!dirLocked) {
        if (Math.abs(dx) < 6) return
        tearDir.value = dx > 0 ? 1 : -1
        dirLocked = true
    }
    const p = (dx * tearDir.value) / (dragWidth * 0.9)
    tearProgress.value = Math.max(0, Math.min(1, p))
    if (tearProgress.value >= 0.97) completeTear(160)
}

function onPackUp() {
    if (!dragging.value) return
    dragging.value = false
    if (dragMoved < 6) completeTear(450) // a plain click still opens it
    else if (tearProgress.value >= 0.6) completeTear(160)
    else animateTear(0, 350) // let go too early: the pack springs shut
}

function completeTear(ms) {
    if (finishing || stage.value !== 'ready') return
    finishing = true
    dragging.value = false
    animateTear(1, ms, tear)
}

function tear() {
    if (stage.value !== 'ready' || !card.value) return
    packCount.value--
    owned.value.add(card.value.id)
    // TODO: save the card to Supabase and mark one pack as opened.
    // Duplicates (card.isNew === false) should give bonus XP.
    burst()
    makeConfetti()
    rip()
    vibrate(30)
    stage.value = 'tear'
    after(700, () => {
        stage.value = 'rise'
        riser(HOLD / 1000)
    })
    after(700 + HOLD, () => {
        stage.value = 'flip'
        rx.value = 0
        ry.value = 0
        fanfare()
        vibrate([60, 40, 120])
    })
    after(700 + HOLD + 1000, () => {
        stage.value = 'revealed'
    })
}

function reset() {
    clearTimers()
    loadToken++
    stage.value = 'idle'
    rx.value = 0
    ry.value = 0
    card.value = null
    particles.value = []
    confetti.value = []
    cancelAnimationFrame(tearRaf)
    tearProgress.value = 0
    tearDir.value = 1
    dragging.value = false
    finishing = false
}

function backToPacks() {
    reset()
    stage.value = 'browse'
}
</script>

<template>
  <main :class="{ browsing: stage === 'browse' }" :style="theme" @pointermove="onMove">
    <div>
        <button onclick="history.back()" class="back">Back</button> 
    </div>
    <div v-if="stage !== 'browse'" class="backdrop" :class="{ on: flipped }"></div>

    <div v-if="stage === 'browse'" class="browse">
      <aside class="buddy">
        <div class="bubble">{{ packMessage }}</div>
        <div class="buddy-circle">
          <img class="buddy-img" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png" alt="Your buddy" />
        </div>
      </aside>
      <section class="shelf">
        <h1 class="shelf-title">Your Packs <span class="total">{{ packCount }}</span></h1>
        <p class="shelf-sub">Earn packs by finishing study sessions and acing quizzes</p>
        <div class="hero">
          <button class="hero-pack" :disabled="packCount === 0" aria-label="Open a pack" @click="choosePack">
            <span class="hero-glow"></span>
            <span v-if="packCount > 1" class="stack s1"></span>
            <span v-if="packCount > 2" class="stack s2"></span>
            <span class="pack-art hero-art"></span>
            <span class="shine-sweep"></span>
            <span v-if="packCount > 1" class="hero-count">×{{ packCount }}</span>
          </button>
          <button v-if="packCount > 0" class="openbutton primary" @click="choosePack">Open a pack</button>
          <p v-else class="empty">No packs left. Study to earn more!</p>
        </div>
      </section>
    </div>

    <div v-else class="packopen" :class="{ shaking: stage === 'tear' || stage === 'flip' }">
      <div class="pack-title leaver to-down" :class="{ away: stage !== 'idle' }">StudyDex Pack</div>

      <div
        class="pack-wrap"
        :class="[`stage-${stage}`, { opened, flipped, dragging }]"
        :style="[{ '--rx': rx + 'deg', '--ry': ry + 'deg' }, tearVars]"
        @pointerdown="onPackDown"
        @pointerup="onPackUp"
        @pointercancel="onPackUp"
      >
        <div class="aura"></div>
        <div v-if="flipped" class="rays"></div>
        <div class="pack-floor"></div>

        <!-- large static artwork: the backing once the reveal is done -->
        <div class="big">
          <img v-if="card" :src="card.img" :alt="card.name" />
        </div>

        <!-- trading card: face-down while rising, flips to show the Pokemon -->
        <div class="rc">
          <div class="rc-flip">
            <div class="rc-back"></div>
            <div class="rc-front">
              <img v-if="card" class="rc-art" :src="card.img" alt="Your new card" />
              <div class="rc-holo"></div>
              <div class="rc-foil"></div>
            </div>
          </div>
        </div>

        <div v-if="stage === 'revealed' && card" class="sprite-stage">
          <img :src="card.sprite" :alt="card.name" />
          <div class="sprite-shadow"></div>
        </div>

        <div class="pack-art pack-body"></div>
        <div class="pack-art pack-top"></div>
        <div class="pack-art pack-flap"></div>
        <div class="shine-sweep"></div>
        <div class="tear-line"></div>
        <div class="leak"></div>
        <div class="rip-glow"></div>
        <div class="rip-head"></div>
        <div class="tear-arrow" aria-hidden="true">»»»</div>

        <div v-if="opened" class="fx-top">
          <span
            v-for="p in particles"
            :key="p.id"
            class="spark"
            :style="{ '--dx': p.dx + 'px', '--dy': p.dy + 'px', '--sz': p.sz + 'px', '--d': p.d + 'ms', '--h': p.h }"
          ></span>
        </div>
        <div v-if="flipped" class="fx-mid">
          <span class="ring"></span>
          <span class="ring r2"></span>
        </div>
      </div>

      <button
        class="openbutton primary leaver to-down"
        :class="{ away: stage !== 'idle' }"
        @click="openPack"
      >
        Open
      </button>
    </div>

    <div v-if="stage !== 'browse'" class="screen-fx" aria-hidden="true">
      <div v-if="opened" class="flash"></div>
      <div v-if="flipped" class="flash flash2"></div>
      <template v-if="flipped">
        <span
          v-for="c in confetti"
          :key="c.id"
          class="confetti"
          :style="{ '--x': c.x, '--sx': c.sx + 'px', '--r': c.r + 'deg', '--dur': c.dur + 's', '--d': c.d + 's', '--h': c.h }"
        ></span>
      </template>
    </div>

    <div v-if="stage === 'ready'" class="hint">Drag across the top of the pack to tear it open!</div>

    <div v-if="stage === 'revealed' && card" class="reveal-info">
      <div class="found">You found</div>
      <div class="card-name">{{ card.name }}</div>
      <div class="chips">
        <span v-if="card.isNew" class="chip chip-new">NEW!</span>
        <span v-else class="chip chip-xp">Duplicate: +25 XP</span>
        <span
          v-for="(t, i) in card.types"
          :key="t"
          class="chip chip-type"
          :style="{ '--tc': TYPE_COLORS[t], '--n': i + 1 }"
        >{{ t }}</span>
      </div>
    </div>

    <div v-if="stage === 'revealed'" class="reveal-actions">
      <button class="openbutton small" @click="backToPacks">Back to packs</button>
      <button v-if="packCount > 0" class="openbutton small primary" @click="reset">Open another ({{ packCount }} left)</button>
    </div>

    <button v-if="stage !== 'browse'" class="openbutton small back leaver to-left" :class="{ away: stage !== 'idle' }" @click="backToPacks">← Back to packs</button>
    <button v-if="stage !== 'browse'" class="openbutton small sound" @click="soundOn = !soundOn">{{ soundOn ? '🔊' : '🔇' }}</button>
  </main>
</template>

<style scoped>
    main{
        min-height: 100vh;
        background-image:  linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2)),url('/backgrounds/rewards_bg.png');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        display:flex;
        justify-content: center;
        align-items: center;
        touch-action: none;
        font-family: Verdana, Geneva, Tahoma, sans-serif;
    }


    main.browsing{ touch-action: auto; }
    main:not(.browsing){ overflow: hidden; }

    /* ---------- buttons ---------- */
    .openbutton{
        font-size: 40px;
        font-family: inherit;
        background-color: white;
        border-radius: 10px;
        border: 3px solid gray;
        padding: 6px 28px;
        color: rgb(51, 51, 51);
        box-shadow: 0 6px 0 gray;
    }

    .openbutton.primary{
        background-color: rgb(255, 215, 37);
        border-color: rgb(200, 160, 0);
        box-shadow: 0 6px 0 rgb(200, 160, 0);
        color: rgb(100, 45, 0);
    }

    .openbutton.small{
        font-size: 22px;
        padding: 6px 20px;
    }

    .openbutton:hover{
        cursor: pointer;
        border: 3px solid yellow;
        box-shadow: 0 6px 0 rgb(200, 160, 0), 0 0 20px rgba(255, 230, 0, 0.8);
    }

    .openbutton:active{
        transform: translateY(5px);
        box-shadow: 0 1px 0 gray;
    }

    .back{
        font-family: inherit;
        font-size: 24px;
        padding: 8px 20px;
        border: 3px solid rgb(200, 160, 0);
        border-radius: 12px;
        background-color: rgb(255, 215, 37);
        color: rgb(100, 45, 0);
        box-shadow: 0 6px 0 rgb(200, 160, 0);
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .back:hover{
        cursor: pointer;
        border: 3px solid yellow;
        box-shadow: 0 6px 0 rgb(200, 160, 0), 0 0 20px rgba(255, 230, 0, 0.8);
    }

    .leaver{
        transition: opacity 0.5s ease, translate 0.6s ease, transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }
    .leaver.away{
        opacity: 0;
        pointer-events: none;
    }
    .to-down.away{ translate: 0 150px; }
    .to-left.away{ translate: -150% 0; }
    .to-right.away{ translate: 150% 0; }

    .back{
        position: fixed;
        top: 24px;
        left: 24px;
        z-index: 5;
    }

    .sound{
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 5;
    }

    /* ---------- the pack artwork ---------- */
    .pack-art{
        --pw: 240px;
        display: block;
        position: relative;
        width: var(--pw);
        aspect-ratio: 1050 / 1479;
        background: url('../../public/assets/reward_pack.png') center / 100% 100% no-repeat;
    }


    .shine-sweep{
        position: absolute;
        inset: 0;
        z-index: 3;
        -webkit-mask: url('../../public/assets/reward_pack.png') center / 100% 100% no-repeat;
        mask: url('../../public/assets/reward_pack.png') center / 100% 100% no-repeat;
        pointer-events: none;
        background: linear-gradient(105deg, transparent 38%, rgba(255, 255, 255, 0.75) 50%, transparent 62%) 130% 0 / 250% 100% no-repeat;
        animation: sweep 3.4s ease-in-out infinite;
    }
    /* .opened .shine-sweep{ opacity: 0; } */
    .opened .shine-sweep, .stage-ready .shine-sweep{ display: none; }


    /* ---------- opening scene ---------- */
    .packopen{
        --k: 1.5;
        display:flex;
        flex-direction: column;
        padding: 30px;
        gap: 20px;
        position: relative;
        z-index: 1;
    }
    /* .packopen.shaking{ animation: shake 0.5s linear; } */

    .pack-title{
        text-align: center;
        font-size: 30px;
        font-weight: bold;
        color: white;
        text-shadow: 1px 4px 6px rgba(0, 0, 0, 0.5);
    }

    .pack-wrap{
        --tear: 10%;
        --s: 1;
        display: grid;
        position: relative;
        width: 240px;
        align-self: center;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale(var(--s));
        transition: transform 0.9s cubic-bezier(0.2, 0.9, 0.25, 1.1);
    }
    .stage-zoom, .stage-ready, .stage-tear, .stage-rise, .stage-flip, .stage-revealed{ --s: 1.65; }
    .stage-ready, .stage-tear, .stage-rise{ transition: transform 0.1s ease-out; }
    .stage-flip, .stage-revealed{ transition: transform 0.6s cubic-bezier(0.2, 0.9, 0.25, 1); }
    .stage-ready{ cursor: grab; }
    .stage-ready.dragging{ cursor: grabbing; }
    .stage-tear{ animation: punch 0.4s ease-out; }

    .pack-wrap > .pack-art{
        grid-area: 1 / 1;
        justify-self: center;
        /* transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.3, 1), opacity 0.6s ease 0.1s; */
    }
    .pack-wrap.opened > .pack-art{
    transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.3, 1), opacity 0.6s ease 0.1s;
    }
    .pack-body{
        z-index: 2;
        clip-path: inset(var(--tear) 0 0 0);
    }
    .pack-top{
        z-index: 3;
        clip-path: inset(0 var(--rem-r, 0%) calc(100% - var(--tear)) var(--rem-l, 0%));
    }

    /* the part of the strip that has already been torn: it lifts up as you drag */
    .pack-flap{
        z-index: 3;
        clip-path: inset(0 var(--torn-r, 100%) calc(100% - var(--tear)) var(--torn-l, 0%));
        transform-origin: var(--flap-origin, 0%) var(--tear);
        transform: rotate(var(--flap-rot, 0deg));
    }
    .pack-wrap > .pack-flap{ transition: none; }
    .pack-wrap.opened > .pack-flap{
        transform: translate(130px, -300px) rotate(42deg);
        opacity: 0;
        transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.3, 1), opacity 0.6s ease 0.1s;
    }

    .opened .pack-top{
        transform: translate(130px, -300px) rotate(42deg);
        opacity: 0;
    }
    .flipped .pack-body{
        transform: translateY(90px) scale(0.92);
        opacity: 0;
    }

    .flipped .pack-floor{ opacity: 0; }

    .aura{
        position: absolute;
        left: 50%;
        top: 50%;
        width: 170%;
        aspect-ratio: 1;
        translate: -50% -50%;
        z-index: 0;
        border-radius: 50%;
        background: radial-gradient(circle, rgb(var(--c1) / 0.55), rgb(var(--c2) / 0.2) 40%, transparent 64%);
        opacity: 0.6;
        pointer-events: none;
        animation: breathe 2.4s ease-in-out infinite;
    }
    .flipped .aura{ animation-duration: 1.2s; }

    .tear-line {
        position: absolute;
        left: 50%;
        top: -3px;
        transform: translateX(-50%);
        width: 75%;
        height: var(--tear);
        box-sizing: border-box;
        border-bottom: 3px dashed rgba(255, 255, 255, 0.95);
        opacity: 0;
        z-index: 4;
        pointer-events: none;
    }

    .stage-ready .tear-line {
        opacity: 1;
        animation: tear-line-glow 1s ease-in-out infinite;
    }

    .leak {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        height: var(--tear);
        z-index: 4;
        border-bottom: 2px solid rgb(var(--c1));
        opacity: 0;
        pointer-events: none;
        box-shadow: none;
    }

    .stage-ready .leak {
        opacity: 0;
        animation: none;
    }

    @keyframes tear-line-glow {
        0%, 100% {
            border-bottom-color: rgba(255, 255, 255, 0.65);
            filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.35));
        }
        50% {
            border-bottom-color: #fff;
            filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.95));
        }
    }

    /* glowing rip that follows your drag, in the Pokemon's type colours */
    /* .rip-glow{
        position: absolute;
        left: 11%;
        top: calc(var(--tear) - 1px);
        width: 75.5%;
        height: 0;
        z-index: 5;
        border-top: 3px solid #fff;
        box-shadow: 0 0 14px 4px rgb(var(--c1)), 0 0 30px 8px rgb(var(--c2) / 0.7);
        opacity: min(calc(var(--tp, 0) * 40), 0.65);
        pointer-events: none;
    } */
    .rip-head{
        position: absolute;
        left: var(--head, 0%);
        top: var(--tear);
        width: 16px;
        height: 16px;
        margin: -8px 0 0 -8px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 0 14px 6px rgb(var(--c1)), 0 0 26px 10px rgb(var(--c2) / 0.7);
        opacity: min(calc(var(--tp, 0) * 40), 0.8);
        z-index: 5;
        pointer-events: none;
    }
    .opened .rip-glow, .opened .rip-head{
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    .tear-arrow{
        position: absolute;
        left: 6%;
        top: var(--tear);
        translate: 0 -50%;
        z-index: 5;
        font-size: 28px;
        font-weight: 900;
        letter-spacing: -2px;
        color: #fff;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.9);
        opacity: 0;
        pointer-events: none;
    }
    .stage-ready:not(.dragging) .tear-arrow{ animation: arrow-slide 1.6s ease-in-out infinite; }

    /* ---------- the trading card (rise and flip) ---------- */
    .rc{
        position: absolute;
        left: 50%;
        top: 50%;
        translate: -50% -50%;
        width: 88%;
        aspect-ratio: 5 / 7;
        z-index: 1;
        perspective: 900px;
        opacity: 0;
        transition: transform 0.8s cubic-bezier(0.2, 0.9, 0.25, 1.1), opacity 0.25s ease;
    }
    .opened .rc{ opacity: 1; }
    .stage-tear .rc, .stage-rise .rc{ transform: translateY(-45%); }
    .stage-rise .rc{ animation: wobble 0.25s ease-in-out infinite alternate; }
    .stage-flip .rc{ transform: scale(1.1); }
    .stage-revealed .rc{
        opacity: 0;
        transform: scale(1.1);
        transition: transform 0.9s ease-out, opacity 0.6s ease 0.1s;
    }

    .rc-flip{
        position: relative;
        width: 100%;
        height: 100%;
        transform-style: preserve-3d;
        transition: transform 0.9s cubic-bezier(0.25, 1.3, 0.4, 1);
    }
    .flipped .rc-flip{ transform: rotateY(180deg); }

    .rc-back, .rc-front{
        position: absolute;
        inset: 0;
        border-radius: 14px;
        overflow: hidden;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
    }
    .rc-back{
        background:
            repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.07) 0 6px, transparent 6px 12px),
            linear-gradient(145deg, #2b4a7d, #14233f);
        box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.85), 0 0 24px 2px rgb(var(--c1) / 0.6);
    }
    .stage-rise .rc-back{ animation: glow-pulse 0.5s ease-in-out infinite alternate; }
    .rc-back::before{
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        width: 46%;
        aspect-ratio: 1;
        translate: -50% -50%;
        border-radius: 50%;
        border: 4px solid #0d172b;
        background: linear-gradient(#e63946 0 47%, #0d172b 47% 53%, #fff 53% 100%);
        box-shadow: 0 0 22px rgb(var(--c1) / 0.8);
    }
    .rc-back::after{
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        width: 13%;
        aspect-ratio: 1;
        translate: -50% -50%;
        border-radius: 50%;
        background: #fff;
        border: 4px solid #0d172b;
    }

    .rc-front{
        transform: rotateY(180deg);
        background: radial-gradient(circle at 50% 38%, rgb(var(--c1) / 0.95) 0%, rgb(var(--c2) / 0.75) 55%, #1b2340 100%);
        box-shadow: inset 0 0 0 4px #fff, 0 0 40px 6px rgb(var(--c1) / 0.7);
    }
    .rc-art{
        position: absolute;
        left: 6%;
        top: 6%;
        width: 88%;
        height: 88%;
        object-fit: contain;
        filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.45));
    }
    .rc-holo{
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.7) 48%, transparent 60%) 100% 0 / 250% 100% no-repeat;
    }
    .flipped .rc-holo{ animation: holo 1.3s 0.35s ease-out; }
    .rc-foil{
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(115deg, #ff2d95, #ffb800, #3dff7a, #00cfff, #8a2dff, #ff2d95);
        background-size: 400% 400%;
        mix-blend-mode: screen;
        opacity: 0.3;
        animation: foil 4s ease-in-out infinite alternate;
    }

    /* ---------- the large artwork backing (after the reveal) ---------- */
    .big{
        grid-area: 1 / 1;
        z-index: 1;
        place-self: center;
        width: 160%;
        opacity: 0;
        transform: translateY(-6%) scale(1.1);
        pointer-events: none;
        transition: transform 1s cubic-bezier(0.2, 1.2, 0.3, 1) 0.1s, opacity 0.7s ease 0.1s;
    }
    .big > img{
        display: block;
        width: 0;
        min-width: 100%;
        filter: drop-shadow(0 0 22px rgb(var(--c1) / 0.85)) drop-shadow(0 12px 18px rgba(0, 0, 0, 0.4));
    }
    .stage-revealed .big{
        opacity: 0.8;
        transform: scale(1.2);
        animation: big-fade 2.5s 1.5s ease-out forwards;

    }

    .rays{
        position: absolute;
        left: 50%;
        top: 50%;
        width: 300%;
        aspect-ratio: 1;
        translate: -50% -50%;
        z-index: 0;
        pointer-events: none;
        background: repeating-conic-gradient(rgb(var(--c1) / 0.45) 0deg 9deg, rgb(var(--c2) / 0.28) 9deg 18deg);
        -webkit-mask-image: radial-gradient(circle, #000 12%, transparent 62%);
        mask-image: radial-gradient(circle, #000 12%, transparent 62%);
        animation: spin 16s linear infinite, fade-in 0.8s ease both;
    }

    /* ---------- the animated sprite, big and in front ---------- */
    .sprite-stage{
        position: absolute;
        left: 50%;
        top: 60%;
        translate: -50% -50%;
        scale: 3;
        z-index: 4;
        pointer-events: none;
        animation: pop 0.6s 0.25s cubic-bezier(0.2, 1.5, 0.4, 1) both;
    }
    .sprite-stage img{
        display: block;
        image-rendering: pixelated;
        animation: bob 1.2s ease-in-out infinite;
    }
    .sprite-shadow{
        position: absolute;
        left: 50%;
        bottom: -4px;
        translate: -50% 0;
        width: 100%;
        height: 8px;
        border-radius: 50%;
        background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.55), transparent 70%);
        animation: shadow 1.2s ease-in-out infinite;
    }

    /* ---------- colourful reveal backdrop and effects ---------- */
    .backdrop{
        position: fixed;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        pointer-events: none;
        background: radial-gradient(circle at 50% 50%, rgb(var(--c1) / 0.6) 0%, rgb(var(--c2) / 0.4) 38%, rgba(12, 16, 40, 0.8) 100%);
        opacity: 0;
        transition: opacity 0.9s ease;
    }
    .backdrop::after{
        content: '';
        position: absolute;
        inset: -30%;
        background: conic-gradient(from 0deg, rgb(255 80 120 / 0.22), rgb(255 200 60 / 0.22), rgb(80 220 140 / 0.22), rgb(70 160 255 / 0.22), rgb(180 100 255 / 0.22), rgb(255 80 120 / 0.22));
        mix-blend-mode: screen;
    }
    .backdrop.on{
        opacity: 1;
        animation: drift 8s ease-in-out infinite alternate;
    }

    .fx-top{
        position: absolute;
        left: 50%;
        top: var(--tear);
        width: 0;
        height: 0;
        z-index: 5;
        pointer-events: none;
    }
    .spark{
        position: absolute;
        left: 0;
        top: 0;
        width: var(--sz);
        height: var(--sz);
        margin: calc(var(--sz) / -2) 0 0 calc(var(--sz) / -2);
        border-radius: 50%;
        background: hsl(var(--h) 100% 70%);
        box-shadow: 0 0 10px 2px hsl(var(--h) 100% 60%);
        opacity: 0;
        animation: spark 0.95s var(--d) cubic-bezier(0.12, 0.8, 0.3, 1) forwards;
    }

    .fx-mid{
        position: absolute;
        left: 50%;
        top: 50%;
        width: 0;
        height: 0;
        z-index: 5;
        pointer-events: none;
    }
    .ring{
        position: absolute;
        left: 0;
        top: 0;
        width: 120px;
        height: 120px;
        margin: -60px 0 0 -60px;
        border-radius: 50%;
        border: 5px solid rgb(var(--c1));
        box-shadow: 0 0 24px rgb(var(--c1)), inset 0 0 24px rgb(var(--c1));
        opacity: 0;
        animation: ring 1s 0.3s cubic-bezier(0.1, 0.7, 0.3, 1) forwards;
    }
    .ring.r2{
        border-width: 3px;
        border-color: rgb(var(--c2));
        box-shadow: 0 0 24px rgb(var(--c2)), inset 0 0 24px rgb(var(--c2));
        animation-delay: 0.5s;
    }

    .screen-fx{
        position: fixed;
        inset: 0;
        z-index: 3;
        pointer-events: none;
        overflow: hidden;
    }
    .flash{
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 50% 50%, #fff 0%, rgb(var(--c1) / 0.85) 28%, rgb(var(--c2) / 0.4) 48%, transparent 68%);
        opacity: 0;
        animation: flash 0.9s ease-out forwards;
    }
    .flash2{
        animation-duration: 0.8s;
        animation-delay: 0.3s;
    }
    .confetti{
        position: absolute;
        top: 0;
        left: calc(var(--x) * 1%);
        width: 10px;
        height: 16px;
        border-radius: 2px;
        background: hsl(var(--h) 90% 60%);
        opacity: 0;
        animation: fall var(--dur) var(--d) cubic-bezier(0.3, 0.1, 0.6, 1) forwards;
    }

    /* ---------- reveal text (top of the screen, clear of the sprite) ---------- */
    .hint{
        position: fixed;
        z-index: 4;
        bottom: 8vh;
        left: 50%;
        translate: -50% 0;
        font-size: 40px;
        color: white;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
        pointer-events: none;
        animation: pulse 1s ease-in-out infinite;
        text-align: center;
    }

    .reveal-info{
        position: fixed;
        z-index: 4;
        left: 0;
        right: 0;
        top: 3vh;
        text-align: center;
        pointer-events: none;
    }
    .found{
        display: inline-block;
        font-size: 20px;
        font-weight: bold;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        color: rgb(100, 45, 0);
        background-color: rgb(255, 215, 37);
        box-shadow: 0 4px 0 rgb(200, 160, 0);
        border-radius: 999px;
        padding: 4px 22px 4px 26px;
        box-shadow: 0 0 22px rgb(var(--c1) / 0.8);
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        animation: banner-in 0.5s 0.15s cubic-bezier(0.2, 1.5, 0.4, 1) both;
    }
    .card-name{
        font-size: 70px;
        color: white;
        text-transform: capitalize;
        text-shadow: 0 4px 0 rgb(var(--c1)), 0 8px 18px rgba(0, 0, 0, 0.45);
        animation: slam 0.6s 0.3s cubic-bezier(0.2, 1.5, 0.4, 1) both;
    }
    .chips{
        margin-top: 8px;
        display: flex;
        justify-content: center;
        gap: 10px;
    }
    .chip{
        font-size: 20px;
        font-weight: bold;
        padding: 4px 16px;
        border-radius: 999px;
        box-shadow: 0 4px 0 rgba(0, 0, 0, 0.25);
        animation: banner-in 0.5s 0.75s cubic-bezier(0.2, 1.5, 0.4, 1) both;
    }
    .chip-new{
        background-color: #ff3d6e;
        color: #fff;
    }
    .chip-xp{
        background-color: rgb(255, 215, 37);
        color: rgb(100, 45, 0);
    }
    .chip-type{
        background-color: rgb(var(--tc));
        color: #fff;
        text-transform: capitalize;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
        animation-delay: calc(0.85s + var(--n) * 0.1s);
    }

    .reveal-actions{
        position: fixed;
        bottom: 6vh;
        left: 50%;
        translate: -50% 0;
        display: flex;
        gap: 20px;
        z-index: 5;
        animation: rise-in 0.5s 1s ease-out both;
    }

    /* ---------- browse page ---------- */
    .browse{
        width: min(1200px, 100%);
        box-sizing: border-box;
        padding: 32px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
        gap: 32px;
        align-items: center;
    }

    .buddy{
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
    }

    .bubble{
        position: relative;
        background-color: white;
        border: 4px solid rgb(27, 47, 79);
        border-radius: 8px;
        padding: 14px 20px;
        font-size: 20px;
        font-weight: bold;
        text-align: center;
        color: rgb(27, 47, 79);
        box-shadow: 4px 4px 0 rgba(27, 47, 79, 0.35);
        animation: pop-in 0.5s cubic-bezier(0.2, 1.5, 0.4, 1) both;
    }
    .bubble::after{
        content: '';
        position: absolute;
        bottom: -22px;
        left: 36px;
        border: 10px solid transparent;
        border-top: 14px solid rgb(27, 47, 79);
    }

    .buddy-circle{
        width: min(320px, 100%);
        aspect-ratio: 1;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.8);
        box-shadow: rgba(100, 100, 111, 0.7) 0px 7px 29px 0px;
        display: grid;
        place-items: center;
    }
    .buddy-circle img{ width: 85%; }
    .buddy-img{ animation: bob-slow 3.2s ease-in-out infinite; }

    .shelf{
        background-color: rgba(255, 255, 255, 0.55);
        border-radius: 40px;
        padding: 28px;
        box-shadow: rgba(100, 100, 111, 0.7) 0px 7px 29px 0px;
        backdrop-filter: blur(6px);
    }
    .shelf-title{
        margin: 0 0 6px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 30px;
        color: rgb(27, 47, 79);
    }
    .shelf-sub{
        margin: 0 0 20px;
        color: rgba(27, 47, 79, 0.7);
    }
    .total{
        background-color: rgb(255, 215, 37);
        color: rgb(100, 45, 0);
        border-radius: 999px;
        padding: 2px 14px;
        font-size: 20px;
    }

    .hero{
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 28px;
        padding: 12px 0 4px;
    }
    .hero-pack{
        position: relative;
        isolation: isolate;
        border: 0;
        background: none;
        padding: 0;
        cursor: pointer;
        transition: transform 0.25s cubic-bezier(0.2, 1.4, 0.4, 1);
        animation: bob-slow 3.2s ease-in-out infinite;
    }
    .hero-pack:hover{ transform: scale(1.06) rotate(-2deg); }
    .hero-pack:active{ transform: scale(0.98); }
    .hero-pack:disabled{
        cursor: default;
        filter: grayscale(0.85) opacity(0.6);
        animation: none;
    }
    .hero-art{
        --pw: 210px;
        filter: drop-shadow(0 12px 14px rgba(0, 0, 0, 0.35));
    }
    .hero-glow{
        position: absolute;
        inset: -25%;
        z-index: -2;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 214, 90, 0.65), transparent 62%);
        pointer-events: none;
        animation: breathe 2.4s ease-in-out infinite;
    }
    .stack{
        position: absolute;
        inset: 0;
        z-index: -1;
        border-radius: 12px;
        background: url('../../public/assets/reward_pack.png') center / 100% 100% no-repeat;
        filter: brightness(0.75) saturate(0.9);
        
    }
    .stack.s1{
        rotate: -10deg;
        translate: -30px 8px;
    }
    .stack.s2{
        rotate: 13deg;
        translate: 20px 11px;
    }

    .hero-count{
        position: absolute;
        top: -12px;
        right: -14px;
        z-index: 4;
        background-color: rgb(255, 215, 37);
        color: rgb(100, 45, 0);
        font-weight: bold;
        font-size: 22px;
        border-radius: 999px;
        padding: 4px 14px;
        box-shadow: 0 3px 0 rgb(200, 160, 0), 0 6px 14px rgba(0, 0, 0, 0.3);
    }

    .empty{
        text-align: center;
        color: rgb(27, 47, 79);
        font-size: 18px;
    }

    /* ---------- keyframes ---------- */
    @keyframes shake{
        0%, 100%{ translate: 0 0; }
        10%{ translate: calc(-7px * var(--k)) calc(4px * var(--k)); }
        20%{ translate: calc(6px * var(--k)) calc(-5px * var(--k)); }
        30%{ translate: calc(-5px * var(--k)) calc(-3px * var(--k)); }
        40%{ translate: calc(5px * var(--k)) calc(4px * var(--k)); }
        50%{ translate: calc(-3px * var(--k)) calc(2px * var(--k)); }
        60%{ translate: calc(3px * var(--k)) calc(-2px * var(--k)); }
        80%{ translate: calc(-1px * var(--k)) calc(1px * var(--k)); }
    }
    @keyframes punch{
        0%{ scale: 1; }
        30%{ scale: 1.08; }
        100%{ scale: 1; }
    }
    @keyframes jitter{
        0%, 100%{ translate: 0 0; }
        25%{ translate: 1.5px -1px; }
        50%{ translate: -1.5px 1px; }
        75%{ translate: 1px 1.5px; }
    }
    @keyframes breathe{
        0%, 100%{ scale: 0.92; opacity: 0.45; }
        50%{ scale: 1.06; opacity: 0.9; }
    }
    @keyframes sweep{
        0%, 55%{ background-position: 130% 0; }
        100%{ background-position: -30% 0; }
    }
    @keyframes leak{
        from{ opacity: 0.35; }
        to{ opacity: 1; }
    }
    @keyframes arrow-slide{
        0%{ opacity: 0; translate: 0 -50%; }
        20%, 70%{ opacity: 1; }
        100%{ opacity: 0; translate: 160px -50%; }
    }
    @keyframes wobble{
        from{ rotate: -1.5deg; }
        to{ rotate: 1.5deg; }
    }
    @keyframes glow-pulse{
        from{ box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.85), 0 0 18px 2px rgb(var(--c1) / 0.5); }
        to{ box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.85), 0 0 50px 14px rgb(var(--c1) / 0.95); }
    }
    @keyframes holo{
        from{ background-position: 100% 0; }
        to{ background-position: 0% 0; }
    }
    @keyframes foil{
        from{ background-position: 0% 0%; }
        to{ background-position: 100% 100%; }
    }
    @keyframes spark{
        0%{ opacity: 1; translate: 0 0; scale: 1; }
        70%{ opacity: 1; }
        100%{ opacity: 0; translate: var(--dx) var(--dy); scale: 0.2; }
    }
    @keyframes ring{
        0%{ opacity: 0.95; scale: 0.2; }
        100%{ opacity: 0; scale: 9; }
    }
    @keyframes flash{
        0%{ opacity: 0; scale: 0.6; }
        12%{ opacity: 0.9; scale: 1; }
        100%{ opacity: 0; scale: 1.5; }
    }
    @keyframes fall{
        0%{ opacity: 1; translate: 0 -8vh; rotate: 0deg; }
        100%{ opacity: 1; translate: var(--sx) 112vh; rotate: var(--r); }
    }
    @keyframes spin{
        to{ rotate: 360deg; }
    }
    @keyframes drift{
        from{ scale: 1; }
        to{ scale: 1.08; }
    }
    @keyframes fade-in{
        from{ opacity: 0; }
        to{ opacity: 1; }
    }
    @keyframes pop{
        from{ opacity: 0; transform: translateY(20px) scale(0.6); }
        to{ opacity: 1; transform: none; }
    }
    @keyframes bob{
        0%, 100%{ transform: translateY(0); }
        50%{ transform: translateY(-4px); }
    }
    @keyframes shadow{
        0%, 100%{ transform: scale(1); opacity: 0.6; }
        50%{ transform: scale(0.8); opacity: 0.4; }
    }
    @keyframes banner-in{
        from{ opacity: 0; scale: 0.3; }
        to{ opacity: 1; scale: 1; }
    }
    @keyframes slam{
        from{ opacity: 0; scale: 2.6; }
        to{ opacity: 1; scale: 1; }
    }
    @keyframes rise-in{
        from{ opacity: 0; translate: -50% 30px; }
        to{ opacity: 1; translate: -50% 0; }
    }
    @keyframes pulse{
        0%, 100%{ opacity: 0.4; }
        50%{ opacity: 1; }
    }
    @keyframes pop-in{
        from{ opacity: 0; scale: 0.6; }
        to{ opacity: 1; scale: 1; }
    }
    @keyframes bob-slow{
        0%, 100%{ translate: 0 0; }
        50%{ translate: 0 -10px; }
    }

    @keyframes big-fade{
    from{ opacity: 0.8; }
    to{ opacity: 0; }
}

    /* ---------- small screens and reduced motion ---------- */
    @media (max-height: 760px){
        .sprite-stage{ scale: 1.7; }
        .card-name{ font-size: 48px; }
    }
    @media (max-width: 800px){
        .browse{ grid-template-columns: 1fr; padding: 16px; }
        .buddy-circle{ width: min(200px, 100%); }
        .stage-zoom, .stage-ready, .stage-tear, .stage-rise, .stage-flip, .stage-revealed{ --s: 1.25; }
        .sprite-stage{ scale: 1.5; }
        .card-name{ font-size: 44px; }
    }
    @media (prefers-reduced-motion: reduce){
        .shaking, .aura, .rays, .confetti, .shine-sweep, .buddy-img, .hero-pack, .backdrop, .tear-arrow,
        .stage-ready .pack-body, .stage-ready .pack-top{ animation: none !important; }
    }
</style>