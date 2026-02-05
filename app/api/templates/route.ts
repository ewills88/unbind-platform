import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { DocumentTemplate, DocumentTemplateType, DocumentCategory } from '@/types/document-templates'

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

// GET /api/templates - List available document templates
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const templateType = searchParams.get('template_type') as DocumentTemplateType | null
    const stateCode = searchParams.get('state_code')
    const category = searchParams.get('category') as DocumentCategory | null
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('document_templates')
      .select('*')
      .eq('is_active', true)
      .order('template_name', { ascending: true })

    // Apply filters
    if (templateType) {
      query = query.eq('template_type', templateType)
    }

    if (stateCode) {
      // Include both state-specific and generic templates
      query = query.or(`state_code.eq.${stateCode},state_code.is.null`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`template_name.ilike.%${search}%,description.ilike.%${search}%,form_number.ilike.%${search}%`)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    // Group templates by type for easier UI consumption
    const groupedByType: Record<string, DocumentTemplate[]> = {}
    const groupedByState: Record<string, DocumentTemplate[]> = {}

    for (const template of templates as DocumentTemplate[]) {
      // Group by type
      if (!groupedByType[template.template_type]) {
        groupedByType[template.template_type] = []
      }
      groupedByType[template.template_type].push(template)

      // Group by state
      const state = template.state_code || 'generic'
      if (!groupedByState[state]) {
        groupedByState[state] = []
      }
      groupedByState[state].push(template)
    }

    return NextResponse.json({
      templates,
      grouped_by_type: groupedByType,
      grouped_by_state: groupedByState,
      total: templates.length
    })
  } catch (error) {
    console.error('Templates GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/templates - Create new template (admin only)
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()

    const templateData = {
      template_name: body.template_name,
      template_code: body.template_code,
      template_type: body.template_type,
      description: body.description,
      state_code: body.state_code,
      county_code: body.county_code,
      court_type: body.court_type,
      form_number: body.form_number,
      template_file_path: body.template_file_path,
      preview_image_path: body.preview_image_path,
      field_mappings: body.field_mappings || {},
      required_data_fields: body.required_data_fields || [],
      conditional_sections: body.conditional_sections || {},
      default_values: body.default_values || {},
      category: body.category,
      estimated_prep_time: body.estimated_prep_time,
      instructions: body.instructions,
      created_by: user.id
    }

    const { data: template, error } = await supabase
      .from('document_templates')
      .insert(templateData)
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Templates POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
