import { beforeEach, expect, it, vi } from 'vitest'
import {
  getDashboardData,
  getDashboardPomodoroBlocks,
  getDashboardQuizAttempts,
  getDashboardStudySessions,
} from '../dashboardService'
import { getCurrentProfile } from '../profileService'

vi.mock('../profileService', () => ({ getCurrentProfile: vi.fn() }))

const { from } = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ from }) }))

const requests = []
let responses

beforeEach(() => {
  requests.length = 0
  from.mockReset()
  responses = {}
  getCurrentProfile.mockReset()
  getCurrentProfile.mockResolvedValue({ id: 'verified-user', school_level_id: 'level-3',
    school_level: { level_number: 3, name: 'Primary 3' } })
  from.mockImplementation((table) => {
    const query = Object.assign(Promise.resolve(responses[table] ?? { data: [], error: null }), {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
    })
    requests.push({ table, query })
    return query
  })
})

it('loads only the authenticated user’s quiz attempts', async () => {
  const attempt = { id: 'attempt-1', user_id: 'user-1' }
  responses.quiz_attempts = { data: [attempt], error: null }

  const result = await getDashboardQuizAttempts('user-1')

  expect(result).toMatchObject({ status: 'ready', data: [attempt] })
  const { query } = requests[0]
  expect(requests[0].table).toBe('quiz_attempts')
  expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')
  expect(query.select).toHaveBeenCalledWith(
    'id, user_id, topic_id, attempt_type, score, total_questions, xp_change, completed_at',
  )
})

it('loads only the authenticated user’s study sessions', async () => {
  responses.study_sessions = { data: [{ id: 'session-1' }], error: null }

  const result = await getDashboardStudySessions('user-1')

  expect(result.status).toBe('ready')
  expect(requests[0].table).toBe('study_sessions')
  expect(requests[0].query.eq).toHaveBeenCalledWith('user_id', 'user-1')
})

it('loads Pomodoro blocks only for the user’s sessions and skips an empty session list', async () => {
  expect(await getDashboardPomodoroBlocks([])).toMatchObject({ status: 'empty', data: [] })
  expect(from).not.toHaveBeenCalled()

  responses.pomodoro_blocks = { data: [{ id: 'block-1', session_id: 'session-1' }], error: null }
  const result = await getDashboardPomodoroBlocks(['session-1'])

  expect(result.status).toBe('ready')
  expect(requests[0].table).toBe('pomodoro_blocks')
  expect(requests[0].query.in).toHaveBeenCalledWith('session_id', ['session-1'])
  expect(requests[0].query.select.mock.calls[0][0]).not.toContain('*')
})

it('reports query errors without returning a blocked status', async () => {
  responses.quiz_attempts = {
    data: null,
    error: { code: '42501', message: 'permission denied' },
  }

  const result = await getDashboardQuizAttempts('user-1')

  expect(result.status).toBe('error')
  expect(result.status).not.toBe('blocked')
})

it('fetches Supabase subjects and limits dashboard options to the student curriculum and available level topics', async () => {
  responses.subjects = { data: [
    { id: 'english', name: 'English' }, { id: 'math', name: 'Mathematics' },
    { id: 'science', name: 'Science' },
  ], error: null }
  responses.topics = { data: [
    { id: 'math-3', subject_id: 'math', level_id: 'level-3' },
    { id: 'science-4', subject_id: 'science', level_id: 'level-4' },
    { id: 'english-3', subject_id: 'english', level_id: 'level-3' },
  ], error: null }
  const dashboard = await getDashboardData()
  expect(dashboard.catalogue).toMatchObject({ status: 'ready', data: {
    subjects: [{ id: 'math', name: 'Mathematics' }],
    topics: [{ id: 'math-3', subject_id: 'math', level_id: 'level-3' }],
  } })
  const subjects = requests.find(request => request.table === 'subjects').query
  expect(subjects.select).toHaveBeenCalledWith('id, name')
  expect(subjects.order).toHaveBeenCalledWith('name')
  expect(requests.find(request => request.table === 'topics').query.eq)
    .toHaveBeenCalledWith('level_id', 'level-3')
  expect(requests.find(request => request.table === 'quiz_attempts').query.eq)
    .toHaveBeenCalledWith('user_id', 'verified-user')
})

it('includes both Math and Science when Supabase has topics for the student’s level', async () => {
  responses.subjects = { data: [{ id: 'math', name: 'Mathematics' }, { id: 'science', name: 'Science' }], error: null }
  responses.topics = { data: [
    { id: 'math-3', subject_id: 'math', level_id: 'level-3' },
    { id: 'science-3', subject_id: 'science', level_id: 'level-3' },
  ], error: null }
  const dashboard = await getDashboardData()
  expect(dashboard.catalogue.data.subjects.map(subject => subject.id)).toEqual(['math', 'science'])
})

it('shows subject permission failures instead of substituting sample data', async () => {
  responses.subjects = { data: null, error: { code: '42501', message: 'permission denied' } }
  const dashboard = await getDashboardData()
  expect(dashboard.catalogue).toMatchObject({ status: 'error', data: null, code: '42501' })
  expect(dashboard.catalogue.message).toContain('permission')
})

it('handles an empty catalogue and missing school level without inventing subjects', async () => {
  expect((await getDashboardData()).catalogue).toMatchObject({ status: 'empty', data: { subjects: [], topics: [] } })
  requests.length = 0
  getCurrentProfile.mockResolvedValueOnce({ id: 'verified-user', school_level_id: null })
  expect((await getDashboardData()).catalogue.status).toBe('needs_setup')
  expect(requests.some(request => ['subjects', 'topics'].includes(request.table))).toBe(false)
})
