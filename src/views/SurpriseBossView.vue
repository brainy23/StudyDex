<script setup>
import ExpriencePrompt from '../components/common/xpPrompt.vue'
import { useExperiencePrompt } from '../composables/useExperiencePrompt.js'
import { newExperienceId, getRewardedTimerCount } from '../services/experienceService'

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
import { getSelectedStudyBuddy, getStudyCatalogue, studyErrorMessage } from '../services/studyService'
import TownBackground from '@/components/common/TownBackground.vue'
import ClockWeather from '@/components/common/ClockWeather.vue'
import { useTimeOfDay } from '@/composables/useTimeOfDay'
import Pokemon_Backwards from '@/components/pokebuddy/Pokemon_Backwards.vue'

const profile = ref(null)
const selectedRewardBuddy=ref(null)
const { prompt:experiencePrompt, reward:rewardExperience, dismiss:dismissExperience }=useExperiencePrompt(selectedRewardBuddy, async ()=>{
  selectedRewardBuddy.value=await getSelectedStudyBuddy(profile.value.id)
})
const catalogue = ref({ subjects: [], topics: [] })
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
    if (student.school_level_id) {
      // Science demos work even when the published catalogue is unavailable.
      try {
        const data = await getStudyCatalogue(student.school_level_id)
        if (alive && request === generation) catalogue.value = data
      } catch { catalogue.value = { subjects: [], topics: [] } }
    }
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
// Preview bar has its own layout row below the arena.
const live = ref(true)
const previewHour = ref(12)
const autoPreview = ref(false)
let previewInterval
function stopAutoPreview() {
  clearInterval(previewInterval)
  previewInterval = undefined
  autoPreview.value = false
}
function useLiveTime() {
  stopAutoPreview()
  live.value = true
}
function setPreview(value) {
  const next = Number(value)
  if (!Number.isFinite(next)) return
  stopAutoPreview()
  live.value = false
  previewHour.value = ((next % 24) + 24) % 24
}
function toggleAutoPreview() {
  if (autoPreview.value) { stopAutoPreview(); return }
  previewHour.value = hour.value
  live.value = false
  autoPreview.value = true
  const startedAt = performance.now()
  const startHour = previewHour.value
  previewInterval = setInterval(() => {
    previewHour.value = (startHour + (performance.now() - startedAt) / 60000 * 24) % 24
  }, 50)
}
onUnmounted(stopAutoPreview)

// Shared time source is still needed by the preview controls and opening rule.
const { hour, lighting } = useTimeOfDay({ live, previewHour })
const rainActive = ref(false)
const quizzesOpen = computed(() => !!encounter.value || hour.value >= 7)
const displayTime = computed(() => {
  const minutes = Math.floor(hour.value * 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})
// Match the margins around the proportional scene to its shared sky colours.
const skyStyle = computed(() => ({
  background: `linear-gradient(to bottom, ${lighting.value.top} 0%, ${lighting.value.horizon} 30%)`
}))

const enteredArena = ref(false)
const pickerSubjectId = ref(null)
const pickerBusy = ref(false)
const pickerError = ref('')
// MOE Primary Science Syllabus 2023: topic overview, printed page 20.
// These are topic labels, not generated questions or database IDs.
const scienceCourse = ref('standard')
const scienceTopics = [
  { key: 'p3-living', level: 3, theme: 'Diversity', name: 'Living and Non-Living Things', official: 'Diversity of living and non-living things (General characteristics and classification)', aliases: ['Diversity of living and non-living things', 'General characteristics and classification'] },
  { key: 'p3-materials', level: 3, theme: 'Diversity', name: 'Materials', official: 'Diversity of materials', aliases: ['Diversity of materials'] },
  { key: 'p3-life-cycles', level: 3, theme: 'Cycles', name: 'Life Cycles', official: 'Cycles in plants and animals (Life cycles)', aliases: ['Life cycles of plants and animals'] },
  { key: 'p3-magnets', level: 3, theme: 'Interactions', name: 'Magnets', official: 'Interaction of forces (Magnets)', aliases: ['Magnetism'] },
  { key: 'p4-plants', level: 4, theme: 'Systems', name: 'Plant Parts and Functions', official: 'Plant system (Plant parts and functions)', aliases: [] },
  { key: 'p4-digestion', level: 4, theme: 'Systems', name: 'Digestive System', official: 'Human system (Digestive system)', aliases: ['Human digestive system', 'Digestion'] },
  { key: 'p4-matter', level: 4, theme: 'Cycles', name: 'Matter', official: 'Cycles in matter and water (Matter)', aliases: [] },
  { key: 'p4-light', level: 4, theme: 'Energy', name: 'Light', official: 'Energy forms and uses (Light)', aliases: [] },
  { key: 'p4-heat', level: 4, theme: 'Energy', name: 'Heat', official: 'Energy forms and uses (Heat)', aliases: [] },
  { key: 'p5-reproduction', level: 5, theme: 'Cycles', name: 'Reproduction in Plants and Animals', official: 'Cycles in plants and animals (Reproduction)', aliases: ['Reproduction'] },
  { key: 'p5-water', level: 5, theme: 'Cycles', name: 'Water', official: 'Cycles in matter and water (Water)', aliases: ['Water cycle'] },
  { key: 'p5-plants', level: 5, theme: 'Systems', name: 'Plant Respiratory and Circulatory Systems', official: 'Plant system (Respiratory and circulatory systems)', aliases: ['Plant transport system', 'Plant transport systems'] },
  { key: 'p5-human', level: 5, theme: 'Systems', name: 'Human Respiratory and Circulatory Systems', official: 'Human system (Respiratory and circulatory systems)', aliases: [] },
  { key: 'p5-electricity', level: 5, theme: 'Systems', name: 'Electrical System', official: 'Electrical system', aliases: ['Electrical systems', 'Electricity'] },
  { key: 'p6-photosynthesis', level: 6, theme: 'Energy', name: 'Photosynthesis', official: 'Energy forms and uses (Photosynthesis)', aliases: [] },
  { key: 'p6-energy', level: 6, theme: 'Energy', name: 'Energy Conversion', official: 'Energy conversion', aliases: [], standardOnly: true },
  { key: 'p6-forces', level: 6, theme: 'Interactions', name: 'Forces', official: 'Interaction of forces (Frictional force, gravitational force, elastic spring force)', aliases: ['Interaction of forces', 'Frictional force, gravitational force, elastic spring force'] },
  { key: 'p6-environment', level: 6, theme: 'Interactions', name: 'Interactions within the Environment', official: 'Interactions within the environment', aliases: ['Interactions in the environment'] },
]

const normaliseTopic = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const studentScienceLevel = computed(() => {
  const match = String(profile.value?.school_level?.name || '').trim().match(/^(?:primary\s*|p\s*)?([3-6])(?:\b|$)/i)
  return match ? Number(match[1]) : null
})
const scienceLevel = computed(() => studentScienceLevel.value)
const scienceSubject = computed(() => catalogue.value.subjects.find(item => normaliseTopic(item.name) === 'science') || { id: 'moe-science-preview', name: 'Science' })
const visibleSubjects = computed(() => [
  scienceSubject.value,
  ...catalogue.value.subjects.filter(item => item.id !== scienceSubject.value.id && catalogue.value.topics.some(t => t.subject_id === item.id)),
])
const pickerSubject = computed(() => visibleSubjects.value.find(item => item.id === pickerSubjectId.value))
const pickingScience = computed(() => pickerSubject.value?.id === scienceSubject.value.id)
const pickerTopics = computed(() => {
  if (!pickingScience.value) return catalogue.value.topics.filter(item => item.subject_id === pickerSubjectId.value).map(item => ({ ...item, ready: false }))
  return scienceTopics.filter(item => item.level === scienceLevel.value && !(scienceCourse.value === 'foundation' && item.standardOnly)).map(item => ({
    ...item, id: item.key, ready: !!demoBank[item.key]?.length,
    detail: item.key === 'p6-forces' ? (scienceCourse.value === 'foundation' ? 'Frictional and gravitational forces' : 'Frictional, gravitational and elastic spring forces') : item.official,
  }))
})
function topicCanEnter(item) { return item.ready && quizzesOpen.value && !pickerBusy.value }
function topicStatus(item) {
  if (!item.ready) return 'Demo questions not added yet'
  if (!quizzesOpen.value) return 'Available from 7am'
  return `${demoBank[item.key].length} demo questions · Enter battle →`
}
function selectPickerSubject(item) { pickerSubjectId.value = item.id; pickerError.value = '' }
function enterTopic(item) {
  if (!topicCanEnter(item)) return
  selectedDemoTopic.value = item
  restartDemo()
  enteredArena.value = true
}
function returnToSelection() { enteredArena.value = false; clearAttack() }
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
  // The shared component accepts a PokéAPI name or ID as text.
  fighters.value = [{ name: selected.name || 'Your buddy', pokename: String(selected.id) }]
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
const demoBank = {
  "p3-living": [
    [
      "Which is a living thing?",
      [
        "Stone",
        "Mushroom",
        "Plastic bottle",
        "Spoon"
      ],
      1,
      "A mushroom is a living thing. It grows and needs food, air and water."
    ],
    [
      "Which observation alone does NOT prove that something is living?",
      [
        "It reproduces",
        "It grows naturally",
        "It moves",
        "It needs food"
      ],
      2,
      "A toy car can move, but it is not living. Consider several characteristics together."
    ]
  ],
  "p3-materials": [
    [
      "Which material is suitable for a clear window?",
      [
        "Glass",
        "Cardboard",
        "Cloth",
        "Wood"
      ],
      0,
      "Clear glass allows us to see through it."
    ],
    [
      "Why is rubber suitable for a rubber band?",
      [
        "It is transparent",
        "It dissolves easily",
        "It is magnetic",
        "It can stretch"
      ],
      3,
      "Rubber can stretch and return towards its original shape."
    ]
  ],
  "p3-life-cycles": [
    [
      "What comes after the egg in a butterfly’s life cycle?",
      [
        "Adult butterfly",
        "Pupa",
        "Larva (caterpillar)",
        "Seed"
      ],
      2,
      "The egg hatches into a caterpillar, which is the larval stage."
    ],
    [
      "What can a seed grow into under suitable conditions?",
      [
        "A young plant",
        "A pupa",
        "An egg",
        "A rock"
      ],
      0,
      "A seed can germinate and develop into a young plant."
    ]
  ],
  "p3-magnets": [
    [
      "What happens when two north poles are brought close together?",
      [
        "They attract",
        "They repel",
        "They disappear",
        "They melt"
      ],
      1,
      "Like magnetic poles repel one another."
    ],
    [
      "Which object is attracted to a magnet?",
      [
        "Wooden ruler",
        "Plastic cup",
        "Iron nail",
        "Glass marble"
      ],
      2,
      "Iron is a magnetic material."
    ]
  ],
  "p4-plants": [
    [
      "Which plant part mainly absorbs water from the soil?",
      [
        "Flower",
        "Leaf",
        "Fruit",
        "Roots"
      ],
      3,
      "Roots absorb water and mineral salts from the soil."
    ],
    [
      "Which part usually supports the leaves and flowers?",
      [
        "Stem",
        "Seed",
        "Petal",
        "Fruit"
      ],
      0,
      "The stem supports the plant and transports substances."
    ]
  ],
  "p4-digestion": [
    [
      "Where does digestion begin?",
      [
        "Stomach",
        "Mouth",
        "Large intestine",
        "Small intestine"
      ],
      1,
      "Digestion begins in the mouth, where food is chewed and mixed with saliva."
    ],
    [
      "Where is most digested food absorbed into the blood?",
      [
        "Mouth",
        "Food pipe",
        "Small intestine",
        "Stomach"
      ],
      2,
      "Most digested food is absorbed through the walls of the small intestine."
    ]
  ],
  "p4-matter": [
    [
      "Which statement describes matter?",
      [
        "It must be visible",
        "It must be solid",
        "It has no mass",
        "It has mass and occupies space"
      ],
      3,
      "Matter has mass and occupies space. Air is matter too."
    ],
    [
      "What happens to the shape of water when it is poured into another container?",
      [
        "It takes the container’s shape",
        "It always stays square",
        "It becomes a solid",
        "It loses all its mass"
      ],
      0,
      "A liquid has no fixed shape and takes the shape of its container."
    ]
  ],
  "p4-light": [
    [
      "Why can we see a book under a lamp?",
      [
        "The book makes light",
        "Light reflects from the book into our eyes",
        "Our eyes send light to it",
        "The book absorbs all light"
      ],
      1,
      "We see the book when reflected light enters our eyes."
    ],
    [
      "How is a shadow formed?",
      [
        "Sound strikes a wall",
        "Air becomes cold",
        "An object blocks light",
        "Water evaporates"
      ],
      2,
      "A shadow forms where an object blocks light from reaching a surface."
    ]
  ],
  "p4-heat": [
    [
      "In which direction does heat flow naturally?",
      [
        "From colder to hotter",
        "Only upwards",
        "Only through water",
        "From hotter to colder"
      ],
      3,
      "Heat flows from a hotter object or region to a colder one."
    ],
    [
      "Which material is usually suitable for a saucepan handle?",
      [
        "Wood",
        "Copper",
        "Iron",
        "Aluminium"
      ],
      0,
      "Wood is a poor conductor of heat, so less heat reaches the hand."
    ]
  ],
  "p5-reproduction": [
    [
      "Why do living things reproduce?",
      [
        "To become heavier",
        "To ensure their kind continues",
        "To stop growing",
        "To avoid needing food"
      ],
      1,
      "Reproduction produces new individuals and helps a kind of organism continue."
    ],
    [
      "After fertilisation, what can an ovule in a flower develop into?",
      [
        "A leaf",
        "A root",
        "A seed",
        "A petal"
      ],
      2,
      "A fertilised ovule can develop into a seed."
    ]
  ],
  "p5-water": [
    [
      "What is the change from water vapour to liquid water called?",
      [
        "Melting",
        "Freezing",
        "Evaporation",
        "Condensation"
      ],
      3,
      "Condensation changes water vapour into liquid water as it loses heat."
    ],
    [
      "What provides the energy for much of the evaporation in the water cycle?",
      [
        "The Sun",
        "The Moon",
        "The soil’s colour",
        "Clouds blocking light"
      ],
      0,
      "Heat from the Sun causes water to evaporate."
    ]
  ],
  "p5-plants": [
    [
      "Which substances are carried from roots to other plant parts in water-carrying tubes?",
      [
        "Only oxygen",
        "Water and mineral salts",
        "Only sugar",
        "Only carbon dioxide"
      ],
      1,
      "Water-carrying tubes transport water and mineral salts absorbed by roots."
    ],
    [
      "Through which structures does most gas exchange occur in leaves?",
      [
        "Petals",
        "Seeds",
        "Stomata",
        "Roots only"
      ],
      2,
      "Stomata are tiny openings through which gases enter and leave leaves."
    ]
  ],
  "p5-human": [
    [
      "Which organs take in oxygen from air and remove carbon dioxide?",
      [
        "Stomach",
        "Kidneys",
        "Food pipe",
        "Lungs"
      ],
      3,
      "Gas exchange takes place in the lungs."
    ],
    [
      "What is the main function of the heart?",
      [
        "Pump blood around the body",
        "Digest food",
        "Make air",
        "Store undigested food"
      ],
      0,
      "The heart pumps blood to transport substances around the body."
    ]
  ],
  "p5-electricity": [
    [
      "What is needed for a bulb to light in a simple working circuit?",
      [
        "A gap in the wire",
        "A complete circuit with a cell",
        "Only a bulb",
        "A plastic connection"
      ],
      1,
      "Current can flow through a complete circuit connected to a cell."
    ],
    [
      "Which material can complete a circuit by conducting electricity?",
      [
        "Rubber",
        "Plastic",
        "Copper",
        "Dry wood"
      ],
      2,
      "Copper conducts electricity and is commonly used in wires."
    ]
  ],
  "p6-photosynthesis": [
    [
      "Which gas do green plants take in for photosynthesis?",
      [
        "Oxygen",
        "Nitrogen",
        "Helium",
        "Carbon dioxide"
      ],
      3,
      "Plants use carbon dioxide and water to make food in the presence of light."
    ],
    [
      "What is the role of light in photosynthesis?",
      [
        "It supplies energy to make food",
        "It supplies mineral salts",
        "It replaces water",
        "It stops gas exchange"
      ],
      0,
      "Light supplies the energy needed for photosynthesis."
    ]
  ],
  "p6-energy": [
    [
      "A battery-powered torch mainly converts stored chemical energy into which useful output?",
      [
        "Sound",
        "Light",
        "Gravitational potential energy",
        "Elastic potential energy"
      ],
      1,
      "A torch produces useful light energy, as well as some heat."
    ],
    [
      "What happens to a falling ball’s gravitational potential energy as its speed increases?",
      [
        "It becomes water",
        "It disappears completely",
        "It is converted into kinetic energy",
        "It becomes food"
      ],
      2,
      "As the ball falls, gravitational potential energy is converted into kinetic energy."
    ]
  ],
  "p6-forces": [
    [
      "Which force pulls a dropped object towards Earth?",
      [
        "Magnetic force",
        "Elastic spring force",
        "Friction only",
        "Gravitational force"
      ],
      3,
      "Earth’s gravitational force pulls the object towards Earth."
    ],
    [
      "What does friction usually do to a sliding object?",
      [
        "Opposes its sliding motion",
        "Always speeds it up",
        "Makes it weightless",
        "Turns it into a magnet"
      ],
      0,
      "Friction opposes motion between surfaces in contact."
    ]
  ],
  "p6-environment": [
    [
      "In the chain grass → grasshopper → frog, which organism is the producer?",
      [
        "Frog",
        "Grass",
        "Grasshopper",
        "All three"
      ],
      1,
      "Grass makes its own food using light energy."
    ],
    [
      "If food becomes scarce in a habitat, what is likely to increase among animals needing that food?",
      [
        "Photosynthesis",
        "Water production",
        "Competition",
        "Seed dispersal"
      ],
      2,
      "Animals compete when a shared resource such as food is limited."
    ]
  ]
}
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
function restartDemo() {
  clearAttack()
  demoIndex.value = 0
  demoChoice.value = null
  demoScore.value = 0
  demoFinished.value = false
}
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
  rewardExperience({id:encounter.value.xpEventId,type:'boss',health:bossHp.value})
})
async function finishEncounter() {
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
</script>
<template>
  <ExpriencePrompt :result="experiencePrompt" @close="dismissExperience" />
  <div class="arena-with-preview">
  <main class="arena-page" :style="skyStyle">
    <div class="arena-scene" :class="{ 'selection-blur': !enteredArena }" :inert="!enteredArena">
      <TownBackground
        class="boss-background-layer"
        scene="boss"
        :live="live"
        :preview-hour="previewHour"
        :rain-active="rainActive"
      />

      <!-- The question stays on the arena's built-in screen. -->
      <section v-if="enteredArena && quizzesOpen" class="quiz-content demo-board" aria-label="Legendary boss question">
        <div class="demo-caption"><span>LEGENDARY BATTLE · {{ selectedDemoTopic?.name }}</span><span>{{ demoFinished ? 'Complete' : `${demoIndex + 1} / ${demoQuestions.length}` }}</span></div>
        <h2 id="arena-question">{{ demoFinished ? (demoScore >= hitsRequired ? 'Boss defeated!' : 'Boss battle lost') : demoQuestion?.[0] }}</h2>
        <p v-if="demoFinished">You answered {{ demoScore }} of {{ demoQuestions.length }} correctly.</p>
      </section>

      <!-- Classic battle menu: dialogue left, four choices right. -->
      <section v-if="enteredArena && quizzesOpen" class="battle-dock" aria-label="Battle answer controls">
        <div class="battle-dialogue" aria-live="polite">
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
        </div>
        <div v-if="demoFinished" class="battle-end-actions">
          <button type="button" @click="finishEncounter">{{ demoScore >= hitsRequired ? 'Continue flashcards' : 'Restart flashcards · 25:00' }}</button>
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
        <img v-else-if="fighter.image && !fighter.failed" :key="fighter.image" :src="fighter.image" :alt="`${fighter.name}, ${index === 0 ? 'rear view' : 'front view'}`" crossorigin="anonymous" :style="{ transform: `translateY(${fighter.padding}%)` }" @load="groundArenaSprite($event, fighter)" @error="arenaSpriteError(fighter)" />
        <span v-else class="fighter-unavailable">Sprite unavailable</span>

      </div>
      <p v-if="spriteError && enteredArena" class="sprite-status">{{ spriteError }} <button type="button" @click="loadArenaFighters">Retry</button></p>

    </div>

    <header class="arena-hud">
      <ClockWeather :use-device-location="true" @rain-change="rainActive = $event" />
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
  <footer class="time-preview-bar" aria-label="Time preview controls">
    <div class="time-bar-inner">
      <strong class="time-bar-title">Time preview <span>{{ displayTime }}</span></strong>
      <button type="button" :aria-pressed="live" @click="useLiveTime">Live</button>
      <button v-for="preset in [{ label: '7am', hour: 7 }, { label: 'Day', hour: 12 }, { label: 'Sunset', hour: 18.5 }, { label: 'Night', hour: 21 }, { label: 'Midnight', hour: 0 }]" :key="preset.label" type="button" :aria-pressed="!live && !autoPreview && Math.abs(previewHour - preset.hour) < .001" @click="setPreview(preset.hour)">{{ preset.label }}</button>
      <button type="button" :aria-pressed="autoPreview" @click="toggleAutoPreview">{{ autoPreview ? 'Pause cycle' : '▶ Cycle day' }}</button>
      <label class="time-bar-slider"><span>Time</span><input type="range" min="0" max="1439" step="1" :value="Math.floor(hour * 60)" :aria-valuetext="displayTime" @input="setPreview(Number($event.target.value) / 60)" /></label>
      <span class="time-bar-status">{{ live ? 'Live clock' : autoPreview ? '24 hours in 60 seconds' : 'Preview paused' }}</span>
    </div>
  </footer>
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
