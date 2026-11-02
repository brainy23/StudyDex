// Real Vue components, services and supabase-js; HTTP/auth responses are fixtures, not live RLS.
import { createClient } from '@supabase/supabase-js'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import StudyView from '../studyView.vue'
import { useTimer } from '../../components/timer/useTimer'
import { revisionCards, studentProfile, studyCatalogue, studyLesson } from '../../test/studyFixtures'

const { getSupabase } = vi.hoisted(() => ({ getSupabase: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ getSupabase }))

let wrapper
let requests
let flashcardResponse
beforeEach(() => {
  requests = []
  flashcardResponse = { status: 200, body: structuredClone(revisionCards) }
  localStorage.clear()
  useTimer().endSession()
  const client = createClient('https://studydex-fixture.invalid', 'fixture-publishable-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, options) => {
        const url = new URL(input)
        const table = url.pathname.split('/').at(-1)
        requests.push({ table, url, method: options?.method || 'GET' })
        const tables = {
          profiles: studentProfile,
          subjects: studyCatalogue.subjects,
          topics: studyCatalogue.topics,
          topic_learning_goals: studyLesson.goals,
          topic_concepts: studyLesson.concepts,
          questions: [],
          user_pokemon: [],
        }
        const { body, status } = table === 'flashcards'
          ? flashcardResponse
          : { body: tables[table], status: table in tables ? 200 : 400 }
        return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
      },
    },
  })
  vi.spyOn(client.auth, 'getUser').mockResolvedValue({ data: { user: { id: studentProfile.id } }, error: null })
  getSupabase.mockReturnValue(client)
})

afterEach(() => {
  useTimer().endSession()
  wrapper?.unmount()
  vi.restoreAllMocks()
})

async function open() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/study-decks', name: 'study-decks', component: StudyView },
      { path: '/quiz', name: 'quiz', component: { template: '<div>Arena</div>' } },
    ],
  })
  await router.push({ name: 'study-decks', query: { mode: 'flashcards', topic_id: 'topic-1' } })
  await router.isReady()
  wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router], stubs: { ClockWeather: true } } })
  await flushPromises()
}

const button = (text) => wrapper.findAll('button').find((item) => item.text() === text)

it('uses the verified profile level in actual supabase-js requests and reviews all 15 HTTP records', async () => {
  await open()
  const profile = requests.find((request) => request.table === 'profiles')
  expect(profile.url.searchParams.get('id')).toBe(`eq.${studentProfile.id}`)
  expect(profile.url.searchParams.get('select')).toContain('school_level_id')
  const topics = requests.find((request) => request.table === 'topics')
  expect(topics.url.searchParams.get('level_id')).toBe(`eq.${studentProfile.school_level_id}`)
  const cards = requests.find((request) => request.table === 'flashcards')
  expect(cards.url.searchParams.get('topic_id')).toBe('eq.topic-1')
  expect(cards.url.searchParams.get('order')).toBe('card_order.asc')
  expect(cards.url.searchParams.get('select').split(',')).toEqual([
    'id', 'topic_id', 'concept_id', 'front_text', 'back_text',
    'front_image_path', 'back_image_path', 'card_order',
  ])
  for (const card of revisionCards) {
    expect(wrapper.get('.study-card-front .study-card-text').text()).toBe(card.front_text)
    expect(wrapper.find('.study-card-back').exists()).toBe(false)
    await wrapper.get('.study-flip-card').trigger('click')
    expect(wrapper.get('.study-card-back .study-card-text').text()).toBe(card.back_text)
    await button('Easy').trigger('click')
  }
  expect(wrapper.get('.study-completion').text()).toContain('15 unique cards remembered · 15 total review attempts')
  await button('Restart Deck').trigger('click')
  expect(wrapper.get('.study-review-progress').text()).toContain('0 / 15 remembered')
  expect(requests.filter((request) => request.table === 'flashcards')).toHaveLength(1)
  expect(requests.every((request) => request.method === 'GET')).toBe(true)
  expect(requests.some((request) => ['questions', 'question_options', 'question_answers'].includes(request.table))).toBe(false)
})

it('shows the API empty state with no educational fallback content', async () => {
  flashcardResponse.body = []
  await open()
  expect(wrapper.get('.study-flashcards').text()).toContain('There are no flashcards for this topic yet')
  expect(wrapper.find('.study-flip-card').exists()).toBe(false)
})

it('handles a real PostgREST error response and retries successfully without hiding the failure', async () => {
  flashcardResponse = { status: 403, body: { code: '42501', message: 'permission denied for table flashcards', details: null, hint: null } }
  await open()
  expect(wrapper.get('.study-flashcards [role="alert"]').text()).toContain('does not have permission')
  expect(wrapper.find('.study-flip-card').exists()).toBe(false)
  flashcardResponse = { status: 200, body: structuredClone(revisionCards) }
  await button('Try again').trigger('click')
  await flushPromises()
  expect(wrapper.find('.study-flashcards [role="alert"]').exists()).toBe(false)
  expect(wrapper.get('.study-review-progress').text()).toContain('0 / 15 remembered')
  expect(requests.filter((request) => request.table === 'flashcards')).toHaveLength(2)
})
