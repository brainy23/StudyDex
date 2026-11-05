import { activityChanged, checkedRpc } from './backendClient'
import { planPokemonXp } from './pokemonProgression'

export const startQuiz = (topicId, requestId, userId) => checkedRpc('start_learning_quiz', {
  p_topic_id: topicId, p_request_id: requestId,
}, userId)
export async function submitQuiz(runId, answers, userId) {
  const input = { p_run_id: runId, p_answers: { ...answers } }
  // Grade without awarding XP. Plan from the saved buddy state, exactly as the
  // boss reward does, before sending the proposed final state to the database.
  const graded = await checkedRpc('prepare_learning_quiz_progression', input, userId)
  if (graded.duplicate) return graded
  const originalPokemon = graded.originalPokemon
  const plan = await planPokemonXp(originalPokemon, { delta: graded.delta })
  const progression = {
    pokemonRecordId: originalPokemon.ownedId,
    pokemonName: plan.result.name,
    rewardType: 'quiz', delta: graded.delta, appliedDelta: plan.appliedDelta,
    xp: plan.result.xp, level: plan.result.level,
    originalPokemon, pokemon: plan.result,
    evolutions: plan.evolutions, evolved: plan.evolved, devolved: plan.devolved,
    reachedMaxEvolution: plan.reachedMaxEvolution, overflowXP: plan.overflowXP,
  }
  const result = await checkedRpc('submit_learning_quiz_progression', {
    ...input, p_expected: graded.expected, p_progression: progression,
  }, userId)
  activityChanged(result)
  return result
}
