/* global Deno */
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { createDeleteAccountHandler } from './handler.js'

// These are Supabase-hosted server secrets. They never enter the Vue bundle.
const url = Deno.env.get('SUPABASE_URL')
const serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !serverKey) throw new Error('Account deletion configuration is unavailable.')
const admin = createClient(url, serverKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

Deno.serve(
  createDeleteAccountHandler({
    issuer: `${url.replace(/\/+$/, '')}/auth/v1`,
    getUser: (token) => admin.auth.getUser(token),
    revokeSessions: (token) => admin.auth.admin.signOut(token, 'global'),
    deleteUser: (userId, softDelete) => admin.auth.admin.deleteUser(userId, softDelete),
  }),
)
