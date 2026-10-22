<script setup>
import { ref, computed } from 'vue'

const stage = ref('browse')
const rx = ref(0)
const ry = ref(0)
const card = ref(null)

// packs the user owns (replace with a Supabase fetch of unopened packs)
const packs = ref([
    { type: 'G5', count: 2, hue: 0 },
    { type: 'G6', count: 1, hue: 320 },
    { type: 'G7', count: 3, hue: 150 },
    { type: 'G8', count: 1, hue: 60 },
    { type: 'G9', count: 1, hue: 210 },
    { type: 'G1', count: 2, hue: 25 },
])
const selectedPack = ref(null)
const totalPacks = computed(() => packs.value.reduce((n, p) => n + p.count, 0))

async function loadPokemon() {
    const id = Math.floor(Math.random() * 151) + 1
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
    const data = await res.json()
    card.value = {
        id,
        name: data.name.replace(/-/g, ' '),
        img: data.sprites.other['official-artwork'].front_default,
        sprite:
            data.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default ||
            data.sprites.front_default,
    }
}

function choosePack(p) {
    selectedPack.value = p
    stage.value = 'idle'
}

function openPack() {
  stage.value = 'zoom'
  loadPokemon()
  setTimeout(() => (stage.value = 'ready'), 800)
}

function onMove(e) {
  if (stage.value !== 'ready' && stage.value !== 'tear') return
  const x = (e.clientX / window.innerWidth - 0.5) * 2
  const y = (e.clientY / window.innerHeight - 0.5) * 2
  ry.value = x * 18
  rx.value = -y * 18
}

function tear() {
  if (stage.value !== 'ready') return
  if (!card.value) return
  selectedPack.value.count--
  // TODO: save the card to Supabase and mark one pack as opened
  stage.value = 'tear'
  setTimeout(() => {
        stage.value = 'revealed'
        rx.value = 0
        ry.value = 0
    }, 900)
}

function reset() {
  stage.value = 'idle'
  rx.value = 0
  ry.value = 0
  card.value = null
}

function backToPacks() {
    reset()
    packs.value = packs.value.filter((p) => p.count > 0)
    selectedPack.value = null
    stage.value = 'browse'
}
</script>

<template>
  <main :class="{ browsing: stage === 'browse', dim: stage !== 'browse' && stage !== 'idle' }" @pointermove="onMove">
    <div v-if="stage === 'browse'" class="browse">
      <aside class="buddy">
        <div class="bubble">Let's rip some packs!</div>
        <div class="buddy-circle">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png" alt="Your buddy" />
        </div>
      </aside>
      <section class="shelf">
        <h1 class="shelf-title">Your Packs <span class="total">{{ totalPacks }}</span></h1>
        <div v-if="packs.length" class="pack-grid">
          <button v-for="p in packs" :key="p.type" class="pack-tile" :style="{ '--hue': p.hue + 'deg' }" @click="choosePack(p)">
            <img class="tile-img" src="../../public/assets/pack_unopened.png" :alt="p.type + ' pack'" />
            <span class="tile-label">{{ p.type }}</span>
            <span v-if="p.count > 1" class="tile-count">×{{ p.count }}</span>
          </button>
        </div>
        <div v-else class="empty">
          <p>No packs yet. Study to earn some!</p>
        </div>
      </section>
    </div>

    <div v-else class="packopen">
      <div class="pack-title leaver to-down" :class="{ away: stage !== 'idle' }">{{ selectedPack?.type }} Pack</div>
      <div
        class="pack-wrap"
        :class="`stage-${stage}`"
        :style="{ '--rx': rx + 'deg', '--ry': ry + 'deg' }"
        @click="tear"
      >
        <div class="card">
          <img v-if="card" :src="card.img" alt="Your new card" />
          <div v-if="card && stage === 'revealed'" class="sprite-stage">
                <img :src="card.sprite" :alt="card.name">
                <div class="sprite-shadow"></div>
            </div>
          <div v-if="stage === 'revealed'" class="rays"></div>
        </div>
        <img class="pack-body" src="../../public/assets/pack_unopened.png" alt="pack" />
        <img class="pack-top" src="../../public/assets/pack_unopened.png" alt="pack" />
        <div class="tear-line"></div>
      </div>

      <button
        class="openbutton primary leaver to-down"
        :class="{ away: stage !== 'idle' }"
        @click="openPack"
      >
        Open
      </button>
    </div>

    <div v-if="stage === 'ready'" class="hint">Click the pack to tear it open!</div>
    <div v-if="stage === 'revealed'" class="card-name">{{ card.name }}</div>
    <div v-if="stage === 'revealed'" class="reveal-actions">
      <button class="openbutton small" @click="backToPacks">Back to packs</button>
      <button v-if="selectedPack && selectedPack.count > 0" class="openbutton small primary" @click="reset">Open another ({{ selectedPack.count }} left)</button>
    </div>
    <button v-if="stage !== 'browse'" class="openbutton small back leaver to-left" :class="{ away: stage !== 'idle' }" @click="backToPacks">← Back to packs</button>
  </main>
</template>

<style scoped>
    main{
        min-height: 100vh;
        background-image: url('/backgrounds/rewards_bg.png');
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


    .nav{
        text-align: center;
    }

    .packopen{
        display:flex;
        flex-direction: column;
        padding: 30px;
        gap: 20px;
        position: relative;
        z-index: 1;
    }

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

    .pack-wrap{
        --tear: 14%;
        --s: 1;
        display: grid;
        position: relative;
        transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale(var(--s));
        transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .stage-idle::before, .stage-ready::before{ opacity: 1; }
    .stage-idle{ animation: float 3s ease-in-out infinite; }
    .stage-zoom, .stage-ready, .stage-tear, .stage-revealed{ --s: 1.8; }
    .stage-ready, .stage-tear{ transition: transform 0.1s ease-out; }
    .stage-revealed{ transition: transform 0.5s ease-out; }
    .stage-ready{ cursor: pointer; }

    .pack-wrap > img{
        grid-area: 1/1;
        image-rendering: pixelated;
        transition: transform 0.8s ease, opacity 0.8s ease;
        align-items: center;
        justify-content: center;
    }
    .pack-body{
        z-index: 2;
        clip-path: inset(var(--tear) 0 0 0);
    }
    .pack-top{
        z-index: 3;
        clip-path: inset(0 0 calc(100% - var(--tear)) 0);
    }
    .stage-tear .pack-top, .stage-revealed .pack-top{
        transform: translate(40px, -70px) rotate(20deg);
        opacity: 0;
    }
    .stage-revealed .pack-body{
        transform: translateY(60px);
        opacity: 0;
    }

    .card{
        grid-area: 1 / 1;
        z-index: -1;
        place-self: center;
        width: 160%;
        opacity: 0;
        transition: transform 1s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.7s ease;
        background: none;
        box-shadow: none;
        border:none;
    }

    .card-name{
        z-index:1;
        position: fixed;
        width: 100%;
        text-align: center;
        bottom: 16vh;
        left: 50%;
        translate: -50% 0;
        font-size: 70px;
        color: white;
        text-transform: capitalize;
        text-shadow: 1px 5px 7px rgba(0, 0, 0, 0.6);
        pointer-events: none;
        background: linear-gradient(rgb(255, 230, 0, 0.6),rgb(255, 230, 0, 0.0) );
    }

    .card > img{ width: 0; min-width: 100%; }

    .card{ position: relative; }

    .sprite-stage{
        position: absolute;
        left: 50%;
        bottom: 25%;
        translate: -50% 0;
        scale: 1.3;
        transform-origin: 50% 100%;
        z-index: 2;
        pointer-events: none;
        animation: pop 0.5s 0.3s ease-out both;
    }
    .sprite-stage img{
        display: block;
        image-rendering: pixelated;
        animation: bob 1.2s ease-in-out infinite;
    }
    .sprite-shadow{
        position: absolute;
        left: 50%;
        bottom: -3px;
        translate: -50% 0;
        width: 90%;
        height: 6px;
        border-radius: 50%;
        background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.5), transparent 70%);
        animation: shadow 1.2s ease-in-out infinite;
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
    .stage-tear .card{
        opacity: 1;
        transform: translateY(-45%);
    }
    .stage-revealed .card{
        opacity: 1;
        transform: translateY(-6%) scale(1.6);
    }
    .stage-revealed .card > img{ opacity: 0.75; }

    .tear-line{
        grid-area: 1 / 1;
        z-index: 4;
        align-self: start;
        height: var(--tear);
        box-sizing: border-box;
        border-bottom: 3px dashed white;
        opacity: 0;
        pointer-events: none;
    }
    .stage-ready .tear-line{ animation: pulse 1s ease-in-out infinite; }

    .hint{
        position: fixed;
        bottom: 8vh;
        left: 50%;
        translate: -50% 0;
        font-size: 40px;
        color: white;
        text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
        pointer-events: none;
        animation: pulse 1s ease-in-out infinite;
    }

    .reveal-actions{
        position: fixed;
        bottom: 6vh;
        left: 50%;
        translate: -50% 0;
        display: flex;
        gap: 20px;
        z-index: 5;
    }

    .back{
        position: fixed;
        top: 24px;
        left: 24px;
        z-index: 5;
    }

    .pack-title{
        text-align: center;
        font-size: 30px;
        font-weight: bold;
        color: white;
        text-shadow: 1px 4px 6px rgba(0, 0, 0, 0.5);
    }

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

    .shelf{
        background-color: rgba(255, 255, 255, 0.55);
        border-radius: 40px;
        padding: 28px;
        box-shadow: rgba(100, 100, 111, 0.7) 0px 7px 29px 0px;
        backdrop-filter: blur(6px);
    }
    .shelf-title{
        margin: 0 0 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 30px;
        color: rgb(27, 47, 79);
    }
    .total{
        background-color: rgb(255, 215, 37);
        color: rgb(100, 45, 0);
        border-radius: 999px;
        padding: 2px 14px;
        font-size: 20px;
    }

    .pack-grid{
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 18px;
    }
    .pack-tile{
        position: relative;
        isolation: isolate;
        border: 0;
        border-radius: 24px;
        padding: 18px 10px 14px;
        background-color: rgba(255, 255, 255, 0.8);
        box-shadow: rgba(100, 100, 111, 0.5) 0px 7px 22px 0px;
        font-family: inherit;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .pack-tile::before{
        content: '';
        position: absolute;
        inset: 0;
        z-index: -1;
        border-radius: inherit;
        background: radial-gradient(ellipse at 50% 30%, rgba(255, 230, 0, 0.55), transparent 70%);
        opacity: 0;
        transition: opacity 0.25s ease;
        pointer-events: none;
    }
    .pack-tile:hover, .pack-tile:focus-visible{
        transform: translateY(-8px);
        box-shadow: 0 0 0 3px rgb(255, 215, 37), 0 14px 30px rgba(100, 100, 111, 0.6);
    }
    .pack-tile:hover::before, .pack-tile:focus-visible::before{ opacity: 1; }
    .pack-tile:active{ transform: translateY(-2px) scale(0.98); }
    .tile-img{
        height: 140px;
        width: auto;
        image-rendering: pixelated;
        filter: hue-rotate(var(--hue));
        transition: transform 0.25s ease;
    }
    .pack-tile:hover .tile-img{ transform: rotate(-4deg) scale(1.06); }
    .tile-label{
        font-weight: bold;
        font-size: 18px;
        color: rgb(27, 47, 79);
    }
    .tile-count{
        position: absolute;
        top: 10px;
        right: 10px;
        background-color: rgb(255, 215, 37);
        color: rgb(100, 45, 0);
        font-weight: bold;
        font-size: 14px;
        border-radius: 999px;
        padding: 2px 10px;
        box-shadow: 0 2px 0 rgb(200, 160, 0);
    }

    .empty{
        text-align: center;
        color: rgb(27, 47, 79);
        font-size: 18px;
    }
    .empty .openbutton{
        display: inline-block;
        text-decoration: none;
    }

    @keyframes spin{
        to{ rotate: 360deg; }
    }
    @keyframes fade-in{
        from{ opacity: 0; }
        to{ opacity: 1; }
    }

    @media (max-width: 800px){
        .browse{ grid-template-columns: 1fr; padding: 16px; }
        .buddy-circle{ width: min(200px, 100%); }
    }

    @keyframes pulse{
        0%, 100%{ opacity: 0.4; }
        50%{ opacity: 1; }
    }
</style>