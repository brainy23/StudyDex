import { expect, it } from 'vitest'
import { arenaLocation, lessonReviewLocation, requestedConceptIds, requestedTopicId } from '../studyNavigation'

const topic = { id: 'science-topic', subject_id: 'science' }

it('keeps canonical topic IDs and legacy bookmarks compatible', () => {
  expect(requestedTopicId({ topic: 'legacy-topic' })).toBe('legacy-topic')
  expect(requestedTopicId({ topic_id: topic.id, topic: 'legacy-topic' })).toBe(topic.id)
  expect(arenaLocation(topic)).toEqual({ name: 'quiz', query: { subject: 'science', topic_id: topic.id } })
})

it('builds targeted revision from distinct non-null concept hints without adding scores', () => {
  const location = lessonReviewLocation(topic, ['concept-b', null, 'concept-a', 'concept-b'])
  expect(location).toEqual({
    name: 'study-decks',
    query: { subject: 'science', topic_id: topic.id, mode: 'learn', review: 'concepts', concept_ids: ['concept-b', 'concept-a'] },
  })
  expect(requestedConceptIds(location.query)).toEqual(['concept-b', 'concept-a'])
  expect(requestedConceptIds({ concept_id: 'concept-a', concept_ids: ['concept-a', 'concept-b', null] })).toEqual(['concept-a', 'concept-b'])
})

it('uses the entire-topic overview when concept evidence is unavailable', () => {
  expect(lessonReviewLocation(topic, [null, ''])).toEqual({
    name: 'study-decks',
    query: { subject: 'science', topic_id: topic.id, mode: 'learn', review: 'topic' },
  })
})
