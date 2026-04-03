import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Authenticated fetch wrapper that adds the Supabase session token
 * as a Bearer Authorization header to API requests.
 *
 * Use this instead of raw fetch() for all /api/ calls.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()

  const headers = new Headers(options.headers)

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
