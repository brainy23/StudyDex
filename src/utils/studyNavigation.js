// topic_id is canonical; topic remains supported for existing bookmarks and teammates.
export function requestedTopicId(query) {
  const value = query.topic_id ?? query.topic
  return typeof value === 'string' ? value : null
}

export function arenaLocation(topic, subjectId = topic?.subject_id) {
  return {
    name: 'quiz',
    query: {
      ...(subjectId ? { subject: subjectId } : {}),
      ...(topic ? { topic_id: topic.id } : {}),
    },
  }
}

export function requestedConceptIds(query) {
  return [...new Set([query.concept_id, ...[query.concept_ids].flat()])].filter(
    (id) => typeof id === 'string' && id.length > 0,
  )
}

// Concept IDs are revision hints only. The lesson validates them against its topic;
// route parameters never establish a grade or evidence of weakness.
export function lessonReviewLocation(topic, conceptIds = []) {
  const ids = requestedConceptIds({ concept_ids: conceptIds })
  return {
    name: 'study-decks',
    query: {
      ...(topic?.subject_id ? { subject: topic.subject_id } : {}),
      ...(topic ? { topic_id: topic.id } : {}),
      mode: 'learn',
      review: ids.length ? 'concepts' : 'topic',
      ...(ids.length ? { concept_ids: ids } : {}),
    },
  }
}
