import { beforeEach, expect, it, vi } from 'vitest'
import {
  getDashboardPomodoroBlocks,
  getDashboardQuizAttempts,
  getDashboardStudySessions,
} from '../dashboardService'

const { from } = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ getSupabase: () => ({ from }) }))

const requests = []
let responses

beforeEach(() => {
  requests.length = 0
  from.mockReset()
  responses = {}
  from.mockImplementation((table) => {
    const query = Object.assign(Promise.resolve(responses[table] ?? { data: [], error: null }), {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
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
