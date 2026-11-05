import { getSupabase } from '../lib/supabase'
import { filterStudentCatalogue } from '../utils/studyCatalogue'

// Explicit field lists deliberately exclude question_answers and grading data.
const TOPIC_FIELDS = 'id, level_id, subject_id, name, description, topic_order'
const QUESTION_FIELDS =
  'id, topic_id, concept_id, question_text, question_type, difficulty, question_purpose'

async function rows(query) {
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export function studyErrorMessage(error, label = 'This content') {
  if (
    error?.code === '42501' ||
    [401, 403].includes(error?.status) ||
    /permission denied|row.level security|not authorized/i.test(error?.message || '')
  ) {
    return `${label} could not be loaded because your account does not have permission. Please contact the StudyDex team.`
  }
  return `${label} could not be loaded. ${error?.message || 'Please check your connection and try again.'}`
}

export async function getStudyCatalogue(levelId) {
  if (!levelId) throw new Error('Set your school level in Account Settings first.')
  const client = getSupabase()
  const [subjects, topics] = await Promise.all([
    rows(client.from('subjects').select('id, name').order('name')),
    rows(
      client
        .from('topics')
        .select(TOPIC_FIELDS)
        .eq('level_id', levelId)
        .order('topic_order', { nullsFirst: false })
        .order('name'),
    ),
  ])
  return { subjects, topics }
}

export async function getStudentStudyCatalogue(profile) {
  return filterStudentCatalogue(await getStudyCatalogue(profile?.school_level_id), profile)
}

export async function getStudyQuestions(topicId, purpose) {
  if (!['quick_check', 'quiz', 'boss_battle'].includes(purpose)) {
    throw new Error('Unknown question purpose.')
  }
  const client = getSupabase()
  const questions = await rows(
    client
      .from('questions')
      .select(QUESTION_FIELDS)
      .eq('topic_id', topicId)
      .eq('question_purpose', purpose)
      .order('created_at')
      .order('id'),
  )
  if (!questions.length) return []
  const options = await rows(
    client
      .from('question_options')
      .select('id, question_id, option_text, option_order')
      .in(
        'question_id',
        questions.map((question) => question.id),
      )
      .order('option_order'),
  )
  return questions.map((question) => ({
    ...question,
    options: options.filter((option) => option.question_id === question.id),
  }))
}

export async function getTopicLesson(topicId) {
  const client = getSupabase()
  const sections = ['goals', 'concepts', 'questions']
  const results = await Promise.allSettled([
    rows(
      client
        .from('topic_learning_goals')
        .select('id, topic_id, goal_text, goal_order')
        .eq('topic_id', topicId)
        .order('goal_order'),
    ),
    rows(
      client
        .from('topic_concepts')
        .select('id, topic_id, title, explanation_text, example_text, concept_order')
        .eq('topic_id', topicId)
        .order('concept_order'),
    ),
    getStudyQuestions(topicId, 'quick_check'),
  ])
  // A denied question-options request must not hide an otherwise readable lesson.
  const lesson = { goals: [], concepts: [], questions: [], errors: {} }
  results.forEach((result, index) => {
    const section = sections[index]
    if (result.status === 'fulfilled') lesson[section] = result.value
    else lesson.errors[section] = result.reason
  })
  return lesson
}

export async function getTopicFlashcards(topicId) {
  return rows(
    getSupabase()
      .from('flashcards')
      .select(
        'id, topic_id, concept_id, front_text, back_text, front_image_path, back_image_path, card_order',
      )
      .eq('topic_id', topicId)
      .order('card_order'),
  )
}

export async function getSelectedStudyBuddy(userId) {
  const { data, error } = await getSupabase()
    .from('user_pokemon')
    .select('id, xp, level, pokemon:pokemon!user_pokemon_pokemon_id_fkey(id, pokeapi_id, name, sprite_url)')
    .eq('user_id', userId)
    .eq('is_selected', true)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getOwnedStudyPokemon(userId) {
  if (!userId) throw new Error('Please log in to view your Pokédex.')
  const { data, error } = await getSupabase()
    .from('user_pokemon')
    .select('id, user_id, pokemon_id, xp, level, is_selected, pokemon:pokemon!user_pokemon_pokemon_id_fkey(id, pokeapi_id, name, sprite_url)')
    .eq('user_id', userId)
  if (error) throw error
  return data || []
}

export function resolveStudyImage(path) {
  if (!path) return ''
  // Public site paths and full HTTPS URLs work without assuming a storage bucket.
  if (/^\/(?!\/)/.test(path) || /^https:\/\//i.test(path)) return path
  const bucket = import.meta.env.VITE_STUDY_ASSET_BUCKET
  if (!bucket) return ''
  return getSupabase().storage.from(bucket).getPublicUrl(path).data.publicUrl
}
