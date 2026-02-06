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

// GET /api/states/[stateCode] - Get state requirements with available templates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stateCode: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { stateCode } = await params

    // Get state requirements
    const { data: state, error: stateError } = await supabase
      .from('state_requirements')
      .select('*')
      .eq('state_code', stateCode.toUpperCase())
      .eq('is_active', true)
      .single()

    if (stateError || !state) {
      return NextResponse.json({ error: 'State not found' }, { status: 404 })
    }

    // Get available templates for this state
    const { data: templates, error: templatesError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('state_code', stateCode.toUpperCase())
      .eq('is_active', true)
      .order('category', { ascending: true })

    if (templatesError) {
      console.error('Error fetching templates:', templatesError)
    }

    // Group templates by category
    const templatesByCategory: Record<string, typeof templates> = {}
    for (const template of templates || []) {
      const category = template.category || 'other'
      if (!templatesByCategory[category]) {
        templatesByCategory[category] = []
      }
      templatesByCategory[category].push(template)
    }

    return NextResponse.json({
      state,
      templates: templates || [],
      templates_by_category: templatesByCategory,
      required_forms: state.required_forms || [],
      optional_forms: state.optional_forms || []
    })
  } catch (error) {
    console.error('State GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
