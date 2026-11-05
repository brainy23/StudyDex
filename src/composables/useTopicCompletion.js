import { computed, ref } from 'vue'
import { getTopicCompletions } from '../services/learningService'

export function useTopicCompletion() {
  const ids = ref([])
  const saved = ref(true)
  let owner = null, generation = 0
  async function refresh() {
    const request = ++generation
    if (!owner) { ids.value = []; return }
    try {
      const records = await getTopicCompletions(owner)
      if (request !== generation) return
      ids.value = records.map(row => row.topic_id)
      saved.value = true
    } catch { if (request === generation) saved.value = false }
  }
  function bindStudent(userId) { owner = userId; ids.value = []; return refresh() }
  return {
    bindStudent, refresh, completedTopicIds: computed(() => ids.value),
    savedInBrowser: computed(() => saved.value), isComplete: id => ids.value.includes(id),
  }
}
