import { NextRequest, NextResponse } from 'next/server'
import { getStateData, getSupportedStates } from '@/lib/stateData'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/states/[code] - Get state law data or state requirements with templates
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase()

    // Special route: list all supported states (requires auth)
    if (code === 'LIST') {
      const { user } = await getAuthenticatedClient(request)
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.json(getSupportedStates())
    }

    const { searchParams } = new URL(request.url)

    // If ?templates=true, return state requirements + document templates from DB
    if (searchParams.get('templates') === 'true') {
      const { client: supabase, user } = await getAuthenticatedClient(request)

      if (!user || !supabase) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: state, error: stateError } = await supabase
        .from('state_requirements')
        .select('*')
        .eq('state_code', code)
        .eq('is_active', true)
        .single()

      if (stateError || !state) {
        return NextResponse.json({ error: 'State not found' }, { status: 404 })
      }

      const { data: templates, error: templatesError } = await supabase
        .from('document_templates')
        .select('*')
        .eq('state_code', code)
        .eq('is_active', true)
        .order('category', { ascending: true })

      if (templatesError) {
        console.error('Error fetching templates:', templatesError)
      }

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
    }

    // Default: return static state law data
    const stateData = getStateData(code)

    if (!stateData) {
      return NextResponse.json(
        { error: `State "${code}" is not supported. Supported states: CA, TX, FL` },
        { status: 404 }
      )
    }

    const category = searchParams.get('category')

    if (category) {
      const categoryData = (stateData as unknown as Record<string, unknown>)[category]
      if (!categoryData) {
        return NextResponse.json(
          { error: `Category "${category}" not found for ${code}` },
          { status: 404 }
        )
      }
      return NextResponse.json({ state: code, category, data: categoryData })
    }

    return NextResponse.json(stateData)
  } catch (error) {
    console.error('State GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
