import { getCurrentProfile } from './profileService'
import { getSupabase } from '../lib/supabase'
import {
  getStudyCatalogue,
  getSelectedStudyBuddy,
  studyErrorMessage,
} from './studyService'

function ready(data) {
  return {
    status: 'ready',
    data,
    message: '',
  }
}

function empty(data, message) {
  return {
    status: 'empty',
    data,
    message,
  }
}

function failed(error, label) {
  return {
    status: 'error',
    data: null,
    code: error?.code ?? null,
    message: studyErrorMessage(error, label),
  }
}

function result(data, label) {
  return data.length
    ? ready(data)
    : empty(data, `No ${label} yet.`)
}

export async function getDashboardQuizAttempts(userId) {
  try {
    const { data, error } = await getSupabase()
      .from('quiz_attempts')
      .select('id, user_id, topic_id, attempt_type, score, total_questions, xp_change, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
    if (error) throw error
    return result(data ?? [], 'quiz attempts')
  } catch (error) {
    return failed(error, 'Quiz history')
  }
}

export async function getDashboardStudySessions(userId) {
  try {
    const { data, error } = await getSupabase()
      .from('study_sessions')
      .select('id, user_id, topic_id, status, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false, nullsFirst: false })
    if (error) throw error
    return result(data ?? [], 'study sessions')
  } catch (error) {
    return failed(error, 'Study session history')
  }
}

export async function getDashboardPomodoroBlocks(sessionIds) {
  if (!sessionIds.length) return empty([], 'No recorded study intervals yet.')

  try {
    const { data, error } = await getSupabase()
      .from('pomodoro_blocks')
      .select('id, session_id, focus_completed_at, focus_seconds, break_completed_at, break_seconds, xp_awarded_at, xp_earned')
      .in('session_id', sessionIds)
    if (error) throw error
    return result(data ?? [], 'recorded study intervals')
  } catch (error) {
    return failed(error, 'Recorded study time and study XP')
  }
}

async function loadCatalogue(profile) {
  if (!profile.school_level_id) {
    return {
      status: 'needs_setup',
      data: null,
      message: 'Set your school level in Account Settings to see your topics.',
    }
  }

  try {
    const catalogue = await getStudyCatalogue(profile.school_level_id)

    if (!catalogue.topics.length) {
      return empty(
        catalogue,
        'No topics are available for your school level.',
      )
    }

    return ready(catalogue)
  } catch (error) {
    return failed(error, 'Subjects and topics')
  }
}

async function loadBuddy(profile) {
  try {
    // The ID comes only from getCurrentProfile(), which verifies
    // the authenticated user. It is not accepted from the UI.
    const buddy = await getSelectedStudyBuddy(profile.id)

    if (!buddy) {
      return empty(null, 'You have not selected a Pokémon buddy.')
    }

    // Preserve the existing service response.
    // pokemon.id is a database UUID, not a PokéAPI ID.
    return ready(buddy)
  } catch (error) {
    return failed(error, 'Your selected Pokémon')
  }
}

/**
 * Loads dashboard data for the currently authenticated user.
 *
 * No arbitrary user ID argument.
 * No sample-data fallback.
 * No grading, session completion, XP awards or reward writes.
 *
 * Profile/authentication failures reject the request.
 * Other sections return their own ready/empty/error state.
 */
export async function getDashboardData() {
  const profile = await getCurrentProfile()

  if (!profile?.id) {
    throw new Error('Your authenticated profile could not be loaded.')
  }

  const [
    catalogue,
    buddy,
    quizAttempts,
    studySessions,
  ] = await Promise.all([
    loadCatalogue(profile),
    loadBuddy(profile),
    getDashboardQuizAttempts(profile.id),
    getDashboardStudySessions(profile.id),
  ])
  const sessionIds = studySessions.data?.map((session) => session.id) ?? []
  const pomodoroBlocks = await getDashboardPomodoroBlocks(sessionIds)

  return {
    profile,
    catalogue,
    buddy,
    quizAttempts,
    studySessions,
    pomodoroBlocks,
  }
}
