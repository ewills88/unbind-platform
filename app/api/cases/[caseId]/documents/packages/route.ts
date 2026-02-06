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

// GET /api/cases/[caseId]/documents/packages - List packages for case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    // Verify access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', caseId)
      .single()

    if (!caseData || (caseData.attorney_id !== user.id && caseData.client_id !== user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get packages
    const { data: packages, error } = await supabase
      .from('document_packages')
      .select(`
        *,
        created_by_user:profiles!document_packages_created_by_fkey(
          id, full_name
        )
      `)
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching packages:', error)
      return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
    }

    return NextResponse.json({ packages })
  } catch (error) {
    console.error('Packages GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/documents/packages - Create package and generate documents
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    const {
      package_name,
      package_type,
      template_codes
    } = body

    if (!package_name || !template_codes || template_codes.length === 0) {
      return NextResponse.json({
        error: 'package_name and template_codes are required'
      }, { status: 400 })
    }

    // Verify attorney access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, state_code')
      .eq('id', caseId)
      .single()

    if (!caseData || caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Only attorneys can create packages' }, { status: 403 })
    }

    // Get templates by code
    const { data: templates, error: templatesError } = await supabase
      .from('document_templates')
      .select('*')
      .in('template_code', template_codes)
      .eq('is_active', true)

    if (templatesError || !templates || templates.length === 0) {
      return NextResponse.json({ error: 'No valid templates found' }, { status: 404 })
    }

    // Create package record
    const { data: packageRecord, error: packageError } = await supabase
      .from('document_packages')
      .insert({
        case_id: caseId,
        package_name,
        package_type: package_type || 'custom',
        status: 'generating',
        document_ids: [],
        created_by: user.id
      })
      .select()
      .single()

    if (packageError || !packageRecord) {
      console.error('Error creating package:', packageError)
      return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
    }

    // Generate documents from each template
    const generatedDocIds: string[] = []
    const errors: { template_code: string; error: string }[] = []

    for (const template of templates) {
      try {
        // Create generated document
        const { data: generatedDoc, error: docError } = await supabase
          .from('generated_documents')
          .insert({
            case_id: caseId,
            template_id: template.id,
            document_type: template.template_type,
            document_title: template.template_name,
            description: `Generated as part of ${package_name}`,
            status: 'draft',
            filled_data: {},
            custom_content: {},
            version: 1,
            created_by: user.id
          })
          .select()
          .single()

        if (docError || !generatedDoc) {
          errors.push({
            template_code: template.template_code,
            error: docError?.message || 'Failed to generate document'
          })
          continue
        }

        generatedDocIds.push(generatedDoc.id)

        // Log generation
        await supabase.rpc('log_document_generation', {
          p_document_id: generatedDoc.id,
          p_version: 1,
          p_action: 'created',
          p_changes_summary: `Generated as part of package: ${package_name}`,
          p_user_id: user.id
        })
      } catch (err) {
        errors.push({
          template_code: template.template_code,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    // Update package with generated document IDs
    const packageStatus = generatedDocIds.length === templates.length ? 'completed' :
                         generatedDocIds.length > 0 ? 'completed' : 'failed'

    const { data: updatedPackage, error: updateError } = await supabase
      .from('document_packages')
      .update({
        document_ids: generatedDocIds,
        status: packageStatus,
        completed_at: packageStatus === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', packageRecord.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating package:', updateError)
    }

    // Get the generated documents
    const { data: documents } = await supabase
      .from('generated_documents')
      .select(`
        *,
        template:document_templates(
          id, template_name, template_code, template_type
        )
      `)
      .in('id', generatedDocIds)

    return NextResponse.json({
      package: updatedPackage || packageRecord,
      documents: documents || [],
      errors: errors.length > 0 ? errors : undefined,
      message: `Generated ${generatedDocIds.length} of ${template_codes.length} documents`
    }, { status: 201 })
  } catch (error) {
    console.error('Packages POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
