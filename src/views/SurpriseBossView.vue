<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { readEncounter, writeEncounter } from '../composables/bossEncounter'
import { getCurrentProfile } from '../services/profileService'
import TownBackground from '../components/common/TownBackground.vue'
import ClockWeather from '../components/common/ClockWeather.vue'
import Pokemon_Backwards from '../components/pokebuddy/Pokemon_Backwards.vue'

const route = useRoute()
const router = useRouter()
const encounter = ref(null)
const loading = ref(true)
const error = ref(null)
const encounterError = ref('')
const enteredArena = ref(false)
const quizzesOpen = true
const rainActive = ref(false)
const fighters = ref([])
const spriteError = ref('')
const demoIndex = ref(0)
const demoChoice = ref(null)
const demoScore = ref(0)
const demoFinished = ref(false)
const attackSide = ref(null)
let attackTimer
let alive = true
const demoQuestions = computed(() => encounter.value?.questions || [])
const demoQuestion = computed(() => demoQuestions.value[demoIndex.value])
const selectedDemoTopic = computed(() => ({ name: encounter.value?.topicName }))
const hitsRequired = computed(() => Math.ceil(demoQuestions.value.length * .7))
const bossHp = computed(() => Math.max(0, hitsRequired.value - demoScore.value))

function clearAttack() { clearTimeout(attackTimer); attackSide.value = null }
function persistBattle() {
  if (!encounter.value) return false
  Object.assign(encounter.value, { index: demoIndex.value, choice: demoChoice.value,
    score: demoScore.value, finished: demoFinished.value })
  return writeEncounter(encounter.value)
}
function loadArenaFighters() {
  let player = 25
  try {
    const saved = JSON.parse(localStorage.getItem('studydex-active-buddy'))
    const id = Number(saved?.pokeapi_id ?? saved?.id)
    if (Number.isInteger(id) && id > 0) player = id
  } catch { /* A decorative preview works without a saved buddy. */ }
  const boss = encounter.value?.bossId || 150
  fighters.value = [
    { name: 'Your buddy', pokename: String(player) },
    { name: 'Legendary practice opponent', image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + boss + '.png', padding: 0, failed: false },
  ]
}
function arenaSpriteError(fighter) { fighter.failed = true }
async function initialise() {
  loading.value = true
  error.value = null
  encounterError.value = ''
  try {
    const profile = await getCurrentProfile()
    if (!alive) return
    const saved = readEncounter()
    if (!saved || saved.id !== route.query.encounter || saved.status !== 'pending' ||
        saved.owner !== profile.id || !Array.isArray(saved.questions) || !saved.questions.length) {
      encounterError.value = 'No active practice session. Return to your flashcards to begin.'
      return
    }
    encounter.value = saved
    demoIndex.value = Math.min(Math.max(0, Number(saved.index) || 0), saved.questions.length - 1)
    demoChoice.value = saved.choice ?? null
    demoScore.value = saved.score || 0
    demoFinished.value = Boolean(saved.finished)
    enteredArena.value = true
    loadArenaFighters()
  } catch (cause) {
    if (alive) {
      error.value = cause
      encounterError.value = 'Could not load your profile. Please retry.'
    }
  } finally { if (alive) loading.value = false }
}
function answerDemo(index) {
  if (demoChoice.value !== null || demoFinished.value || !demoQuestion.value) return
  demoChoice.value = index
  const correct = index === demoQuestion.value[2]
  if (correct) demoScore.value++
  clearAttack()
  attackSide.value = correct ? 0 : 1
  attackTimer = setTimeout(clearAttack, 1000)
  persistBattle()
}
function nextDemo() {
  if (demoChoice.value === null) return
  clearAttack()
  if (demoIndex.value + 1 >= demoQuestions.value.length) demoFinished.value = true
  else { demoIndex.value++; demoChoice.value = null }
  persistBattle()
}
async function finishEncounter() {
  if (!encounter.value) return
  persistBattle()
  encounter.value.outcome = demoFinished.value ? (demoScore.value >= hitsRequired.value ? 'won' : 'lost') : 'left'
  encounter.value.status = 'complete'
  if (!writeEncounter(encounter.value)) {
    encounterError.value = 'Could not save your return point. Please retry.'
    return
  }
  try {
    const failure = await router.push({ name: 'study-decks', query: { ...encounter.value.returnQuery, bossReturn: encounter.value.id } })
    if (failure) {
      encounter.value.status = 'pending'
      writeEncounter(encounter.value)
      encounterError.value = 'Return navigation was cancelled. Please retry.'
    }
  } catch {
    encounter.value.status = 'pending'
    writeEncounter(encounter.value)
    encounterError.value = 'Could not return to your flashcards. Please retry.'
  }
}
onMounted(initialise)
onUnmounted(() => { alive = false; clearAttack() })
</script>

<template>
  <div class="arena-with-preview">
  <main class="arena-page" >
    <div class="arena-scene" :class="{ 'selection-blur': !enteredArena }" :inert="!enteredArena">
      <TownBackground
        class="boss-background-layer"
        scene="boss"


        :rain-active="rainActive"
      />

      <!-- The question stays on the arena's built-in screen. -->
      <section v-if="enteredArena && quizzesOpen" class="quiz-content demo-board" aria-label="Legendary boss question">
        <div class="demo-caption"><span>OPTIONAL BOSS PRACTICE · {{ selectedDemoTopic?.name }}</span><span>{{ demoFinished ? 'Complete' : `${demoIndex + 1} / ${demoQuestions.length}` }}</span></div>
        <h2 id="arena-question">{{ demoFinished ? (demoScore >= hitsRequired ? 'Boss defeated!' : 'Boss battle lost') : demoQuestion?.[0] }}</h2>
        <p v-if="demoFinished">You answered {{ demoScore }} of {{ demoQuestions.length }} correctly.</p>
      </section>

      <!-- Classic battle menu: dialogue left, four choices right. -->
      <section v-if="enteredArena && quizzesOpen" class="battle-dock" aria-label="Battle answer controls">
        <div class="battle-dialogue" aria-live="polite">
          <template v-if="demoFinished">
            <span class="dialogue-kicker">ENCOUNTER COMPLETE</span>
            <p>{{ demoScore >= hitsRequired ? 'Practice complete! Your flashcards and paused study timer are preserved.' : 'Keep practising at your own pace. Your flashcards and paused study timer are preserved.' }}</p>
            <small>Flashcard practice only · no assessment grade or XP is saved.</small>
          </template>
          <template v-else-if="demoChoice === null">
            <p>What will <strong>{{ fighters[0]?.name || 'your buddy' }}</strong> do?</p>
          </template>
          <template v-else>
            <p class="battle-explanation">{{ demoQuestion[3] }}</p>
            <button type="button" class="battle-next" @click="nextDemo">{{ demoIndex + 1 === demoQuestions.length ? 'See results' : 'Next question' }} →</button>
          </template>
        </div>
        <div v-if="demoFinished" class="battle-end-actions">
          <button type="button" @click="finishEncounter">Return to Flashcards</button>
        </div>
        <div v-else-if="demoQuestion" class="demo-answers" role="group" aria-labelledby="arena-question">
          <button v-for="(answer, index) in demoQuestion[1]" :key="`${demoIndex}-${index}`" type="button" :class="['demo-answer-' + index, { correct: demoChoice !== null && index === demoQuestion[2], wrong: demoChoice === index && index !== demoQuestion[2] }]" :disabled="demoChoice !== null" @click="answerDemo(index)">
            <b class="choice-letter">{{ ['A','B','C','D'][index] }}</b><span class="choice-text">{{ answer }}</span>
            <span v-if="demoChoice !== null && index === demoQuestion[2]" aria-label="Correct answer">✓</span>
            <span v-else-if="demoChoice === index" aria-label="Incorrect answer">✕</span>
          </button>
        </div>
      </section>
      <div v-for="(fighter, index) in fighters" :key="index" class="arena-fighter" :class="[index === 0 ? 'player-fighter' : 'opponent-fighter', { 'is-hit': attackSide !== null && attackSide !== index }]">
        <div class="fighter-shadow"></div>
        <span v-if="index === 1" class="boss-name">{{ fighter.name }} · Boss HP {{ bossHp }} / {{ hitsRequired }}</span>
        <Pokemon_Backwards
          v-if="index === 0"
          :key="fighter.pokename"
          class="player-back-sprite"
          :pokename="fighter.pokename"
        />
        <img v-else-if="fighter.image && !fighter.failed" :key="fighter.image" :src="fighter.image" :alt="`${fighter.name}, ${index === 0 ? 'rear view' : 'front view'}`" crossorigin="anonymous" :style="{ transform: `translateY(${fighter.padding}%)` }"  @error="arenaSpriteError(fighter)" />
        <span v-else class="fighter-unavailable">Sprite unavailable</span>

      </div>
      <p v-if="spriteError && enteredArena" class="sprite-status">{{ spriteError }} <button type="button" @click="loadArenaFighters">Retry</button></p>

    </div>

    <header class="arena-hud"><button type="button" class="home-link" @click="finishEncounter">Return to Flashcards</button>
      <ClockWeather :use-device-location="true" @rain-change="rainActive = $event" />
    </header>


    <section v-if="!enteredArena" class="arena-picker">
      <div class="picker-shell">
        <h1>Optional Boss Practice</h1>
        <p v-if="loading">Preparing your encounter…</p>
        <p v-else role="status">{{ encounterError }}</p>
        <button v-if="error" type="button" @click="initialise">Retry</button>
        <RouterLink to="/study-decks" class="glass-action">Back to flashcards</RouterLink>
      </div>
    </section>
    <p v-if="enteredArena && encounterError" class="encounter-error" role="alert">{{ encounterError }}</p>


  </main>
  </div>
</template>

<style scoped>
.arena-page {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  font-family: system-ui, sans-serif;
}

.arena-page * {
  box-sizing: border-box;
}

.arena-scene {
  position: relative;
  width: min(100vw, calc(100dvh * 1672 / 941));
  aspect-ratio: 1672 / 941;
  overflow: hidden;
  isolation: isolate;
  container-type: inline-size;
}

/* FUTURE QUIZ CONTENT */

.quiz-content {
  position: absolute;
  z-index: 6;
  left: 29%;
  top: 26%;
  width: 42%;
  height: 27%;
  padding: 12px;
  overflow: auto;
  color: white;
}


/* Shared clock floats above the scene. */
.arena-hud {
  position: absolute;
  top: max(16px, env(safe-area-inset-top));
  left: 16px;
  z-index: 10;
  max-width: calc(100% - 32px);
  background: transparent;
  pointer-events: auto;
}
button:focus-visible, a:focus-visible, input:focus-visible {
  outline: 3px solid #ffdc55;
  outline-offset: 4px;
}
@media (max-width: 600px) {
  .arena-hud { top: 10px; left: 10px; max-width: calc(100% - 20px); }
}

/* ENTRY PICKER */
.arena-scene { transition: filter .35s ease; }
.arena-scene.selection-blur { filter: blur(9px) brightness(.64); pointer-events: none; }
.arena-picker { position: absolute; z-index: 8; inset: 90px 0 0; overflow-y: auto; padding: 28px 24px 130px; color: white; text-align: center; }
.picker-shell { width: min(940px, 100%); margin: auto; padding: 28px 0; }
.picker-eyebrow { color: #ffe9ae; font-size: 12px; font-weight: 800; letter-spacing: .2em; }
.picker-shell h1 { margin: 16px 0 12px; color: white; font-size: clamp(28px, 4vw, 48px); font-weight: 800; text-shadow: 0 3px 18px #0007; }
.picker-intro { margin-bottom: 28px; color: #fff6e3; font-size: 17px; }
.bubble-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 22px; }
.bubble-card { position: relative; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 14px; width: 100%; min-height: 190px; padding: 26px 20px; border: 1px solid #ffffff9e; border-radius: 32px; background: linear-gradient(145deg, #ffffff38, #ffffff12); box-shadow: inset 0 1px 0 #ffffffb3, inset 0 -1px 0 #ffffff26, 0 12px 30px #071b3544; backdrop-filter: blur(18px); color: white; font: inherit; cursor: pointer; transition: transform .18s, background .18s, box-shadow .18s; }
.bubble-card strong { font-size: 22px; line-height: 1.3; overflow-wrap: anywhere; }
.bubble-card > span:last-child { font-size: 13px; color: #fff5df; }
.bubble-symbol { font-size: 36px; color: #ffe699; text-shadow: 0 0 18px #ffe4a455; }
.bubble-card:hover:not(:disabled) { transform: translateY(-5px); background: linear-gradient(145deg, #ffffff55, #ffffff22); box-shadow: 0 0 0 2px #ffe19a, 0 18px 38px #071b3555; }
.bubble-card:disabled { opacity: .65; cursor: not-allowed; }
.topic-choice { display: flex; flex-direction: column; gap: 12px; }
.topic-choice .bubble-card { flex: 1; }
.revise-link { color: #ffe6a1; font-weight: 700; font-size: 14px; }
.picker-back, .glass-action { display: inline-block; margin: 0 0 22px; padding: 12px 20px; border: 1px solid #ffffff88; border-radius: 20px; background: #ffffff22; color: white; text-decoration: none; font: inherit; cursor: pointer; }
.picker-footnote { margin: 28px 0 0; font-size: 12px; color: #e0e8f5; }
.picker-notice { padding: 12px; border: 1px solid #ffe19a77; border-radius: 12px; background: #203046b3; }
.change-topic { cursor: pointer; font: inherit; }
.quiz-content :deep(.study-panel), .quiz-content :deep(.study-empty), .quiz-content :deep(.study-message) { background: transparent; box-shadow: none; border: 0; color: #fff5dc; padding: 5px; }
.quiz-content :deep(h2), .quiz-content :deep(h3), .quiz-content :deep(p) { color: #fff5dc; }
.quiz-content :deep(h2) { font-size: clamp(17px, 1.6cqw, 26px); }
.arena-topic-caption { font-size: 12px; color: #ffdc81; margin: 0 0 8px; }
.sprite-status { position: absolute; z-index: 8; bottom: 2%; left: 35%; background: #17304d; color: white; padding: 8px; border-radius: 10px; }
.arena-picker button:focus-visible, .arena-picker a:focus-visible { outline: 3px solid #ffdf86; outline-offset: 4px; }
.arena-fighter { position: absolute; z-index: 7; height: 0; transform: translateX(-50%); }
.player-fighter { left: 32%; top: 77%; width: 11%; }
.opponent-fighter { left: 67%; top: 72%; width: 10.5%; }
.arena-fighter > img { position: absolute; bottom: 0; left: 0; width: 100%; height: auto; image-rendering: pixelated; filter: drop-shadow(0 3px 1px #1b253044); }
.fighter-shadow { position: absolute; top: -.3cqw; left: 23%; width: 54%; height: 1cqw; border-radius: 50%; background: #31221466; filter: blur(3px); }
.fighter-name { position: absolute; top: 1cqw; left: 50%; transform: translateX(-50%); border: 1px solid #e6bf60; border-radius: 20px; padding: 4px 12px; color: #fff4d0; background: #182c43e8; text-transform: capitalize; font-size: clamp(10px, .9cqw, 14px); white-space: nowrap; }
.fighter-unavailable { position: absolute; bottom: 10px; background: #172c43; padding: 8px; font-size: 11px; }

@media (max-width: 700px) {
  .arena-picker { padding: 12px 18px 180px; }
  .bubble-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .bubble-card { min-height: 160px; padding: 18px 10px; border-radius: 24px; }
  .bubble-card strong { font-size: 17px; }
  .arena-page:has(.arena-scene:not(.selection-blur)) { overflow-y: auto; display: block; padding-top: 75px; }
  .arena-scene:not(.selection-blur) { width: 100%; aspect-ratio: auto; padding-top: calc(100vw * 941 / 1672); overflow: visible; }
  .arena-scene:not(.selection-blur) > .boss-background-layer { height: calc(100vw * 941 / 1672); }
  .arena-scene:not(.selection-blur) .quiz-content { position: relative; left: auto; top: auto; width: calc(100% - 24px); height: auto; margin: 16px 12px 180px; padding: 18px; background: #1b3048; border: 3px solid #d4b369; border-radius: 16px; }
  .arena-scene:not(.selection-blur) .player-fighter { top: calc(100vw * 941 / 1672 * .77); }
  .arena-scene:not(.selection-blur) .opponent-fighter { top: calc(100vw * 941 / 1672 * .72); }
}
@media (prefers-reduced-motion: reduce) { .arena-scene, .bubble-card { transition: none; } }

.science-filters { display: grid; justify-items: center; gap: 14px; margin-bottom: 24px; }
.science-filters label { display: flex; gap: 10px; align-items: center; }
.science-filters p { margin: 0; max-width: 650px; font-size: 12px; line-height: 1.6; color: #e2ebf6; }
.science-theme { color: #ffe49b; text-transform: uppercase; font-size: 10px; letter-spacing: .12em; }
.science-detail { font-size: 11px; line-height: 1.5; color: #eff5ff; }
.science-level-label { padding: 10px 20px; border: 1px solid #ffe29b; border-radius: 20px; background: #ffe29b; color: #20334b; }
.science-filters select { padding: 10px 16px; border-radius: 16px; background: #21374e; color: white; font: inherit; }

/* CLASSIC BATTLE LAYOUT — no levels, HP or XP panels. */
.demo-board { display: flex; flex-direction: column; align-items: stretch; justify-content: center; text-align: center; padding: 1cqw 1.4cqw; }
.demo-caption { display: flex; justify-content: space-between; gap: 10px; color: #ffe6a2; font-size: clamp(9px, .8cqw, 13px); font-weight: 800; }
.demo-board h2 { margin: auto 0; padding: 12px 0; font-size: clamp(20px, 2cqw, 34px); line-height: 1.35; color: #fff8e7; }
.demo-board > p { color: #fff8e7; }
.battle-dock { position: absolute; z-index: 9; left: 2%; right: 2%; bottom: 1.5%; height: 19%; display: grid; grid-template-columns: 42% minmax(0, 1fr); gap: 12px; padding: 10px; border: 3px solid #344652; border-radius: 18px; background: #ede8d7; box-shadow: 0 5px 0 #192735, inset 0 0 0 2px #fff9dc; color: #263548; }
.battle-dialogue { min-width: 0; overflow-y: auto; padding: 12px 16px; border: 3px solid #d6b254; border-radius: 9px; background: #183047; box-shadow: inset 0 0 0 2px #080f1d; color: #fff5dc; }
.dialogue-kicker { color: #ffdc83; font-size: clamp(9px, .7cqw, 12px); font-weight: 900; letter-spacing: .1em; }
.battle-dialogue p { margin: 8px 0; font-size: clamp(15px, 1.4cqw, 23px); line-height: 1.3; }
.battle-dialogue strong { text-transform: capitalize; }
.battle-dialogue small { font-size: clamp(10px, .85cqw, 14px); color: #d7e5ec; }
.battle-dialogue .battle-explanation { font-size: clamp(12px, 1cqw, 17px); }
.demo-answers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 8px; min-height: 0; }
.demo-answers button { display: flex; align-items: center; gap: 8px; min-width: 0; min-height: 0; overflow-y: auto; padding: 8px 12px; border: 3px solid #fff4d2; outline: 2px solid #45515b; border-radius: 18px; color: white; font: inherit; font-size: clamp(11px, 1.1cqw, 18px); font-weight: 800; text-align: left; cursor: pointer; box-shadow: inset 0 -5px 0 #0002, inset 0 2px 0 #fff6; }
.choice-letter { display: grid; place-items: center; flex: 0 0 25px; height: 25px; border-radius: 50%; background: #0002; font-size: 12px; }
.choice-text { flex: 1; overflow-wrap: anywhere; }
.demo-answer-0 { background: #be4358; }.demo-answer-1 { background: #dfb94e; color: #26334a !important; }.demo-answer-2 { background: #488247; }.demo-answer-3 { background: #396d99; }
.demo-answers button:hover:not(:disabled) { filter: brightness(1.15); }
.demo-answers button:disabled { cursor: default; }
.demo-answers .correct { outline: 3px solid #ffe270; border-color: #ffe270; }
.demo-answers .wrong { border-style: dashed; }
.battle-next, .battle-end-actions button { padding: 8px 12px; border: 2px solid #b58d32; border-radius: 9px; background: #ffe08a; color: #26334a; font: inherit; font-weight: 800; cursor: pointer; }
.battle-next { font-size: 12px; }
.battle-end-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.battle-dock button:focus-visible { outline: 3px solid #fff; outline-offset: -6px; }
@media (max-width: 700px) {
  .arena-scene:not(.selection-blur) .quiz-content { margin-bottom: 12px; }
  .arena-scene:not(.selection-blur) .player-fighter { top: calc(100vw * 941 / 1672 * .77); }
  .arena-scene:not(.selection-blur) .opponent-fighter { top: calc(100vw * 941 / 1672 * .72); }
  .battle-dock { position: relative; left: auto; right: auto; bottom: auto; width: calc(100% - 24px); height: auto; margin: 12px 12px 180px; grid-template-columns: 1fr; }
  .battle-dialogue { max-height: 180px; }
  .demo-answers { grid-template-rows: auto; }
  .demo-answers button { min-height: 65px; font-size: 14px; overflow: visible; }
  .battle-dialogue p { font-size: 18px; }
  .battle-dialogue .battle-explanation { font-size: 14px; }
}
/* Recoil the wrapper so sprite foot-alignment remains intact. */
.player-fighter.is-hit { animation: player-recoil .65s ease-out .22s both; }
.opponent-fighter.is-hit { animation: opponent-recoil .65s ease-out .22s both; }
.arena-fighter.is-hit > img, .arena-fighter.is-hit .player-back-sprite :deep(img) { animation: damage-flash .65s ease-out .22s both; }
@keyframes player-recoil {
  0%,100% { transform: translateX(-50%); }
  20% { transform: translateX(-65%) rotate(-4deg); }
  40% { transform: translateX(-44%) rotate(2deg); }
  60% { transform: translateX(-56%) rotate(-2deg); }
  80% { transform: translateX(-48%); }
}
@keyframes opponent-recoil {
  0%,100% { transform: translateX(-50%); }
  20% { transform: translateX(-35%) rotate(4deg); }
  40% { transform: translateX(-56%) rotate(-2deg); }
  60% { transform: translateX(-44%) rotate(2deg); }
  80% { transform: translateX(-52%); }
}
@keyframes damage-flash {
  0%,100% { opacity: 1; filter: drop-shadow(0 3px 2px #0005); }
  20% { opacity: .65; filter: brightness(.65) sepia(1) saturate(10000%) hue-rotate(320deg) drop-shadow(0 0 8px #ff2020); }
  55% { opacity: .85; filter: brightness(.85) sepia(1) saturate(10000%) hue-rotate(320deg) drop-shadow(0 0 4px #ff2020); }
}
@media(prefers-reduced-motion: reduce) { .arena-fighter, .arena-fighter > img, .arena-fighter .player-back-sprite :deep(img) { animation: none !important; } }

/* The footer is a separate grid row, never an overlay on the battle. */
.arena-with-preview { position: fixed; inset: 0; display: grid; grid-template-rows: minmax(0, 1fr) auto; background: #101d30; }
.arena-with-preview > .arena-page { position: relative; inset: auto; width: 100%; height: 100%; min-height: 0; container-type: size; }
.arena-with-preview .arena-scene { width: min(100%, calc(100cqh * 1672 / 941)); }
.time-preview-bar { position: relative; min-width: 0; overflow-x: auto; border-top: 2px solid #b99a58; background: #14243a; color: #fff1cf; padding: 10px 14px max(10px, env(safe-area-inset-bottom)); font-family: system-ui, sans-serif; }
.time-bar-inner { display: flex; align-items: center; justify-content: center; gap: 8px; width: max-content; min-width: 100%; }
.time-bar-title { display: flex; align-items: center; gap: 10px; margin-right: 8px; font-size: 12px; white-space: nowrap; }
.time-bar-title span { color: #ffdf85; font-variant-numeric: tabular-nums; }
.time-preview-bar button { min-height: 36px; padding: 7px 11px; border: 1px solid #718096; border-radius: 8px; background: #253951; color: #fff3d6; font: inherit; font-size: 12px; cursor: pointer; white-space: nowrap; }
.time-preview-bar button:hover { background: #3b526d; }
.time-preview-bar button[aria-pressed='true'] { background: #ffdf85; border-color: #ffdf85; color: #233047; }
.time-bar-slider { display: flex; align-items: center; gap: 8px; margin: 0 8px; font-size: 12px; }
.time-bar-slider input { width: clamp(100px, 12vw, 200px); accent-color: #ffdf85; }
.time-bar-status { font-size: 11px; color: #c6d4e7; white-space: nowrap; }
.time-preview-bar button:focus-visible, .time-preview-bar input:focus-visible { outline: 2px solid #ffdf85; outline-offset: 2px; }
@media (max-width: 700px) {
  .arena-with-preview .arena-scene { width: 100%; }
  .time-bar-inner { justify-content: flex-start; }
  .arena-picker { padding-bottom: 24px; }
  .battle-dock { margin-bottom: 24px; }
}

/* Forest scene coordinates, based on the 1672 × 941 transparent artwork. */
.arena-scene { max-width: none; }
.arena-scene .quiz-content {
  left: 13.5%; top: 12%; width: 36.5%; height: 21.5%;
  padding: 1cqw; background: transparent; border: 0; box-shadow: none;
}
.arena-scene .demo-board h2 { font-size: clamp(16px, 1.65cqw, 30px); line-height: 1.35; }
.arena-scene .demo-caption { font-size: clamp(9px, .7cqw, 13px); }
.arena-scene .player-fighter { left: 30%; top: 78%; width: 16%; }
.arena-scene .opponent-fighter { left: 78%; top: 57%; width: 18%; }
.boss-name { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); white-space: nowrap; text-transform: capitalize; font: 700 clamp(10px, .9cqw, 16px)/1.3 system-ui; background: #17352fe8; color: #fff0ae; padding: 5px 12px; border: 1px solid #d6b362; border-radius: 20px; }
.battle-dock { bottom: 1.5%; height: 18%; border-color: #805e34; background: #f6edce; }
@media (max-width: 700px) {
  .arena-scene:not(.selection-blur) .quiz-content { position: relative; left: auto; top: auto; width: calc(100% - 24px); height: auto; min-height: 110px; margin: 12px; padding: 18px; background: #193246; border: 2px solid #cfa75b; border-radius: 14px; }
  .arena-scene:not(.selection-blur) .player-fighter { top: calc(100vw * 941 / 1672 * .78); }
  .arena-scene:not(.selection-blur) .opponent-fighter { top: calc(100vw * 941 / 1672 * .57); }
  .arena-scene .demo-board h2 { font-size: 20px; }
  .battle-dock { position: relative; bottom: auto; height: auto; margin-bottom: 24px; }
  .boss-name { top: 5px; padding: 2px 6px; font-size: 9px; }
}

.encounter-error { position: fixed; z-index: 100; bottom: 80px; left: 20px; background: #172c43; color: white; padding: 12px; }
/* Fit the shared back sprite to the existing player's position and size. */
.player-back-sprite {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: auto;
  min-height: 0;
  color: white;
}
.player-back-sprite :deep(.pokemon-back-sprite) {
  width: 100%;
  height: auto;
  max-width: 100%;
  object-position: center bottom;
  image-rendering: pixelated;
  filter: drop-shadow(0 3px 1px #1b253044);
}
.player-back-sprite :deep(.sprite-status) {
  position: static;
  margin: 0;
  padding: 6px;
  font-size: 11px;
}
</style>
