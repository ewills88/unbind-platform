import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
interface RouteParams {
  params: Promise<{ id: string }>
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
  const equalizationPayor = difference > 0 ? 'husband' : difference < 0 ? 'wife' : null

  const { data: support } = await supabase
    .from('proposal_spousal_support')
    .select('*')
    .eq('proposal_id', proposalId)
    .limit(1)

  const supportRow = support && support.length > 0 ? support[0] : null

  await supabase
    .from('settlement_proposals')
    .update({
      total_to_husband: totalToHusband,
      total_to_wife: totalToWife,
      equalization_payment: equalizationPayment,
      equalization_payor: equalizationPayor,
      monthly_support_husband_pays: supportRow?.payor === 'husband' ? supportRow.monthly_amount : 0,
      monthly_support_wife_pays: supportRow?.payor === 'wife' ? supportRow.monthly_amount : 0,
      support_duration_months: supportRow?.duration_months || null,
    })
    .eq('id', proposalId)
}

// GET /api/proposals/[id] - Get full proposal with all terms
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: proposal, error } = await supabase
      .from('settlement_proposals')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // Fetch sub-tables in parallel
    const [propertyRes, supportRes, childSupportRes, custodyRes, otherRes] = await Promise.all([
      supabase.from('proposal_property_items').select('*').eq('proposal_id', id).order('display_order'),
      supabase.from('proposal_spousal_support').select('*').eq('proposal_id', id),
      supabase.from('proposal_child_support').select('*').eq('proposal_id', id),
      supabase.from('proposal_custody').select('*').eq('proposal_id', id),
      supabase.from('proposal_other_terms').select('*').eq('proposal_id', id).order('display_order'),
    ])

    return NextResponse.json({
      data: {
        ...proposal,
        property_items: propertyRes.data || [],
        spousal_support: supportRes.data || [],
        child_support: childSupportRes.data || [],
        custody: custodyRes.data || [],
        other_terms: otherRes.data || [],
      },
    })
  } catch (error) {
    console.error('Proposal GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/proposals/[id] - Update proposal
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Handle recalculate action
    if (body._action === 'recalculate') {
      await recalculateProposalTotals(supabase, id)
      const { data } = await supabase
        .from('settlement_proposals')
        .select('*')
        .eq('id', id)
        .single()
      return NextResponse.json({ data })
    }

    // Handle send action
    if (body._action === 'send') {
      const { data, error } = await supabase
        .from('settlement_proposals')
        .update({ status: 'sent', sent_date: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Create negotiation event
      const { data: proposal } = await supabase
        .from('settlement_proposals')
        .select('case_id, title')
        .eq('id', id)
        .single()

      if (proposal) {
        await supabase.from('negotiation_events').insert({
          case_id: proposal.case_id,
          event_type: 'proposal_sent',
          event_date: new Date().toISOString(),
          proposal_id: id,
          title: `Sent: ${proposal.title}`,
          created_by: user.id,
        })
      }

      return NextResponse.json({ data })
    }

    // Handle counter action
    if (body._action === 'counter') {
      // Get original proposal
      const { data: original } = await supabase
        .from('settlement_proposals')
        .select('*')
        .eq('id', id)
        .single()

      if (!original) {
        return NextResponse.json({ error: 'Original proposal not found' }, { status: 404 })
      }

      // Mark original as countered
      await supabase
        .from('settlement_proposals')
        .update({ status: 'countered' })
        .eq('id', id)

      // Get next proposal number
      const { data: existing } = await supabase
        .from('settlement_proposals')
        .select('proposal_number')
        .eq('case_id', original.case_id)
        .order('proposal_number', { ascending: false })
        .limit(1)

      const nextNumber = existing && existing.length > 0 ? existing[0].proposal_number + 1 : 1

      // Create counter proposal
      const { data: counter, error } = await supabase
        .from('settlement_proposals')
        .insert({
          case_id: original.case_id,
          firm_id: original.firm_id,
          proposal_number: nextNumber,
          title: body.title || `Counter-Proposal #${nextNumber}`,
          created_by_party: body.created_by_party || 'our_client',
          status: 'draft',
          parent_proposal_id: id,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Create negotiation event
      await supabase.from('negotiation_events').insert({
        case_id: original.case_id,
        event_type: 'counter_offer',
        event_date: new Date().toISOString(),
        proposal_id: counter.id,
        title: `Counter-offer to ${original.title}`,
        created_by: user.id,
      })

      return NextResponse.json({ data: counter }, { status: 201 })
    }

    // Default: update proposal fields
    const updateData: Record<string, unknown> = {}
    const fields = [
      'title', 'status', 'cover_letter', 'notes', 'summary',
      'sent_date', 'received_date', 'response_deadline', 'expiration_date',
    ]
    for (const f of fields) {
      if (body[f] !== undefined) updateData[f] = body[f]
    }

    // Get old status before updating (for timeline events)
    let oldStatus: string | null = null
    if (body.status) {
      const { data: current } = await supabase
        .from('settlement_proposals')
        .select('status, case_id, firm_id, title, created_by_party')
        .eq('id', id)
        .single()
      oldStatus = current?.status || null

      // Auto-create timeline events for status changes
      if (current && body.status !== oldStatus) {
        const eventTypes: Record<string, string> = {
          accepted: 'terms_accepted',
          rejected: 'terms_rejected',
          expired: 'expiration',
          withdrawn: 'withdrawn',
          received: 'proposal_received',
        }
        const eventType = eventTypes[body.status]
        if (eventType) {
          const titles: Record<string, string> = {
            terms_accepted: `Accepted: ${current.title}`,
            terms_rejected: `Rejected: ${current.title}`,
            expiration: `Expired: ${current.title}`,
            withdrawn: `Withdrawn: ${current.title}`,
            proposal_received: `Received: ${current.title}`,
          }
          await supabase.from('negotiation_events').insert({
            case_id: current.case_id,
            firm_id: current.firm_id,
            event_type: eventType,
            event_date: new Date().toISOString(),
            proposal_id: id,
            title: titles[eventType],
            from_party: current.created_by_party || 'both',
            is_milestone: eventType === 'terms_accepted',
            created_by: user.id,
          })
        }
      }
    }

    const { data, error } = await supabase
      .from('settlement_proposals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Proposal PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/proposals/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('settlement_proposals')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Proposal DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
