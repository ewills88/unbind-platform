import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

interface DivisionScenarioInput {
  name: string
  description?: string
  asset_assignments: Record<string, 'client' | 'spouse' | 'sell'>
  debt_assignments: Record<string, 'client' | 'spouse'>
  is_preferred?: boolean
  notes?: string
}

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

interface AssetRow {
  id: string
  estimated_value: number
}

interface DebtRow {
  id: string
  current_balance: number
}

// Calculate totals from assignments
async function calculateTotals(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  caseId: string,
  assetAssignments: Record<string, string>,
  debtAssignments: Record<string, string>
) {
  // Get all assets for the case
  const { data: assetsData } = await supabase
    .from('assets')
    .select('id, estimated_value')
    .eq('case_id', caseId)

  // Get all debts for the case
  const { data: debtsData } = await supabase
    .from('debts')
    .select('id, current_balance')
    .eq('case_id', caseId)

  const assets = (assetsData || []) as AssetRow[]
  const debts = (debtsData || []) as DebtRow[]

  let clientAssetTotal = 0
  let clientDebtTotal = 0
  let spouseAssetTotal = 0
  let spouseDebtTotal = 0

  // Calculate asset totals
  for (const asset of assets) {
    const assignment = assetAssignments[asset.id]
    if (assignment === 'client') {
      clientAssetTotal += Number(asset.estimated_value) || 0
    } else if (assignment === 'spouse') {
      spouseAssetTotal += Number(asset.estimated_value) || 0
    }
  }

  // Calculate debt totals
  for (const debt of debts) {
    const assignment = debtAssignments[debt.id]
    if (assignment === 'client') {
      clientDebtTotal += Number(debt.current_balance) || 0
    } else if (assignment === 'spouse') {
      spouseDebtTotal += Number(debt.current_balance) || 0
    }
  }

  const clientNet = clientAssetTotal - clientDebtTotal
  const spouseNet = spouseAssetTotal - spouseDebtTotal
  const difference = Math.abs(clientNet - spouseNet)
  const equalizationAmount = difference / 2

  return {
    client_asset_total: clientAssetTotal,
    client_debt_total: clientDebtTotal,
    spouse_asset_total: spouseAssetTotal,
    spouse_debt_total: spouseDebtTotal,
    equalization_amount: equalizationAmount,
    equalization_payer: clientNet > spouseNet ? 'client' : spouseNet > clientNet ? 'spouse' : 'none'
  }
}

// GET /api/cases/[caseId]/division-scenarios - List all scenarios
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

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 })
    }

    const { data: scenarios, error } = await supabase
      .from('division_scenarios')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching scenarios:', error)
      return NextResponse.json({ error: 'Failed to fetch scenarios' }, { status: 500 })
    }

    return NextResponse.json({ scenarios: scenarios || [] })
  } catch (error) {
    console.error('Division scenarios GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/division-scenarios - Create a new scenario
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
    const body: DivisionScenarioInput = await request.json()

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 })
    }

    // Calculate totals
    const totals = await calculateTotals(
      supabase,
      caseId,
      body.asset_assignments || {},
      body.debt_assignments || {}
    )

    // If this scenario should be preferred, unset other preferred scenarios
    if (body.is_preferred) {
      await supabase
        .from('division_scenarios')
        .update({ is_preferred: false })
        .eq('case_id', caseId)
    }

    const { data: scenario, error } = await supabase
      .from('division_scenarios')
      .insert({
        case_id: caseId,
        name: body.name,
        description: body.description,
        asset_assignments: body.asset_assignments || {},
        debt_assignments: body.debt_assignments || {},
        is_preferred: body.is_preferred || false,
        notes: body.notes,
        created_by: user.id,
        ...totals
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating scenario:', error)
      return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 })
    }

    return NextResponse.json({ scenario }, { status: 201 })
  } catch (error) {
    console.error('Division scenarios POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/division-scenarios?id=xxx - Update a scenario
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const scenarioId = searchParams.get('id')

    if (!scenarioId) {
      return NextResponse.json({ error: 'Scenario ID required' }, { status: 400 })
    }

    const body: Partial<DivisionScenarioInput> = await request.json()

    // Calculate totals if assignments changed
    let totals = {}
    if (body.asset_assignments || body.debt_assignments) {
      // Get existing scenario to merge assignments
      const { data: existing } = await supabase
        .from('division_scenarios')
        .select('asset_assignments, debt_assignments')
        .eq('id', scenarioId)
        .single()

      const assetAssignments = body.asset_assignments || existing?.asset_assignments || {}
      const debtAssignments = body.debt_assignments || existing?.debt_assignments || {}

      totals = await calculateTotals(supabase, caseId, assetAssignments, debtAssignments)
    }

    // If this scenario should be preferred, unset other preferred scenarios
    if (body.is_preferred) {
      await supabase
        .from('division_scenarios')
        .update({ is_preferred: false })
        .eq('case_id', caseId)
        .neq('id', scenarioId)
    }

    const updateData: Record<string, unknown> = { ...totals }
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.asset_assignments !== undefined) updateData.asset_assignments = body.asset_assignments
    if (body.debt_assignments !== undefined) updateData.debt_assignments = body.debt_assignments
    if (body.is_preferred !== undefined) updateData.is_preferred = body.is_preferred
    if (body.notes !== undefined) updateData.notes = body.notes

    const { data: scenario, error } = await supabase
      .from('division_scenarios')
      .update(updateData)
      .eq('id', scenarioId)
      .eq('case_id', caseId)
      .select()
      .single()

    if (error) {
      console.error('Error updating scenario:', error)
      return NextResponse.json({ error: 'Failed to update scenario' }, { status: 500 })
    }

    return NextResponse.json({ scenario })
  } catch (error) {
    console.error('Division scenarios PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cases/[caseId]/division-scenarios?id=xxx - Delete a scenario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const scenarioId = searchParams.get('id')

    if (!scenarioId) {
      return NextResponse.json({ error: 'Scenario ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('division_scenarios')
      .delete()
      .eq('id', scenarioId)
      .eq('case_id', caseId)

    if (error) {
      console.error('Error deleting scenario:', error)
      return NextResponse.json({ error: 'Failed to delete scenario' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Division scenarios DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
