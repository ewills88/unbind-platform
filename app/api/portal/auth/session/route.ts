import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

// GET /api/portal/auth/session — get current portal session info
export async function GET() {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get client's case with attorney info
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, client_name, status, attorney_id, firm_id')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let attorneyName: string | null = null
    let firmName: string | null = null

    if (caseData?.attorney_id) {
      const { data: attorney } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', caseData.attorney_id)
        .single()
      attorneyName = attorney?.full_name || null
    }

    if (caseData?.firm_id) {
      const { data: firm } = await supabase
        .from('firms')
        .select('name')
        .eq('id', caseData.firm_id)
        .single()
      firmName = firm?.name || null
    }

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
      },
      case_info: caseData ? {
        id: caseData.id,
        client_name: caseData.client_name,
        status: caseData.status,
        attorney_id: caseData.attorney_id,
        attorney_name: attorneyName,
        firm_name: firmName,
      } : null,
    })
  } catch (error) {
    console.error('Portal session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/portal/auth/session — logout / end session
export async function DELETE() {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServiceClient()

    // Deactivate all active sessions for this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from('client_sessions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Sign out of Supabase
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Portal logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
