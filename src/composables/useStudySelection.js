import { onMounted, onUnmounted, ref } from 'vue'
import { getCurrentProfile } from '../services/profileService'
import { getStudyCatalogue, studyErrorMessage } from '../services/studyService'

// Each selector uses the saved profile level; route parameters never grant access.
export function useStudySelection() {
  const profile = ref(null)
  const catalogue = ref({ subjects: [], topics: [] })
  const loading = ref(true)
  const error = ref('')
  let active = true
  let generation = 0

  async function load() {
    const request = ++generation
    loading.value = true
    error.value = ''
    profile.value = null
    catalogue.value = { subjects: [], topics: [] }
    try {
      const student = await getCurrentProfile()
      if (!active || request !== generation) return
      profile.value = student
      if (student.school_level_id) {
        const data = await getStudyCatalogue(student.school_level_id)
        if (active && request === generation) catalogue.value = data
      }
    } catch (cause) {
      if (active && request === generation) error.value = studyErrorMessage(cause, 'Your topics')
    } finally {
      if (active && request === generation) loading.value = false
    }
  }

  onMounted(load)
  onUnmounted(() => {
    active = false
    generation++
  })
  return { profile, catalogue, loading, error, load }
}
