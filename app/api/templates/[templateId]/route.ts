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

// GET /api/templates/[templateId] - Get single template details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId } = await params

    const { data: template, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Get related clauses that can be used with this template type
    const { data: relatedClauses } = await supabase
      .from('document_clauses')
      .select('*')
      .eq('is_active', true)
      .contains('compatible_template_types', [template.template_type])
      .order('usage_count', { ascending: false })
      .limit(20)

    return NextResponse.json({
      template,
      related_clauses: relatedClauses || []
    })
  } catch (error) {
    console.error('Template GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/templates/[templateId] - Update template (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
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

    const { templateId } = await params
    const body = await request.json()

    const updateData: Record<string, unknown> = {}

    // Only allow updating specific fields
    const allowedFields = [
      'template_name', 'description', 'field_mappings', 'required_data_fields',
      'conditional_sections', 'default_values', 'is_active', 'instructions',
      'estimated_prep_time', 'template_file_path', 'preview_image_path'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: template, error } = await supabase
      .from('document_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Template PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
