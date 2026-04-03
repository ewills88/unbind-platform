import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/firms/templates/[templateId] - Get single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    const { templateId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: template } = await supabase
      .from('firm_templates')
      .select(`
        *,
        creator:profiles!firm_templates_created_by_fkey(id, full_name)
      `)
      .eq('id', templateId)
      .single()

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Increment usage count
    await supabase
      .from('firm_templates')
      .update({
        usage_count: template.usage_count + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', templateId)

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Template GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/firms/templates/[templateId] - Update template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    const { templateId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.template_name) updates.template_name = body.template_name.trim()
    if (body.template_type) updates.template_type = body.template_type
    if (body.content !== undefined) updates.content = body.content
    if (body.state_code !== undefined) updates.state_code = body.state_code
    if (typeof body.is_firm_wide === 'boolean') updates.is_firm_wide = body.is_firm_wide
    if (typeof body.is_default === 'boolean') updates.is_default = body.is_default
    if (body.category !== undefined) updates.category = body.category
    if (body.description !== undefined) updates.description = body.description
    if (body.tags) updates.tags = body.tags

    // Bump version if content changed
    if (body.content !== undefined) {
      const { data: current } = await supabase
        .from('firm_templates')
        .select('version')
        .eq('id', templateId)
        .single()
      if (current) updates.version = current.version + 1
    }

    const { data: template, error: updateError } = await supabase
      .from('firm_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating template:', updateError)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Template PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/firms/templates/[templateId] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    const { templateId } = await params

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error: deleteError } = await supabase
      .from('firm_templates')
      .delete()
      .eq('id', templateId)

    if (deleteError) {
      console.error('Error deleting template:', deleteError)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Template DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
