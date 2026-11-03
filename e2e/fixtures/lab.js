import { Buffer } from 'node:buffer'
import { studentProfile, revisionCards } from '../../src/test/studyFixtures'

// Synthetic educational text is restricted to this browser fixture.
export const topic = {
  id: 'water-topic',
  level_id: 'level-3',
  subject_id: 'science',
  topic_order: 1,
  name: 'Diversity of Living and Non-Living Things',
  description: 'Explore living things, what they need, and how we can group them.',
}
const titles = [
  'what living things need',
  'what living things do',
  'living or non-living',
  'groups of plants',
  'groups of animals',
  'fungi and bacteria',
  'classifying using evidence',
]
export const concepts = titles.map((title, index) => ({
  id: `fixture-concept-${index}`,
  topic_id: topic.id,
  title,
  concept_order: index + 1,
  explanation_text:
    index === 0
      ? 'Living things need air, water and food to stay alive.\nPlants take in water through their roots.'
      : `Fixture explanation for ${title}.\nExplore this idea with the worked example below.`,
  example_text:
    index === 0
      ? 'A potted plant is given enough water. Its leaves stay firm.\nWithout enough water over time, its leaves may become droopy.'
      : `A short fixture worked example for concept ${index + 1}.`,
}))
export const goals = [
  'Recognise what living things need to stay alive.',
  'Observe differences between living and non-living things.',
  'Group living things using their characteristics.',
].map((goal_text, index) => ({
  id: `fixture-goal-${index}`,
  topic_id: topic.id,
  goal_order: index + 1,
  goal_text,
}))
export const labUrl = '/study-decks?subject=science&topic_id=water-topic'
export const timerKey = `studydex:focus:v1:${studentProfile.id}`

export async function mockLab(page, { deferConcepts = false, buddyFailure = false, autoDismissWeather = true, questionBank = [], profile = studentProfile, catalogueSubjects = [{ id: 'science', name: 'Science' }], catalogueTopics = [topic], lessonGoals = goals, lessonConcepts = concepts, cards = revisionCards } = {}) {
  if (autoDismissWeather) await page.addLocatorHandler(page.getByRole('dialog', { name: 'Choose weather location' }), async dialog => {
    await dialog.getByRole('button', { name: 'Not Now', exact: true }).click()
  })
  const user = {
    id: studentProfile.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'fixture@example.invalid',
    app_metadata: {},
    user_metadata: {},
  }
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const exp = Math.floor(Date.now() / 1000) + 3600
  const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', exp })}.fixture-signature`
  const session = {
    access_token,
    refresh_token: 'fixture-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    user,
  }
  await page.addInitScript((savedSession) => {
    localStorage.setItem('sb-studydex-fixture-auth-token', JSON.stringify(savedSession))
  }, session)
  const requests = []
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  let releaseConcepts
  const conceptsReady = deferConcepts
    ? new Promise((resolve) => {
        releaseConcepts = resolve
      })
    : Promise.resolve()
  await page.route('https://studydex-fixture.invalid/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: user, headers })
    if (url.pathname === '/auth/v1/token') return route.fulfill({ json: session, headers })
    const table = url.pathname.split('/').at(-1)
    requests.push({ table, method: request.method(), query: Object.fromEntries(url.searchParams) })
    if (request.method() !== 'GET')
      return route.fulfill({
        status: 405,
        json: { message: 'Fixture does not allow writes.' },
        headers,
      })
    if (table === 'topic_concepts') await conceptsReady
    if (table === 'user_pokemon' && buddyFailure)
      return route.fulfill({
        status: 400,
        json: { message: 'Buddy temporarily unavailable.' },
        headers,
      })
    const tables = {
      profiles: profile,
      subjects: catalogueSubjects,
      topics: catalogueTopics,
      topic_learning_goals: lessonGoals,
      topic_concepts: lessonConcepts,
      flashcards: cards.map((card) => ({ ...card, topic_id: catalogueTopics[0]?.id })),
      user_pokemon: null,
      questions: questionBank.filter(question => `eq.${question.question_purpose}` === url.searchParams.get('question_purpose')),
      question_options: questionBank.flatMap(question => question.options || []),
    }
    return route.fulfill({ json: tables[table] ?? [], headers })
  })
  return { requests, errors, releaseConcepts }
}
