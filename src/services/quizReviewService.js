import { checkedRpc } from './backendClient'

// Reading a completed attempt never grades the quiz or awards XP again.
export function getQuizReview(attemptId, userId) {
  return checkedRpc('get_learning_quiz_review', { p_attempt_id: attemptId }, userId)
}
