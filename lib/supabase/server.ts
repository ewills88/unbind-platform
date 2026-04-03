import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Creates an authenticated Supabase client for API route handlers.
 * Checks Bearer token from Authorization header first (sent by authFetch),
 * then falls back to cookie-based auth.
 */
export async function getAuthenticatedClient(request?: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { client: null, user: null }
  }

  // Try Authorization header first (from client-side session via authFetch)
  if (request) {
    const authHeader = request.headers.get('authorization')
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (accessToken) {
      const supabase = createClient(url, key, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      })
      const { data: { user }, error } = await supabase.auth.getUser(accessToken)
      if (!error && user) {
        return { client: supabase, user }
      }
    }
  }

  // Fallback to cookie-based auth
  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: {
      headers: {
        cookie: cookieStore.toString()
      }
    }
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { client: null, user: null }
  }

  return { client: supabase, user }
}
