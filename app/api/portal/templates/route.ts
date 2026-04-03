import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/portal/templates — list message templates
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Get user's firm
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('message_templates')
      .select('*')
      .eq('is_active', true)

    // System templates (firm_id IS NULL) + firm-specific templates
    if (profile?.current_firm_id) {
      query = query.or(`firm_id.is.null,firm_id.eq.${profile.current_firm_id}`)
    } else {
      query = query.is('firm_id', null)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query.order('category').order('title')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Portal templates GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/portal/templates — create a message template (attorneys only)
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify attorney/admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['attorney', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Only attorneys can create templates' }, { status: 403 })
    }

    const body = await request.json()

    if (!body.title || !body.content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        firm_id: profile.current_firm_id,
        category: body.category || 'general',
        title: body.title,
        content: body.content,
        variables: body.variables || [],
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Portal templates POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
