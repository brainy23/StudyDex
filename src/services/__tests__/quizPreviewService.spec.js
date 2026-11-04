import { beforeEach, expect, it, vi } from 'vitest'
import {
  getQuizTopicPreview,
  getStudentQuizCatalogue,
  usablePreviewQuestions,
} from '../quizPreviewService'
import { getStudentStudyCatalogue, getStudyQuestions } from '../studyService'

vi.mock('../studyService', () => ({
  getStudentStudyCatalogue: vi.fn(),
  getStudyQuestions: vi.fn(),
}))
const { from } = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ from }) }))
const profile = { id: 'student', school_level_id: 'p1' }
const topic = { id: 'topic-1', subject_id: 'math', level_id: 'p1', name: 'Numbers' }
const catalogue = { subjects: [{ id: 'math', name: 'Mathematics' }], topics: [topic] }
function question(index, patch = {}) {
  const id = `q${index}`
  return {
    id,
    topic_id: topic.id,
    question_text: `2 × ${index} − 1\n● ●`,
    question_type: 'mcq',
    question_purpose: 'quiz',
    difficulty: 1,
    options: [2, 1, 3, 4].map((order) => ({
      id: `${id}-o${order}`,
      question_id: id,
      option_text: `Option ${order}`,
      option_order: order,
    })),
    ...patch,
  }
}
let requests
let responses
beforeEach(() => {
  vi.resetAllMocks()
  getStudentStudyCatalogue.mockResolvedValue(structuredClone(catalogue))
  getStudyQuestions.mockResolvedValue([question(1)])
  requests = []
  responses = {
    questions: [question(1), question(2)],
    question_options: [...question(1).options, ...question(2).options],
  }
  from.mockImplementation((table) => {
    let filter
    const request = {
      table,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn(function (column, ids) {
        filter = (row) => ids.includes(row[column])
        return this
      }),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(async (start, end) => ({
        data: responses[table].filter((row) => !filter || filter(row)).slice(start, end + 1),
        error: null,
      })),
    }
    requests.push(request)
    return request
  })
})
it('loads public questions/options only, keeps stable option order and strips grading fields', async () => {
  getStudyQuestions.mockResolvedValue([
    question(1, { correct_option_id: 'private', explanation: 'private' }),
  ])
  const result = await getQuizTopicPreview(profile, topic.id, 'math')
  expect(result.questions[0].options.map((option) => option.option_order)).toEqual([1, 2, 3, 4])
  expect(result.questions[0].question_text).toContain('× 1 − 1\n● ●')
  expect(result.questions[0]).not.toHaveProperty('correct_option_id')
  expect(result.questions[0]).not.toHaveProperty('explanation')
  expect(getStudyQuestions).toHaveBeenCalledWith(topic.id, 'quiz')
})
it.each([1, 3, 5, 8])(
  'uses up to five real questions without duplicating a %s-question bank',
  async (count) => {
    getStudyQuestions.mockResolvedValue(
      Array.from({ length: count }, (_, index) => question(index)),
    )
    const result = await getQuizTopicPreview(profile, topic.id, 'math')
    expect(result.questions).toHaveLength(Math.min(5, count))
    expect(new Set(result.questions.map((item) => item.id)).size).toBe(result.questions.length)
  },
)
it.each(['wrong-topic', 'wrong-subject'])(
  'rejects %s direct links before requesting questions',
  async (value) => {
    await expect(
      getQuizTopicPreview(
        profile,
        value === 'wrong-topic' ? value : topic.id,
        value === 'wrong-subject' ? value : 'math',
      ),
    ).rejects.toThrow('school level')
    expect(getStudyQuestions).not.toHaveBeenCalled()
  },
)
it('does not present empty or malformed questions as playable content', async () => {
  const invalid = [
    question(1, { options: [] }),
    question(2, { question_text: '' }),
    question(3, { question_purpose: 'boss_battle' }),
    question(4, { question_type: 'free_text' }),
  ]
  invalid.push(question(5, { options: [question(5).options[0], question(5).options[0]] }))
  expect(usablePreviewQuestions(invalid)).toEqual([])
  getStudyQuestions.mockResolvedValue(invalid)
  await expect(getQuizTopicPreview(profile, topic.id)).rejects.toThrow('no preview questions')
})
it('only shows subjects/topics with usable quiz questions and never queries answer keys', async () => {
  const result = await getStudentQuizCatalogue(profile)
  expect(result.topics[0].quiz_question_count).toBe(2)
  expect(requests.map((request) => request.table)).toEqual(['questions', 'question_options'])
  expect(requests[0].eq).toHaveBeenCalledWith('question_purpose', 'quiz')
  expect(requests[0].in).toHaveBeenCalledWith('topic_id', [topic.id])
  expect(requests.every((request) => !request.select.mock.calls[0][0].includes('*'))).toBe(true)
  responses.question_options = []
  expect(await getStudentQuizCatalogue(profile)).toEqual({ subjects: [], topics: [] })
})
it('paginates public question/option rows instead of silently truncating availability', async () => {
  const questions = Array.from({ length: 501 }, (_, index) => question(index))
  responses.questions = questions
  responses.question_options = questions.flatMap((item) => item.options)
  const result = await getStudentQuizCatalogue(profile)
  expect(
    requests
      .filter((request) => request.table === 'questions')
      .some((request) =>
        request.range.mock.calls.some(([start, end]) => start === 500 && end === 999),
      ),
  ).toBe(true)
  expect(result.topics[0].quiz_question_count).toBe(501)
})
it('does not hide denied public question requests behind demo Science content', async () => {
  from.mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        in: () => ({
          order: () => ({
            range: async () => ({ data: null, error: new Error('permission denied') }),
          }),
        }),
      }),
    }),
  }))
  await expect(getStudentQuizCatalogue(profile)).rejects.toThrow('permission denied')
})
