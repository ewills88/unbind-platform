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

// GET /api/cases/[caseId]/assignments - Get case assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    const { caseId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify case access - user must be attorney_id, client_id, or firm member
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id, firm_id')
      .eq('id', caseId)
      .single()

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const hasDirectAccess =
      caseData.attorney_id === user.id || caseData.client_id === user.id

    if (!hasDirectAccess && caseData.firm_id) {
      const { data: membership } = await supabase
        .from('firm_members')
        .select('id')
        .eq('firm_id', caseData.firm_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    } else if (!hasDirectAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get assignments with profiles
    const { data: assignments, error: assignError } = await supabase
      .from('case_assignments')
      .select(`
        *,
        profile:profiles!case_assignments_user_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('case_id', caseId)
      .order('role', { ascending: true })

    if (assignError) {
      console.error('Error fetching assignments:', assignError)
      // Fallback without join
      const { data: assignmentsOnly } = await supabase
        .from('case_assignments')
        .select('*')
        .eq('case_id', caseId)
        .order('role', { ascending: true })

      return NextResponse.json({ assignments: assignmentsOnly || [] })
    }

    return NextResponse.json({ assignments: assignments || [] })
  } catch (error) {
    console.error('Case assignments GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
