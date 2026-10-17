<script setup>
import { ref } from 'vue'

const stage = ref('idle')
const rx = ref(0)
const ry = ref(0)
const card = ref(null)

async function loadPokemon() {
    const id = Math.floor(Math.random() * 151) + 1
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
    const data = await res.json()
    card.value = {
        id,
        name: data.name.replace(/-/g, ' '),
        img: data.sprites.other['official-artwork'].front_default,
    }
}

function openPack() {
  stage.value = 'zoom'
  loadPokemon()
  setTimeout(() => (stage.value = 'ready'), 800)
}

function onMove(e) {
  if (stage.value === 'idle' || stage.value === 'zoom') return
  const x = (e.clientX / window.innerWidth - 0.5) * 2
  const y = (e.clientY / window.innerHeight - 0.5) * 2
  ry.value = x * 18
  rx.value = -y * 18
}

function tear() {
  if (stage.value !== 'ready') return
  if (!card.value) return
  stage.value = 'tear'
  setTimeout(() => (stage.value = 'revealed'), 900)
}

function reset() {
  stage.value = 'idle'
  rx.value = 0
  ry.value = 0
  card.value = null
}
</script>

<template>
  <main @pointermove="onMove">
    <div class="packopen">
      <div
        class="pack-wrap"
        :class="`stage-${stage}`"
        :style="{ '--rx': rx + 'deg', '--ry': ry + 'deg' }"
        @click="tear"
      >
        <div class="card">
          <img v-if="card" :src="card.img" alt="Your new card" />
          <p></p>
        </div>
        <img class="pack-body" src="../../public/assets/pack_unopened.png" alt="pack" />
        <img class="pack-top" src="../../public/assets/pack_unopened.png" alt="pack" />
        <div class="tear-line"></div>
      </div>

      <button
        class="openbutton leaver to-down"
        :class="{ away: stage !== 'idle' }"
        @click="openPack"
      >
        Open
      </button>
    </div>

    <div v-if="stage === 'ready'" class="hint">Click the pack to tear it open!</div>
    <div v-if="stage === 'revealed'" class="card-name">{{ card.name }}</div>
    <button v-if="stage === 'revealed'" class="openbutton done" @click="reset">Done</button>
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
    }

    .nav{
        text-align: center;
    }

    .packopen{
        display:flex;
        flex-direction: column;
        padding: 30px;
        gap: 20px;
    }

    .openbutton{
        font-size: 40px;
        background-color: white;
        border-radius: 10px;
        border: 3px solid gray;
    }

    .openbutton:hover{
        cursor: pointer;
        border: 3px solid yellow;
    }

    .openbutton:active{
        transform: scale(0.9);
    }

    .leaver{
        transition: opacity 0.5s ease, transform 0.6s ease;
    }
    .leaver.away{
        opacity: 0;
        pointer-events: none;
    }
    .to-down.away{ transform: translateY(150px); }
    .to-left.away{ transform: translateX(-150%); }
    .to-right.away{ transform: translateX(150%); }

    .pack-wrap{
        --tear: 14%;
        --s: 1;
        display: grid;
        transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale(var(--s));
        transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .stage-zoom, .stage-ready, .stage-tear, .stage-revealed{ --s: 1.8; }
    .stage-ready, .stage-tear, .stage-revealed{ transition: transform 0.1s ease-out; }
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
        z-index: 1;
        place-self: center;
        width: 150%;
        opacity: 0;
        transition: transform 1s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.7s ease;
    }

    .card-name{
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

    .card img{ width: 0; min-width: 100%; }
    .stage-tear .card{
        opacity: 1;
        transform: translateY(-45%);
    }
    .stage-revealed .card{
        opacity: 1;
        transform: translateY(0) scale(1.3);
    }

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
    .done{
        position: fixed;
        bottom: 6vh;
        left: 50%;
        translate: -50% 0;
    }

    @keyframes pulse{
        0%, 100%{ opacity: 0.4; }
        50%{ opacity: 1; }
    }
</style>
