import { activityChanged, checkedRpc } from './backendClient'

export const startQuiz = (topicId, requestId, userId) => checkedRpc('start_learning_quiz', {
  p_topic_id: topicId, p_request_id: requestId,
}, userId)
export async function submitQuiz(runId, answers, userId) {
  const result = await checkedRpc('submit_learning_quiz', { p_run_id: runId, p_answers: answers }, userId)
  activityChanged(result)
  return result
}
