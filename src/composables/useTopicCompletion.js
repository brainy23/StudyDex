import { computed, ref } from 'vue'
import { getTopicCompletions } from '../services/learningService'

export function useTopicCompletion() {
  const ids = ref([])
  const saved = ref(true)
  let owner = null, generation = 0, flow = 'study'
  async function refresh() {
    const request = ++generation
    if (!owner) { ids.value = []; return }
    try {
      const records = await getTopicCompletions(owner, flow)
      if (request !== generation) return
      ids.value = [...new Set(records.map(row => row.topic_id))]
      saved.value = true
    } catch { if (request === generation) saved.value = false }
  }
  function bindStudent(userId, _levelId, requestedFlow = 'study') {
    owner = userId; flow = requestedFlow; ids.value = []; return refresh()
  }
  return {
    bindStudent, refresh, completedTopicIds: computed(() => ids.value),
    savedInBrowser: computed(() => saved.value), isComplete: id => ids.value.includes(id),
  }
}
