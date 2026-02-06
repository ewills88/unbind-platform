import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { client: null, user: null }
  }

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

// GET /api/states - List all state requirements
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const stateCode = searchParams.get('state_code')

    let query = supabase
      .from('state_requirements')
      .select('*')
      .eq('is_active', true)
      .order('state_name', { ascending: true })

    if (stateCode) {
      query = query.eq('state_code', stateCode)
    }

    const { data: states, error } = await query

    if (error) {
      console.error('Error fetching state requirements:', error)
      return NextResponse.json({ error: 'Failed to fetch state requirements' }, { status: 500 })
    }

    return NextResponse.json({ states })
  } catch (error) {
    console.error('States GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
