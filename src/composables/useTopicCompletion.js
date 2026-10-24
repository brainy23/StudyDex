import { computed, ref } from 'vue'

// This is browser-only learning progress, never evidence for grading or rewards.
// Keep an in-memory fallback so navigation still works if browser storage is blocked.
const records = new Map()

function topicIds(value) {
  return Array.isArray(value)
    ? [...new Set(value.filter((id) => typeof id === 'string' && id.length))]
    : []
}

function readTopicIds(key) {
  const stored = globalThis.localStorage.getItem(key)
  try { return stored ? topicIds(JSON.parse(stored)) : [] } catch { return [] }
}

export function useTopicCompletion() {
  const record = ref(null)
  let storageKey = null

  function bindStudent(userId, levelId) {
    storageKey = userId && levelId
      ? `studydex:completed-topics:${encodeURIComponent(userId)}:${encodeURIComponent(levelId)}`
      : null
    if (!storageKey) {
      record.value = null
      return
    }
    if (!records.has(storageKey)) records.set(storageKey, ref({ ids: [], saved: true }))
    record.value = records.get(storageKey).value
    try {
      const stored = readTopicIds(storageKey)
      record.value.ids = record.value.saved ? stored : topicIds([...stored, ...record.value.ids])
      record.value.saved = record.value.ids.every((id) => stored.includes(id))
    } catch {
      record.value.saved = false
    }
  }

  function markComplete(topicId) {
    if (!record.value || typeof topicId !== 'string' || !topicId) return
    record.value.ids = topicIds([...record.value.ids, topicId])
    try {
      // Merge the latest stored list so another tab's completions are retained.
      const previous = readTopicIds(storageKey)
      record.value.ids = topicIds([...previous, ...record.value.ids])
      globalThis.localStorage.setItem(storageKey, JSON.stringify(record.value.ids))
      record.value.saved = true
    } catch {
      record.value.saved = false
    }
  }

  const completedTopicIds = computed(() => record.value?.ids || [])
  return {
    bindStudent,
    markComplete,
    completedTopicIds,
    savedInBrowser: computed(() => record.value?.saved ?? true),
    isComplete: (topicId) => completedTopicIds.value.includes(topicId),
  }
}
