import { NextRequest, NextResponse } from 'next/server'
import { CreateTemplateRequest } from '@/types/collaboration'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/firms/templates - List firm templates
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a firm member' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('type')
    const stateFilter = searchParams.get('state')
    const search = searchParams.get('search')

    let query = supabase
      .from('firm_templates')
      .select(`
        *,
        creator:profiles!firm_templates_created_by_fkey(id, full_name)
      `)
      .eq('firm_id', profile.current_firm_id)
      .order('usage_count', { ascending: false })

    if (typeFilter && typeFilter !== 'all') {
      query = query.eq('template_type', typeFilter)
    }
    if (stateFilter && stateFilter !== 'all') {
      query = query.eq('state_code', stateFilter)
    }
    if (search) {
      query = query.ilike('template_name', `%${search}%`)
    }

    const { data: templates, error: templatesError } = await query

    if (templatesError) {
      console.error('Error fetching templates:', templatesError)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    console.error('Templates GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/firms/templates - Create a template
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a firm member' }, { status: 400 })
    }

    const body: CreateTemplateRequest = await request.json()

    if (!body.template_name?.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 })
    }

    const { data: template, error: insertError } = await supabase
      .from('firm_templates')
      .insert({
        firm_id: profile.current_firm_id,
        template_name: body.template_name.trim(),
        template_type: body.template_type,
        content: body.content || null,
        state_code: body.state_code || null,
        created_by: user.id,
        is_firm_wide: body.is_firm_wide ?? true,
        is_default: body.is_default ?? false,
        category: body.category || null,
        description: body.description || null,
        tags: body.tags || [],
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating template:', insertError)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Templates POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
