import { beforeEach, expect, it, vi } from 'vitest'
import {
  getSelectedStudyBuddy,
  getStudyCatalogue,
  getTopicLesson,
  getStudyQuestions,
  getTopicFlashcards,
  studyErrorMessage,
  resolveStudyImage,
} from '../studyService'
import { getOwnedPokemon } from '../pokemonService'
vi.mock('../pokemonService', () => ({ getOwnedPokemon: vi.fn() }))
import { revisionCards } from '../../test/studyFixtures'

const { from } = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ from }) }))
const requests = []
let responses
beforeEach(() => {
  requests.length = 0
  from.mockReset()
  responses = {}
  from.mockImplementation((table) => {
    const query = Object.assign(Promise.resolve(responses[table] || { data: [], error: null }), {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    })
    requests.push({ table, query })
    return query
  })
})

it('requires a real profile level and filters/orders the topic catalogue', async () => {
  await expect(getStudyCatalogue(null)).rejects.toThrow('Account Settings')
  expect(from).not.toHaveBeenCalled()
  await getStudyCatalogue('level-4')
  const query = requests.find((request) => request.table === 'topics').query
  expect(query.eq).toHaveBeenCalledWith('level_id', 'level-4')
  expect(query.order).toHaveBeenCalledWith('topic_order', { nullsFirst: false })
})

it('orders goals and concepts without requesting assessment questions or answer keys', async () => {
  responses.topic_concepts = { data: [{ id: 'concept-1' }], error: null }
  responses.questions = {
    data: null,
    error: { code: '42501', message: 'permission denied for table questions' },
  }
  const result = await getTopicLesson('topic-1')
  expect(result.concepts).toEqual([{ id: 'concept-1' }])
  expect(result.errors).toEqual({})
  expect(result).not.toHaveProperty('questions')
  expect(
    requests.find((request) => request.table === 'topic_learning_goals').query.order,
  ).toHaveBeenCalledWith('goal_order')
  expect(
    requests.find((request) => request.table === 'topic_concepts').query.order,
  ).toHaveBeenCalledWith('concept_order')
  expect(requests.map((request) => request.table)).toEqual(['topic_learning_goals', 'topic_concepts'])
})

it('retains partial lesson content and reports denied concepts independently', async () => {
  responses.topic_learning_goals = { data: [{ id: 'goal-1' }], error: null }
  responses.topic_concepts = { data: null, error: { code: '42501' } }
  const result = await getTopicLesson('topic-1')
  expect(result.goals).toEqual([{ id: 'goal-1' }])
  expect(result.concepts).toEqual([])
  expect(result.errors.concepts).toEqual({ code: '42501' })
})

it.each(['quiz', 'boss_battle'])(
  'retrieves %s options with an explicit safe field list and never reads answer keys',
  async (purpose) => {
    responses.questions = { data: [{ id: 'q1' }, { id: 'q2' }], error: null }
    responses.question_options = {
      data: [
        { id: 'o1', question_id: 'q1' },
        { id: 'o2', question_id: 'q2' },
      ],
      error: null,
    }
    const result = await getStudyQuestions('topic-1', purpose)
    expect(result[0].options.map((option) => option.id)).toEqual(['o1'])
    expect(result[1].options.map((option) => option.id)).toEqual(['o2'])
    expect(requests[0].query.eq).toHaveBeenCalledWith('question_purpose', purpose)
    expect(requests[1].query.in).toHaveBeenCalledWith('question_id', ['q1', 'q2'])
    expect(requests.map((request) => request.table)).toEqual(['questions', 'question_options'])
    for (const { query } of requests) {
      expect(query.select.mock.calls[0][0]).not.toMatch(/\*|correct|answer|explanation/)
    }
  },
)

it('returns an empty bank honestly, including flashcards, and does not query options unnecessarily', async () => {
  expect(await getStudyQuestions('topic-1', 'quiz')).toEqual([])
  expect(await getTopicFlashcards('topic-1')).toEqual([])
  expect(from).not.toHaveBeenCalledWith('question_options')
  expect(
    requests.find((request) => request.table === 'flashcards').query.order,
  ).toHaveBeenCalledWith('card_order')
})

it('propagates catalogue/flashcard permission failures instead of substituting demo content', async () => {
  const error = { code: '42501', message: 'permission denied' }
  responses.subjects = { data: null, error }
  responses.flashcards = { data: null, error }
  await expect(getStudyCatalogue('level-3')).rejects.toEqual(error)
  await expect(getTopicFlashcards('topic-1')).rejects.toEqual(error)
  expect(studyErrorMessage(error, 'Flashcards')).toContain('does not have permission')
})

it('only accepts safe image paths without guessing a bucket', () => {
  expect(resolveStudyImage('/assets/male.png')).toBe('/assets/male.png')
  expect(resolveStudyImage('https://example.com/card.png')).toBe('https://example.com/card.png')
  expect(resolveStudyImage('')).toBe('')
  expect(resolveStudyImage('javascript:alert(1)')).toBe('')
  expect(resolveStudyImage('//example.com/card.png')).toBe('')
})

it('returns all 15 flashcard records with matching front/back content and topic/concept IDs', async () => {
  responses.flashcards = { data: structuredClone(revisionCards), error: null }
  const result = await getTopicFlashcards('topic-1')
  expect(result).toEqual(revisionCards)
  expect(result.map((card) => card.card_order)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1))
  const { query } = requests.find((request) => request.table === 'flashcards')
  expect(query.eq).toHaveBeenCalledWith('topic_id', 'topic-1')
  expect(query.order).toHaveBeenCalledWith('card_order')
  expect(query.select).toHaveBeenCalledWith(
    'id, topic_id, concept_id, front_text, back_text, front_image_path, back_image_path, card_order',
  )
})

it('uses the selected saved evolution in Lab without resetting its stage', async () => {
  getOwnedPokemon.mockResolvedValue({ userId: 'student', pokemon: [{ ownedId: 'owned', pokemon_id: 'catalogue-base', id: 6, originalSpeciesId: 4, name: 'Charizard', xp: 175, level: 3, stageCount: 3, evolution_stage: 2, is_selected: true, static_img: '/saved.png' }] })
  expect(await getSelectedStudyBuddy('student')).toMatchObject({ xp: 175, evolution_stage: 2, stageCount: 3, originalSpeciesId: 4, pokemon: { pokeapi_id: 6, name: 'Charizard' } })
})
