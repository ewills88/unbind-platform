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

function calculateAllocationAmounts(
  netValue: number,
  allocatedTo: string,
  percentage: number = 50
): { husband: number; wife: number } {
  switch (allocatedTo) {
    case 'husband': return { husband: netValue, wife: 0 }
    case 'wife': return { husband: 0, wife: netValue }
    case 'sell': return { husband: netValue / 2, wife: netValue / 2 }
    case 'split': return {
      husband: netValue * (percentage / 100),
      wife: netValue * ((100 - percentage) / 100),
    }
    default: return { husband: 0, wife: 0 }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recalculateProposalTotals(supabase: any, proposalId: string) {
  const { data: propertyItems } = await supabase
    .from('proposal_property_items')
    .select('*')
    .eq('proposal_id', proposalId)

  let totalToHusband = 0
  let totalToWife = 0

  for (const item of propertyItems || []) {
    if (item.item_type === 'asset') {
      totalToHusband += item.husband_receives || 0
      totalToWife += item.wife_receives || 0
    } else {
      totalToHusband -= item.husband_receives || 0
      totalToWife -= item.wife_receives || 0
    }
  }

  const difference = totalToHusband - totalToWife
  const equalizationPayment = Math.abs(difference) / 2

  await supabase
    .from('settlement_proposals')
    .update({
      total_to_husband: totalToHusband,
      total_to_wife: totalToWife,
      equalization_payment: equalizationPayment,
      equalization_payor: difference > 0 ? 'husband' : difference < 0 ? 'wife' : null,
    })
    .eq('id', proposalId)
}

// GET /api/proposals/[id]/property - List property items
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('proposal_property_items')
      .select('*')
      .eq('proposal_id', id)
      .order('display_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Property items GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/proposals/[id]/property - Add property item
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const netValue = body.net_value ?? ((body.gross_value || 0) - (body.encumbrance || 0))
    const { husband, wife } = calculateAllocationAmounts(
      netValue, body.allocated_to || 'split', body.allocation_percentage || 50
    )

    const { data, error } = await supabase
      .from('proposal_property_items')
      .insert({
        proposal_id: id,
        item_type: body.item_type || 'asset',
        asset_id: body.asset_id || null,
        debt_id: body.debt_id || null,
        description: body.description,
        category: body.category || null,
        gross_value: body.gross_value || 0,
        encumbrance: body.encumbrance || 0,
        net_value: netValue,
        characterization: body.characterization || 'community',
        separate_property_trace: body.separate_property_trace || null,
        allocated_to: body.allocated_to || 'split',
        allocation_percentage: body.allocation_percentage || 50,
        husband_receives: husband,
        wife_receives: wife,
        notes: body.notes || null,
        display_order: body.display_order || 0,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await recalculateProposalTotals(supabase, id)

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Property item create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/proposals/[id]/property - Bulk replace all property items
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const items = body.items || []

    // Delete existing
    await supabase
      .from('proposal_property_items')
      .delete()
      .eq('proposal_id', id)

    if (items.length > 0) {
      const insertData = items.map((item: Record<string, unknown>, index: number) => {
        const netValue = (item.net_value as number) ?? ((item.gross_value as number || 0) - (item.encumbrance as number || 0))
        const { husband, wife } = calculateAllocationAmounts(
          netValue, (item.allocated_to as string) || 'split', (item.allocation_percentage as number) || 50
        )

        return {
          proposal_id: id,
          item_type: item.item_type || 'asset',
          asset_id: item.asset_id || null,
          debt_id: item.debt_id || null,
          description: item.description,
          category: item.category || null,
          gross_value: item.gross_value || 0,
          encumbrance: item.encumbrance || 0,
          net_value: netValue,
          characterization: item.characterization || 'community',
          separate_property_trace: item.separate_property_trace || null,
          allocated_to: item.allocated_to || 'split',
          allocation_percentage: item.allocation_percentage || 50,
          husband_receives: husband,
          wife_receives: wife,
          notes: item.notes || null,
          display_order: index,
        }
      })

      await supabase.from('proposal_property_items').insert(insertData)
    }

    await recalculateProposalTotals(supabase, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Property bulk update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
