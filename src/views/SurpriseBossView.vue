<script setup>
import BattleAnswerPanel from '../components/common/BattleAnswerPanel.vue'
import ExpriencePrompt from '../components/common/xpPrompt.vue'
import { useExperiencePrompt } from '../composables/useExperiencePrompt.js'
import { newExperienceId } from '../services/experienceService'

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { readEncounter, writeEncounter } from '../composables/bossEncounter'
import { usePokemonTransition } from '../composables/usePokemonTransition'
const route = useRoute()
const router = useRouter()
const pokemonTransition = usePokemonTransition()
const transitionSequence = pokemonTransition.state.sequence
const transitionKey = `surprise-boss:${route.query.encounter}`
const storedEncounter = readEncounter()
const encounter = ref(storedEncounter?.id === route.query.encounter && storedEncounter?.status === 'pending' ? storedEncounter : null)
import { getCurrentProfile } from '../services/profileService'
import { getSelectedStudyBuddy } from '../services/studyService'
import ClockWeather from '@/components/common/ClockWeather.vue'
import { useTimeOfDay } from '@/composables/useTimeOfDay'
import PokeSprite from '@/components/pokebuddy/PokeSprite.vue'

const audio = new Audio("/sounds/bossfight.wav");
audio.loop = true;
const isMuted = ref(true);


function toggleMute() {
  audio.play();
  isMuted.value = !isMuted.value
  audio.muted = isMuted.value
}

const profile = ref(null)
const selectedRewardBuddy=ref(null)
const { prompt:experiencePrompt, reward:rewardExperience, dismiss:dismissExperience }=useExperiencePrompt(selectedRewardBuddy, async ()=>{
  selectedRewardBuddy.value=await getSelectedStudyBuddy(profile.value.id)
  await loadArenaFighters()
})
const loading = ref(true)
const error = ref(null)
let alive = true
let generation = 0
async function initialise() {
  const request = ++generation
  loading.value = true
  error.value = null
  try {
    const student = await getCurrentProfile()
    if (!alive || request !== generation) return
    profile.value = student
    selectedRewardBuddy.value=await getSelectedStudyBuddy(student.id)
    if(!alive || request!==generation) return
    loadArenaFighters()

  } catch (cause) {
    if (alive && request === generation) error.value = cause
  } finally {
    if (alive && request === generation) loading.value = false
  }
}
onMounted(initialise)
onUnmounted(() => {
  alive = false
  generation++
  pokemonTransition.pageLeft(transitionKey, transitionSequence)
})
watch(loading, async isLoading => {
  if (isLoading) return
  // The existing loading watcher validates the encounter and restores questions.
  await nextTick()
  if (alive) pokemonTransition.pageReady(transitionKey, transitionSequence)
})
watch(() => pokemonTransition.state.outcome, outcome => {
  if (outcome !== 'failed' || !loading.value || pokemonTransition.state.sequence !== transitionSequence) return
  generation++
  error.value = new Error(pokemonTransition.state.error || 'Could not load your boss battle. Please retry.')
  loading.value = false
})
// Use the live clock for the forest lighting and battle availability.
const live = ref(true)
const previewHour = ref(12)
const { hour, lighting } = useTimeOfDay({ live, previewHour })
const rainActive = ref(false)
const sceneBase = import.meta.env.BASE_URL
const forestNight = computed(() => hour.value < 6 || hour.value >= 19)
const forestArtStyle = computed(() => ({
  filter: forestNight.value ? 'brightness(.56) saturate(.75)' : 'none',
}))
const quizzesOpen = computed(() => !!encounter.value || hour.value >= 7)
// Match the margins around the proportional scene to its shared sky colours.
const skyStyle = computed(() => ({
  background: `linear-gradient(to bottom, ${lighting.value.top} 0%, ${lighting.value.horizon} 30%)`
}))

const enteredArena = ref(false)
watch(quizzesOpen, open => { if (!open) enteredArena.value = false })
const spriteError = ref('')
const fighters = ref([])
const legendaryBossId = ref(encounter.value?.bossId || null)
let spriteController
function readArenaBuddy() {
  const pokemon=selectedRewardBuddy.value?.pokemon
  return { id:pokemon?.name?.toLowerCase().replace(/[.'’]/g,'').replace(/\s+/g,'-') || 'pikachu', name:pokemon?.name || 'Your buddy' }
}

async function loadArenaFighters() {
  spriteController?.abort()
  const controller = new AbortController()
  spriteController = controller
  spriteError.value = ''
  const selected = readArenaBuddy()
  fighters.value = [{
    name: selected.name || 'Your buddy',
    pokename: String(selected.id),
    pokemon: {
      name: String(selected.id),
      ownedId: selectedRewardBuddy.value?.id,
      xp: selectedRewardBuddy.value?.xp ?? 0,
      level: selectedRewardBuddy.value?.level ?? 1,
      is_defeated: selectedRewardBuddy.value?.is_defeated ?? false,
    },
  }]
  // Curated legendary-only pool; retain the same opponent when retrying sprites.
  const pool = [144, 145, 146, 150, 243, 244, 245, 249, 250, 382, 383, 384]
    .filter(id => id !== selected.id)
  if (!legendaryBossId.value) legendaryBossId.value = pool[Math.floor(Math.random() * pool.length)]
  const enemyId = legendaryBossId.value
  try {
    // The parent only retrieves the boss's front-facing sprite.
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${enemyId}/`, {
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`Pokémon request failed: ${response.status}`)
    const pokemon = await response.json()
    if (controller.signal.aborted) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const still = pokemon.sprites?.front_default
    const animated = pokemon.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default
    fighters.value.push({
      name: pokemon.name,
      image: (!reduceMotion && animated) || still,
      still, failed: false, padding: 0
    })
  } catch (cause) {
    if (cause.name !== 'AbortError') spriteError.value = 'The boss Pokémon could not load.'
  }
}
function arenaSpriteError(fighter) {
  if (fighter.still && fighter.image !== fighter.still) {
    fighter.image = fighter.still
    fighter.padding = 0
  } else fighter.failed = true
}
// Align the visible feet, rather than the transparent image edge, to the floor.
function groundArenaSprite(event, fighter) {
  try {
    const img = event.target
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx || !canvas.width || !canvas.height) return
    ctx.drawImage(img, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    for (let y = canvas.height - 1; y >= 0; y--) {
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 32) {
          fighter.padding = (canvas.height - 1 - y) / canvas.height * 100
          return
        }
      }
    }
  } catch { fighter.padding = 0 }
}


onUnmounted(() => spriteController?.abort())


// Local practice questions only. Pokémon XP rewards are saved through the Supabase reward function.
const selectedDemoTopic = ref(null)
const demoIndex = ref(0)
const demoChoice = ref(null)
const demoScore = ref(0)
const demoFinished = ref(false)
const attackSide = ref(null)
let attackTimer
const demoQuestions = computed(() => encounter.value?.questions || [])
const demoQuestion = computed(() => demoQuestions.value[demoIndex.value])
function clearAttack() { clearTimeout(attackTimer); attackSide.value = null }
function answerDemo(index) {
  if (demoChoice.value !== null || demoFinished.value || !quizzesOpen.value) return
  demoChoice.value = index
  const correct = index === demoQuestion.value[2]
  if (correct) demoScore.value++
  clearAttack()
  attackSide.value = correct ? 0 : 1
  attackTimer = setTimeout(() => { attackSide.value = null }, 1000)
}
function nextDemo() {
  if (demoChoice.value === null || demoFinished.value) return
  clearAttack()
  if (demoScore.value >= 5 || demoIndex.value + 1 >= demoQuestions.value.length) demoFinished.value = true
  else { demoIndex.value++; demoChoice.value = null }
}
onUnmounted(clearAttack)


// Encounter-only entry. There is no topic-selection flow on this page.
const encounterError = ref('')
const hitsRequired = computed(() => 5)
const bossHp = computed(() => Math.max(0, hitsRequired.value - demoScore.value))
function persistBattle() {
  if (!encounter.value || !enteredArena.value) return
  Object.assign(encounter.value, { index: demoIndex.value, choice: demoChoice.value,
    score: demoScore.value, finished: demoFinished.value, bossId: legendaryBossId.value })
  writeEncounter(encounter.value)
}
watch([demoIndex, demoChoice, demoScore, demoFinished, legendaryBossId], persistBattle)
watch(loading, () => {
  if (loading.value) return
  if (error.value) { encounterError.value = 'Could not load your profile. Please retry.'; return }
  if (!encounter.value || encounter.value.owner !== profile.value?.id || !encounter.value.questions?.length) {
    encounter.value = null
    encounterError.value = 'No active encounter. Return to your flashcards to study.'
    return
  }
  encounterError.value = ''
  selectedDemoTopic.value = { name: encounter.value.topicName }
  demoIndex.value = encounter.value.index || 0
  demoChoice.value = encounter.value.choice ?? null
  demoScore.value = encounter.value.score || 0
  demoFinished.value = !!encounter.value.finished
  enteredArena.value = true
}, { immediate: true })
watch([demoFinished,enteredArena],([finished,entered])=>{
  if(!finished || !entered || !encounter.value) return
  encounter.value.xpEventId ||= newExperienceId()
  if(!writeEncounter(encounter.value)) { encounterError.value='Could not save this battle’s reward reference. Please enable browser session storage and reload.'; return }
  rewardExperience({id:encounter.value.xpEventId,type:'boss',health:bossHp.value,sessionId:encounter.value.studySessionId})
})
async function finishEncounter() {
  toggleMute();
  if (!demoFinished.value || !encounter.value || experiencePrompt.value) return
  persistBattle()
  encounter.value.outcome = demoScore.value >= hitsRequired.value ? 'won' : 'lost'
  encounter.value.status = 'complete'
  if (!writeEncounter(encounter.value)) { encounterError.value = 'Could not save your return point. Please retry.'; return }
  try {
    const failure = await router.push({ name: 'study-decks', query: { ...encounter.value.returnQuery, bossReturn: encounter.value.id } })
    if (failure) encounterError.value = 'Return navigation was cancelled. Please try again.'
  } catch { encounterError.value = 'Could not return to study. Check the study-decks route.' }
}

const battleOptions = computed(() =>
  (demoQuestion.value?.[1] || []).map((text, index) => ({ id: index, text })),
)

</script>
<template>
  <ExpriencePrompt :result="experiencePrompt" @close="dismissExperience" />
  <div class="arena-with-preview">
  <main class="arena-page" :style="skyStyle">
    <div class="arena-scene" :class="{ 'selection-blur': !enteredArena }" :inert="!enteredArena">
      <div class="boss-background-layer" :style="skyStyle" aria-hidden="true">
        <img v-if="forestNight" class="forest-sky-texture" :src="`${sceneBase}town/bg_stars.png`" alt="" draggable="false" />
        <img v-else class="forest-sky-texture" :src="`${sceneBase}town/bg_clouds.png`" alt="" draggable="false" />
        <img class="forest-celestial" :src="`${sceneBase}town/${forestNight ? 'bg_moon.png' : 'bg_sun.png'}`" alt="" draggable="false" />
        <img class="forest-art" :src="`${sceneBase}surprise-boss/forest-raised.png`" :style="forestArtStyle" alt="" draggable="false" />
        <div v-if="rainActive" class="forest-rain" />
      </div>

      <!-- The question stays on the arena's built-in screen. -->
      <section v-if="enteredArena && quizzesOpen" class="quiz-content demo-board" aria-label="Legendary boss question">
        <div class="demo-caption"><span>LEGENDARY BATTLE · {{ selectedDemoTopic?.name }}</span><span>{{ demoFinished ? 'Complete' : `${demoIndex + 1} / ${demoQuestions.length}` }}</span></div>
        <h2 id="arena-question">{{ demoFinished ? (demoScore >= hitsRequired ? 'Boss defeated!' : 'Boss battle lost') : demoQuestion?.[0] }}</h2>
        <p v-if="demoFinished">You answered {{ demoScore }} of {{ demoQuestions.length }} correctly.</p>
      </section>

      <!-- Classic battle menu: dialogue left, four choices right. -->
      <BattleAnswerPanel v-if="enteredArena && quizzesOpen"
        :options="battleOptions"
        :selected-id="demoChoice"
        :correct-id="demoQuestion?.[2] ?? null"
        :finished="demoFinished"
        :disabled="!quizzesOpen"
        graded
        @select="answerDemo">
        <template #dialogue>
          <template v-if="demoFinished">
            <span class="dialogue-kicker">ENCOUNTER COMPLETE</span>
            <p>{{ demoScore >= hitsRequired ? 'Boss defeated! Your saved flashcards and remaining study time are ready.' : 'The boss won this round. Restart your full flashcard deck with a fresh 25-minute timer.' }}</p>
            <small>Demo practice · results are not saved.</small>
          </template>
          <template v-else-if="demoChoice === null">
            <p>What will <strong>{{ fighters[0]?.name || 'your buddy' }}</strong> do?</p>
          </template>
          <template v-else>
            <p class="battle-explanation">{{ demoQuestion[3] }}</p>
            <button type="button" class="battle-next" @click="nextDemo">{{ demoIndex + 1 === demoQuestions.length ? 'See results' : 'Next question' }} →</button>
          </template>
        </template>
        <template #actions>
          <button type="button" @click="finishEncounter">{{ demoScore >= hitsRequired ? 'Continue flashcards' : 'Restart flashcards · 25:00' }}</button>
        </template>
      </BattleAnswerPanel>
      <div v-for="(fighter, index) in fighters" :key="index" class="arena-fighter" :class="[index === 0 ? 'player-fighter' : 'opponent-fighter', { 'is-hit': attackSide !== null && attackSide !== index }]">
        <div class="fighter-shadow"></div>
        <span v-if="index === 1" class="boss-name">{{ fighter.name }} · Boss HP {{ bossHp }} / {{ hitsRequired }}</span>
        <PokeSprite
          v-if="index === 0"
          :key="fighter.pokename"
          class="player-back-sprite"
          :active-pokemon="fighter.pokemon"
          facing="back"
          embedded
          progress-position="hidden"
        />
        <img v-else-if="fighter.image && !fighter.failed" :key="fighter.image" :src="fighter.image" :alt="`${fighter.name}, ${index === 0 ? 'rear view' : 'front view'}`" crossorigin="anonymous" :style="{ transform: `translateY(${fighter.padding}%)` }" @load="groundArenaSprite($event, fighter)" @error="arenaSpriteError(fighter)" />
        <span v-else class="fighter-unavailable">Sprite unavailable</span>

      </div>
      <p v-if="spriteError && enteredArena" class="sprite-status">{{ spriteError }} <button type="button" @click="loadArenaFighters">Retry</button></p>

    </div>

    <header class="arena-hud">
      <ClockWeather :use-device-location="true" @rain-change="rainActive = $event" />
      <button @click="toggleMute()">{{isMuted?'Unmute':'Mute'}}</button>
    </header>


    <section v-if="!enteredArena" class="arena-picker">
      <div class="picker-shell">
        <h1>Surprise boss battle</h1>
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
@media (max-width: 700px) {
  .arena-scene:not(.selection-blur) .quiz-content { margin-bottom: 12px; }
  .arena-scene:not(.selection-blur) .player-fighter { top: calc(100vw * 941 / 1672 * .77); }
  .arena-scene:not(.selection-blur) .opponent-fighter { top: calc(100vw * 941 / 1672 * .72); }
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

/* The battle occupies the full viewport. */
.arena-with-preview { position: fixed; inset: 0; display: grid; grid-template-rows: minmax(0, 1fr); background: #101d30; }
.arena-with-preview > .arena-page { position: relative; inset: auto; width: 100%; height: 100%; min-height: 0; container-type: size; }
.arena-with-preview .arena-scene { width: min(100%, calc(100cqh * 1672 / 941)); }
@media (min-width: 701px) {
  .arena-with-preview {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100dvh;
    margin: 0;
    padding: 0;
    border: 0;
    overflow: hidden;
  }

  .arena-with-preview > .arena-page {
    display: block;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .arena-with-preview .arena-scene {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: none;
    aspect-ratio: auto;
    margin: 0;
  }
}

/* Forest scene coordinates, based on the 1672 × 941 transparent artwork. */
.arena-scene { max-width: none; }
.arena-scene .quiz-content {
  left: 13.5%; top: 12%; width: 36.5%; height: 21.5%;
  padding: 1cqw; background: transparent; border: 0; box-shadow: none;
}
.arena-scene .demo-board h2 { font-size: clamp(16px, 1.65cqw, 30px); line-height: 1.35; }
.arena-scene .demo-caption { font-size: clamp(9px, .7cqw, 13px); }
.arena-scene .player-fighter { left: 30%; top: 68%; width: 16%; }
.arena-scene .opponent-fighter { left: 78%; top: 55%; width: 18%; }
.boss-name { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); white-space: nowrap; text-transform: capitalize; font: 700 clamp(10px, .9cqw, 16px)/1.3 system-ui; background: #17352fe8; color: #fff0ae; padding: 5px 12px; border: 1px solid #d6b362; border-radius: 20px; }
@media (max-width: 700px) {
  .arena-scene:not(.selection-blur) .quiz-content { position: relative; left: auto; top: auto; width: calc(100% - 24px); height: auto; min-height: 110px; margin: 12px; padding: 18px; background: #193246; border: 2px solid #cfa75b; border-radius: 14px; }
  .arena-scene:not(.selection-blur) .player-fighter { top: calc(100vw * 941 / 1672 * .78); }
  .arena-scene:not(.selection-blur) .opponent-fighter { top: calc(100vw * 941 / 1672 * .57); }
  .arena-scene .demo-board h2 { font-size: 20px; }
  .boss-name { top: 5px; padding: 2px 6px; font-size: 9px; }
}

.encounter-error { position: fixed; z-index: 100; bottom: 80px; left: 20px; background: #172c43; color: white; padding: 12px; }
/* Fit the shared back sprite to the existing player's position and size. */
.player-back-sprite {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 11cqw;
  min-height: 0;
  color: white;
}
.player-back-sprite :deep(h3) { display: none; }
.player-back-sprite :deep(.buddy-stage) { height: 100%; min-height: 0; flex: 1 1 0; }
.player-back-sprite :deep(.buddy-image-container) { align-items: flex-end; }
.player-back-sprite :deep(.buddy-sprite) {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
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

/* This view owns its background so the shared town artwork stays unchanged. */
.boss-background-layer { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; }
.forest-art, .forest-sky-texture { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; user-select: none; }
.forest-celestial { position: absolute; left: 48%; top: 0; width: 8%; height: auto; }
.forest-art { transition: filter 1s; }
.forest-rain { position: absolute; inset: -50%; background: repeating-linear-gradient(105deg, transparent 0 29px, #c9e8ff55 30px, transparent 31px 60px); opacity: .35; animation: forest-rain-fall .7s linear infinite; }
@keyframes forest-rain-fall { to { transform: translate(-20px, 60px); } }
@media (prefers-reduced-motion: reduce) { .forest-rain { animation: none; } }
@media (min-width: 701px) {
  .arena-scene .quiz-content { left: 22%; top: 12%; width: 56%; height: 29%; padding: 1cqw; }
  .arena-scene .demo-board h2 { font-size: clamp(18px, 1.8cqw, 32px); }
  .arena-scene .demo-caption { font-size: clamp(10px, .8cqw, 14px); }
}
.arena-scene .player-fighter { left: 30%; top: 68%; width: 14%; }
.arena-scene .opponent-fighter { left: 75%; top: 66%; width: 12.5%; }
.arena-scene .boss-name { top: 8px; }
@media (max-width: 700px) {
  .arena-scene:not(.selection-blur) .player-fighter { top: calc(100vw * 941 / 1672 * .68); }
  .arena-scene:not(.selection-blur) .opponent-fighter { top: calc(100vw * 941 / 1672 * .66); }
}


.forest-art { transform: none; }


</style>
