import { NextRequest, NextResponse } from 'next/server'
import { calculateScenarioTotals } from '@/types/settlement'
import { getAuthenticatedClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/scenarios/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('settlement_scenarios')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Scenario GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/scenarios/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Handle convert to proposal action
    if (body._action === 'convert') {
      const { data: scenario } = await supabase
        .from('settlement_scenarios')
        .select('*')
        .eq('id', id)
        .single()

      if (!scenario) {
        return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
      }

      // Get next proposal number
      const { data: existing } = await supabase
        .from('settlement_proposals')
        .select('proposal_number')
        .eq('case_id', scenario.case_id)
        .order('proposal_number', { ascending: false })
        .limit(1)

      const nextNumber = existing && existing.length > 0 ? existing[0].proposal_number + 1 : 1

      const totals = scenario.calculated_totals || {}

      // Create proposal
      const { data: proposal, error: proposalError } = await supabase
        .from('settlement_proposals')
        .insert({
          case_id: scenario.case_id,
          firm_id: scenario.firm_id,
          proposal_number: nextNumber,
          title: `Proposal #${nextNumber} (from "${scenario.scenario_name}")`,
          created_by_party: 'our_client',
          status: 'draft',
          total_to_husband: totals.husband_property_net || 0,
          total_to_wife: totals.wife_property_net || 0,
          monthly_support_husband_pays: totals.support_payor === 'husband' ? totals.monthly_support || 0 : 0,
          monthly_support_wife_pays: totals.support_payor === 'wife' ? totals.monthly_support || 0 : 0,
          notes: `Converted from scenario: ${scenario.scenario_name}`,
          created_by: user.id,
        })
        .select()
        .single()

      if (proposalError) {
        return NextResponse.json({ error: proposalError.message }, { status: 500 })
      }

      // Insert property items
      const propertyItems = scenario.property_allocation || []
      if (propertyItems.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const insertData = propertyItems.map((item: any, index: number) => ({
          proposal_id: proposal.id,
          item_type: item.item_type || 'asset',
          asset_id: item.asset_id || null,
          debt_id: item.debt_id || null,
          description: item.description,
          category: item.category || null,
          gross_value: item.gross_value || 0,
          encumbrance: item.encumbrance || 0,
          net_value: item.net_value || 0,
          characterization: item.characterization || 'community',
          allocated_to: item.allocated_to || 'split',
          allocation_percentage: item.allocation_percentage || 50,
          husband_receives: item.husband_receives || 0,
          wife_receives: item.wife_receives || 0,
          notes: item.notes || null,
          display_order: index,
        }))
        await supabase.from('proposal_property_items').insert(insertData)
      }

      // Insert spousal support if present
      const support = scenario.spousal_support || {}
      if (support.monthly_amount && support.monthly_amount > 0) {
        await supabase.from('proposal_spousal_support').insert({
          proposal_id: proposal.id,
          support_type: support.support_type || 'rehabilitative',
          payor: support.payor || 'husband',
          monthly_amount: support.monthly_amount,
          duration_months: support.duration_months || null,
        })
      }

      // Insert custody if present
      const custody = scenario.custody_terms || {}
      if (custody.legal_custody || custody.physical_custody) {
        await supabase.from('proposal_custody').insert({
          proposal_id: proposal.id,
          legal_custody: custody.legal_custody || 'joint',
          physical_custody: custody.physical_custody || 'joint',
          husband_percentage: custody.husband_percentage || 50,
          wife_percentage: custody.wife_percentage || 50,
          schedule_type: custody.schedule_type || 'week_on_week_off',
        })
      }

      return NextResponse.json({ data: proposal }, { status: 201 })
    }

    // Default update
    const updateData: Record<string, unknown> = {}
    const fields = [
      'scenario_name', 'scenario_description', 'property_allocation',
      'spousal_support', 'child_support', 'custody_terms', 'other_terms',
      'comparison_notes', 'pros', 'cons', 'is_favorite', 'is_archived',
    ]
    for (const f of fields) {
      if (body[f] !== undefined) updateData[f] = body[f]
    }

    // Recalculate totals if allocation or support changed
    if (body.property_allocation || body.spousal_support) {
      // Fetch current scenario to merge
      const { data: current } = await supabase
        .from('settlement_scenarios')
        .select('property_allocation, spousal_support')
        .eq('id', id)
        .single()

      const totals = calculateScenarioTotals({
        property_allocation: body.property_allocation || current?.property_allocation,
        spousal_support: body.spousal_support || current?.spousal_support,
      })
      updateData.calculated_totals = totals
    }

    const { data, error } = await supabase
      .from('settlement_scenarios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Scenario PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/scenarios/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('settlement_scenarios')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Scenario DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
