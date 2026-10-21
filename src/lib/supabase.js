import { createClient } from '@supabase/supabase-js'

let client

export function getSupabase() {
  console.log('Supabase URL exists:', !!import.meta.env.VITE_SUPABASE_URL)
  console.log('Supabase key exists:', !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error('Registration is unavailable. Please contact the StudyDex team.')
  }
  client = createClient(url, key)
  return client
}
