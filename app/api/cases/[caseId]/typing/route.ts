import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Create authenticated Supabase client
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

interface RouteParams {
  params: Promise<{ caseId: string }>
}

/**
 * GET /api/cases/[caseId]/typing
 * Get current typing indicators for a case
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    if (!caseId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Case ID is required' },
        { status: 400 }
      )
    }

    // Get typing indicators (exclude own, only recent)
    const { data: typing, error: typingError } = await supabase
      .from('typing_indicators')
      .select(`
        case_id,
        user_id,
        started_at,
        user:user_id(full_name)
      `)
      .eq('case_id', caseId)
      .neq('user_id', user.id)
      .gte('started_at', new Date(Date.now() - 5000).toISOString()) // Only last 5 seconds

    if (typingError) {
      console.error('Error fetching typing indicators:', typingError)
      return NextResponse.json({ typing: [] })
    }

    return NextResponse.json({
      typing: typing || []
    })

  } catch (error) {
    console.error('Typing indicator API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/cases/[caseId]/typing
 * Update typing indicator (call every 2-3 seconds while typing)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    if (!caseId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Case ID is required' },
        { status: 400 }
      )
    }

    // Upsert typing indicator
    const { error: upsertError } = await supabase
      .from('typing_indicators')
      .upsert({
        case_id: caseId,
        user_id: user.id,
        started_at: new Date().toISOString()
      }, {
        onConflict: 'case_id,user_id'
      })

    if (upsertError) {
      console.error('Error updating typing indicator:', upsertError)
      return NextResponse.json(
        { error: 'Failed to update typing status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Typing indicator API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/cases/[caseId]/typing
 * Clear typing indicator (when user stops typing or sends message)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    if (!caseId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Case ID is required' },
        { status: 400 }
      )
    }

    // Delete typing indicator
    await supabase
      .from('typing_indicators')
      .delete()
      .eq('case_id', caseId)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Typing indicator API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
