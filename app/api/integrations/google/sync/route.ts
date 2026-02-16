import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { performInitialSync } from '@/lib/calendar/bulkSync'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { client: null, user: null }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: { headers: { cookie: cookieStore.toString() } }
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { client: null, user: null }
  return { client: supabase, user }
}

// POST - Trigger manual calendar sync
export async function POST() {
  try {
    const { user } = await getAuthenticatedClient()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await performInitialSync(user.id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Google sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
