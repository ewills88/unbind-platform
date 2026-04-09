import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/client/finances - Get financial overview for client's case
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get client's case
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, state')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!caseData) {
      return NextResponse.json({ error: 'No case found' }, { status: 404 })
    }

    // Fetch assets
    const { data: assets } = await supabase
      .from('assets')
      .select('*')
      .eq('case_id', caseData.id)
      .order('estimated_value', { ascending: false })

    // Fetch debts
    const { data: debts } = await supabase
      .from('debts')
      .select('*')
      .eq('case_id', caseData.id)
      .order('current_balance', { ascending: false })

    // Fetch income sources
    const { data: income } = await supabase
      .from('income_sources')
      .select('*')
      .eq('case_id', caseData.id)

    // Fetch expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('case_id', caseData.id)

    // Fetch preferred division scenario
    const { data: divisionScenario } = await supabase
      .from('division_scenarios')
      .select('*')
      .eq('case_id', caseData.id)
      .eq('is_preferred', true)
      .limit(1)
      .single()

    // Calculate totals
    const totalAssets = (assets || []).reduce((sum, a) => sum + (a.estimated_value || 0), 0)
    const totalDebts = (debts || []).reduce((sum, d) => sum + (d.current_balance || 0), 0)
    const netWorth = totalAssets - totalDebts

    // Group assets by ownership
    const _clientAssets = (assets || []).filter(a => a.ownership === 'client' || a.ownership === 'joint')
    const _spouseAssets = (assets || []).filter(a => a.ownership === 'spouse' || a.ownership === 'joint')

    return NextResponse.json({
      case_id: caseData.id,
      state_code: caseData.state || null,
      total_assets: totalAssets,
      total_debts: totalDebts,
      net_worth: netWorth,
      assets: assets || [],
      debts: debts || [],
      income: income || [],
      expenses: expenses || [],
      division_scenario: divisionScenario || null,
    })
  } catch (error) {
    console.error('Client finances GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
