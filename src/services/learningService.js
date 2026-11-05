import { getSupabase } from '../lib/supabase'
import { activityChanged, checkedRpc } from './backendClient'

export const getDailyProgress = userId => checkedRpc('get_daily_learning_progress', undefined, userId)
export async function studyAction({ sessionId, topicId, mode, action, blockId, userId }) {
  const result = await checkedRpc('study_session_action', {
    p_session_id: sessionId, p_topic_id: topicId, p_mode: mode, p_action: action, p_block_id: blockId || null,
  }, userId)
  const completedFocusBlock = action === 'complete_block' && result.block?.focus_completed_at
  if (result.xp || completedFocusBlock || ['complete', 'abandon'].includes(action)) activityChanged(result)
  return result
}
export async function getTopicCompletions(userId, flow = 'study') {
  const query = flow === 'quiz'
    ? getSupabase().from('quiz_attempts').select('topic_id, completed_at').eq('attempt_type', 'quiz')
    : getSupabase().from('topic_completions').select('topic_id, completed_at')
  const { data, error } = await query.eq('user_id', userId)
  if (error) throw error
  return data || []
}
export async function getTodos(userId) {
  const { data, error } = await getSupabase().from('todos').select('id,title,completed_at,created_at').eq('user_id', userId).order('created_at')
  if (error) throw error
  return (data || []).map(row => ({ id: row.id, title: row.title, completedAt: row.completed_at }))
}
export const saveTodo = (todo, userId, remove = false) => checkedRpc('save_learning_todo', {
  p_id: todo.id, p_title: todo.title, p_completed: !!todo.completedAt, p_delete: remove,
}, userId)
