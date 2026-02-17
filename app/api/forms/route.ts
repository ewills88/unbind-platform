import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

// GET /api/forms - List court forms
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const stateCode = searchParams.get('state_code')
    const category = searchParams.get('category')
    const filingType = searchParams.get('filing_type')
    const search = searchParams.get('search')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('court_forms')
      .select('*')
      .is('superseded_date', null)
      .order('form_number', { ascending: true })

    if (stateCode) {
      query = query.eq('state_code', stateCode)
    }
    if (category) {
      query = query.eq('form_category', category)
    }
    if (filingType) {
      query = query.contains('filing_types', [filingType])
    }
    if (search) {
      query = query.or(`form_number.ilike.%${search}%,form_name.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Forms GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
