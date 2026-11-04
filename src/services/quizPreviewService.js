import { getSupabase } from '../lib/supabase'
import { getStudentStudyCatalogue, getStudyQuestions } from './studyService'

export const QUIZ_PREVIEW_SIZE = 5
const PAGE_SIZE = 500
const QUESTION_FIELDS = 'id, topic_id, question_text, question_type, difficulty, question_purpose'
const OPTION_FIELDS = 'id, question_id, option_text, option_order'

async function readPages(query) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query().range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const page = data || []
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

// Project only public display fields. No answer keys, explanations or local grading.
export function usablePreviewQuestions(questions) {
  return questions.flatMap((question) => {
    const options = [...(question.options || [])].sort(
      (a, b) => a.option_order - b.option_order || String(a.id).localeCompare(String(b.id)),
    )
    if (
      !question.id ||
      !question.topic_id ||
      !question.question_text?.trim() ||
      question.question_purpose !== 'quiz' ||
      !['mcq', 'true_false'].includes(question.question_type) ||
      options.length < 2 ||
      options.length > 4 ||
      options.some(
        (option) =>
          !option.id ||
          option.question_id !== question.id ||
          !option.option_text?.trim() ||
          !Number.isInteger(option.option_order) ||
          option.option_order < 1,
      ) ||
      new Set(options.map((option) => option.id)).size !== options.length ||
      new Set(options.map((option) => option.option_text.trim())).size !== options.length ||
      new Set(options.map((option) => option.option_order)).size !== options.length
    )
      return []
    return [
      {
        id: question.id,
        topic_id: question.topic_id,
        question_text: question.question_text,
        question_type: question.question_type,
        difficulty: question.difficulty,
        question_purpose: question.question_purpose,
        options: options.map(({ id, question_id, option_text, option_order }) => ({
          id,
          question_id,
          option_text,
          option_order,
        })),
      },
    ]
  })
}

export async function getStudentQuizCatalogue(profile) {
  const catalogue = await getStudentStudyCatalogue(profile)
  if (!catalogue.topics.length) return catalogue
  const client = getSupabase()
  const topicIds = catalogue.topics.map((topic) => topic.id)
  const questions = await readPages(() =>
    client
      .from('questions')
      .select(QUESTION_FIELDS)
      .eq('question_purpose', 'quiz')
      .in('topic_id', topicIds)
      .order('id'),
  )
  const options = []
  // Small batches also avoid oversized REST query strings; pagination avoids truncation.
  for (let from = 0; from < questions.length; from += 100) {
    options.push(
      ...(await readPages(() =>
        client
          .from('question_options')
          .select(OPTION_FIELDS)
          .in(
            'question_id',
            questions.slice(from, from + 100).map((question) => question.id),
          )
          .order('question_id')
          .order('option_order'),
      )),
    )
  }
  const byQuestion = new Map()
  for (const option of options) {
    if (!byQuestion.has(option.question_id)) byQuestion.set(option.question_id, [])
    byQuestion.get(option.question_id).push(option)
  }
  const usable = usablePreviewQuestions(
    questions.map((question) => ({
      ...question,
      options: byQuestion.get(question.id) || [],
    })),
  )
  const counts = new Map()
  for (const question of usable) {
    // Defense against unexpected/mock responses; RLS independently restricts real rows.
    if (topicIds.includes(question.topic_id)) {
      counts.set(question.topic_id, (counts.get(question.topic_id) || 0) + 1)
    }
  }
  const topics = catalogue.topics
    .filter((topic) => counts.has(topic.id))
    .map((topic) => ({ ...topic, quiz_question_count: counts.get(topic.id) }))
  const subjects = catalogue.subjects.filter((subject) =>
    topics.some((topic) => topic.subject_id === subject.id),
  )
  return { subjects, topics }
}

export async function getQuizTopicPreview(profile, topicId, subjectId) {
  const catalogue = await getStudentStudyCatalogue(profile)
  const topic = catalogue.topics.find(
    (item) => item.id === topicId && (!subjectId || item.subject_id === subjectId),
  )
  if (!topic) throw new Error('Choose a topic for your school level.')
  const questions = usablePreviewQuestions(await getStudyQuestions(topic.id, 'quiz'))
    .filter((question) => question.topic_id === topic.id)
    .slice(0, QUIZ_PREVIEW_SIZE)
  if (!questions.length)
    throw new Error('This topic has no preview questions yet. Choose another topic.')
  return {
    topic,
    subject: catalogue.subjects.find((item) => item.id === topic.subject_id),
    questions,
  }
}
