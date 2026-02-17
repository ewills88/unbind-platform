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

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/settlement-documents/[id] - Get document with signatures, comments, versions
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: doc, error } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Fetch sub-data in parallel
    const [sigRes, commentRes, versionRes] = await Promise.all([
      supabase
        .from('document_signatures')
        .select('*')
        .eq('document_id', id)
        .order('sign_order'),
      supabase
        .from('document_review_comments')
        .select('*')
        .eq('document_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('settlement_document_versions')
        .select('*')
        .eq('document_id', id)
        .order('version_number', { ascending: false }),
    ])

    return NextResponse.json({
      data: {
        ...doc,
        signatures: sigRes.data || [],
        comments: commentRes.data || [],
        versions: versionRes.data || [],
      },
    })
  } catch (error) {
    console.error('Settlement document GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/settlement-documents/[id] - Update status, content, or workflow
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Handle workflow actions
    if (body._action === 'submit_review') {
      const { data, error } = await supabase
        .from('generated_documents')
        .update({
          status: 'in_review',
          submitted_for_review_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    if (body._action === 'approve') {
      const { data, error } = await supabase
        .from('generated_documents')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          review_notes: body.notes || null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    if (body._action === 'reject') {
      const { data, error } = await supabase
        .from('generated_documents')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: body.notes || 'Rejected',
        })
        .eq('id', id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    if (body._action === 'file') {
      const { data, error } = await supabase
        .from('generated_documents')
        .update({
          status: 'filed',
          filed_date: body.filed_date || new Date().toISOString().split('T')[0],
          filing_confirmation_number: body.confirmation_number || null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    if (body._action === 'revert_draft') {
      const { data, error } = await supabase
        .from('generated_documents')
        .update({ status: 'draft' })
        .eq('id', id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    // Handle section content update (creates new version)
    if (body._action === 'update_sections') {
      // Get current doc
      const { data: current } = await supabase
        .from('generated_documents')
        .select('version, custom_content')
        .eq('id', id)
        .single()

      if (!current) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      const newVersion = (current.version || 1) + 1
      const updatedContent = {
        ...(current.custom_content || {}),
        rendered_sections: body.rendered_sections,
        section_overrides: body.section_overrides || {},
      }

      // Update document
      const { data, error } = await supabase
        .from('generated_documents')
        .update({
          version: newVersion,
          custom_content: updatedContent,
          status: 'draft', // Reset to draft on edit
        })
        .eq('id', id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Create version record
      await supabase.from('settlement_document_versions').insert({
        document_id: id,
        version_number: newVersion,
        sections_content: (body.rendered_sections || []).reduce(
          (acc: Record<string, string>, s: { key: string; content: string }) => {
            acc[s.key] = s.content
            return acc
          }, {}
        ),
        variables_snapshot: body.variables || {},
        change_summary: body.change_summary || `Updated to version ${newVersion}`,
        changed_by: user.id,
      })

      return NextResponse.json({ data })
    }

    // Default field update
    const updateData: Record<string, unknown> = {}
    const allowedFields = ['document_title', 'description', 'review_notes']
    for (const f of allowedFields) {
      if (body[f] !== undefined) updateData[f] = body[f]
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('generated_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Settlement document PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/settlement-documents/[id]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('generated_documents')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settlement document DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
