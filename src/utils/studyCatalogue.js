// The profile comes from the authenticated profile service, never a URL level.
export function studentLevelNumber(profile) {
  const number = Number(profile?.school_level?.level_number)
  if (Number.isInteger(number) && number >= 1 && number <= 6) return number
  const match = String(profile?.school_level?.name || '').match(/^(?:primary\s*|p\s*)([1-6])$/i)
  return match ? Number(match[1]) : null
}

export function filterStudentCatalogue(catalogue, profile) {
  const level = studentLevelNumber(profile)
  if (!level || !profile?.school_level_id) return { subjects: [], topics: [] }
  const subjects = catalogue.subjects.filter((subject) => {
    const name = String(subject.name || '').trim()
    return /^(math|maths|mathematics)$/i.test(name) || (level >= 3 && /^science$/i.test(name))
  })
  const subjectIds = new Set(subjects.map((subject) => subject.id))
  const topics = catalogue.topics.filter(
    (topic) => topic.level_id === profile.school_level_id && subjectIds.has(topic.subject_id),
  )
  const availableSubjects = new Set(topics.map((topic) => topic.subject_id))
  return { subjects: subjects.filter((subject) => availableSubjects.has(subject.id)), topics }
}
