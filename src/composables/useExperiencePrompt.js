import { computed, reactive, ref, unref } from 'vue'
import { awardExperience } from '../services/experienceService'

function rewardTitle(result) {
  switch (result.rewardType) {
    case 'boss': return result.delta > 0 ? 'Boss defeated!' : 'Boss battle lost'
    case 'quiz': return 'Quiz complete!'
    case 'timer': return 'Study session complete!'
    case 'flashcards': return 'Flashcards complete!'
    default: return 'Activity complete!'
  }
}

export function useExperiencePrompt(buddy, onSaved = () => {}) {
  const queue = ref([])
  const jobs = new Map()
  const prompt = computed(() => queue.value[0] || null)

  let pending = Promise.resolve()
  async function reward(event) {
    if (!event?.id) throw Error('An activity ID is required.')
    const existing = jobs.get(event.id)
    if (existing) return existing
    const recipient = unref(buddy)
    // Capture recipient and result inputs before asynchronous work/retries.
    const request = { ...event, pokemonId: event.pokemonId ?? recipient?.id }
    const job = reactive({
      id: event.id, title: 'Saving Pokémon XP…', saving: true,
      pokemonName: recipient?.pokemon?.name || 'Your Pokémon', error: '',
    })
    jobs.set(event.id, job)
    queue.value.push(job)
    let inFlight = false
    let saved = false

    async function save() {
      if (inFlight || saved) return
      inFlight = true
      job.saving = true
      job.error = ''
      try {
        const result = await awardExperience(request)
        saved = true
        // Old duplicate records may not contain rewardType.
        const normalized = { ...result, rewardType: result.rewardType ?? request.type }
        Object.assign(job, normalized, { title: rewardTitle(normalized) })
        // Existing callback still receives the result. The optional second argument
        // lets your progression handler update this SAME reactive modal result with
        // reachedMaxEvolution/giftPokemon/etc. Do not award the XP a second time.
        try {
          await onSaved(normalized, job)
        } catch (cause) {
          job.progressionError = cause?.message || 'Progress refresh failed.'
          console.warn('XP saved; progression/refresh callback failed.', cause)
        }
      } catch (cause) {
        job.title = 'XP not saved yet'
        job.error = cause?.message || 'Please retry.'
      } finally {
        job.saving = false
        inFlight = false
      }
    }
    // Serialize different activities so each plan starts from the last saved state.
    function enqueueSave() {
      const operation = pending.then(save)
      pending = operation.catch(() => {})
      return operation
    }
    job.retry = enqueueSave
    await enqueueSave()
    return job
  }

  function dismiss() {
    if (prompt.value && !prompt.value.saving && !prompt.value.animating && !prompt.value.error &&
        !prompt.value.giftOpening && !prompt.value.giftLoading) queue.value.shift()
  }
  async function showSaved(result, title = 'Activity complete!') {
    if (!result) return
    const id = result.eventId || result.id
    if (!id) throw new Error('A saved activity ID is required.')
    const existing = jobs.get(id)
    if (existing) return existing
    const job = reactive({ ...result, id, title, saving: false, error: '' })
    jobs.set(id, job)
    queue.value.push(job)
    try { await onSaved(result, job) }
    catch (cause) { job.progressionError = cause?.message || 'Progress refresh failed.' }
    return job
  }
  function clear() { queue.value = []; jobs.clear() }
  return { prompt, reward, dismiss, showSaved, clear }
}
