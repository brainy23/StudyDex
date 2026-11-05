import { computed, reactive, ref, unref } from 'vue'
import { awardExperience } from '../services/experienceService'
export function useExperiencePrompt(buddy, onSaved = () => {}) {
  const queue = ref([])
  const seen = new Set()
  const prompt = computed(() => queue.value[0] || null)
  async function reward(event) {
    if (seen.has(event.id)) return
    seen.add(event.id)
    const recipient = unref(buddy)
    const job = reactive({ id:event.id, title:'Saving Pokémon XP…', saving:true,
      pokemonName:recipient?.pokemon?.name || 'Your Pokémon', error:'' })
    // Preserve recipient and event ID through retries.
    const request = { ...event, pokemonId:recipient?.id }
    queue.value.push(job)
    async function save() {
      job.saving=true; job.error=''
      try {
        const result = await awardExperience(request)
        Object.assign(job, result, { saving:false, title: event.type==='boss' ? (event.health ? 'Boss battle lost' : 'Boss defeated!') : 'Activity complete!' })
        // Do not treat a view-refresh failure as a failed award.
        try { await onSaved(result) } catch { /* The committed award is reloaded on the next page visit. */ }
      } catch (cause) {
        job.saving=false; job.title='XP not saved yet'; job.error=cause.message || 'Please retry.'
      }
    }
    job.retry=save
    await save()
  }
  function dismiss() { if (prompt.value && !prompt.value.saving && !prompt.value.error) queue.value.shift() }
  return { prompt, reward, dismiss }
}
