import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
interface RouteParams {
  params: Promise<{ caseId: string }>
}

// GET /api/cases/[caseId]/settlement-analytics
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    // Fetch all data in parallel
    const [
      proposalsRes,
      eventsRes,
      documentsRes,
      mediationRes,
      assetsRes,
      debtsRes,
    ] = await Promise.all([
      supabase
        .from('settlement_proposals')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at'),
      supabase
        .from('negotiation_events')
        .select('*')
        .eq('case_id', caseId)
        .order('event_date'),
      supabase
        .from('generated_documents')
        .select('*')
        .eq('case_id', caseId)
        .eq('document_type', 'settlement_agreement'),
      supabase
        .from('mediation_sessions')
        .select('*')
        .eq('case_id', caseId),
      supabase
        .from('assets')
        .select('estimated_value, current_value')
        .eq('case_id', caseId),
      supabase
        .from('debts')
        .select('current_balance')
        .eq('case_id', caseId),
    ])

    const proposals = proposalsRes.data || []
    const events = eventsRes.data || []
    const documents = documentsRes.data || []
    const mediations = mediationRes.data || []
    const assets = assetsRes.data || []
    const debts = debtsRes.data || []

    // Calculate metrics
    const totalProposals = proposals.length
    const activeProposals = proposals.filter((p: { status: string }) =>
      ['draft', 'sent', 'received'].includes(p.status)
    ).length
    const acceptedProposal = proposals.find((p: { status: string }) => p.status === 'accepted')

    // Days in negotiation
    const firstProposal = proposals[0]
    const daysInNegotiation = firstProposal
      ? Math.ceil((Date.now() - new Date(firstProposal.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Average rounds (proposals per accepted or total)
    const averageRounds = totalProposals

    // Property values
    const totalAssetValue = assets.reduce((sum: number, a: { current_value?: number; estimated_value?: number }) =>
      sum + (a.current_value || a.estimated_value || 0), 0)
    const totalDebtValue = debts.reduce((sum: number, d: { current_balance?: number }) =>
      sum + (d.current_balance || 0), 0)
    const totalPropertyValue = totalAssetValue - totalDebtValue

    // Division from accepted proposal or latest
    const refProposal = acceptedProposal || proposals[proposals.length - 1]
    const husbandShare = refProposal?.total_to_husband || 0
    const wifeShare = refProposal?.total_to_wife || 0
    const monthlySupport = (refProposal?.monthly_support_husband_pays || 0) +
      (refProposal?.monthly_support_wife_pays || 0)
    const supportPayor = refProposal?.monthly_support_husband_pays > 0
      ? 'husband'
      : refProposal?.monthly_support_wife_pays > 0
        ? 'wife'
        : null

    // Documents
    const documentsGenerated = documents.length
    const documentsPending = documents.filter((d: { status: string }) =>
      ['draft', 'in_review'].includes(d.status)
    ).length
    const documentsApproved = documents.filter((d: { status: string }) =>
      ['approved', 'filed'].includes(d.status)
    ).length

    // Mediation
    const mediationSessions = mediations.length
    const completedMediation = mediations.find((m: { outcome: string | null }) => m.outcome)
    const mediationOutcome = completedMediation?.outcome || null

    // Timeline
    const timelineEvents = events.length
    const lastEvent = events[events.length - 1]

    // Proposal history for chart data
    const proposalHistory = proposals.map((p: {
      proposal_number: number
      title: string
      total_to_husband: number
      total_to_wife: number
      monthly_support_husband_pays: number
      monthly_support_wife_pays: number
      status: string
      created_at: string
    }) => ({
      number: p.proposal_number,
      title: p.title,
      husband_total: p.total_to_husband,
      wife_total: p.total_to_wife,
      monthly_support: (p.monthly_support_husband_pays || 0) + (p.monthly_support_wife_pays || 0),
      status: p.status,
      date: p.created_at,
    }))

    // Event timeline for chart
    const eventTimeline = events.map((e: {
      event_type: string
      event_date: string
      title: string
      is_milestone: boolean
    }) => ({
      type: e.event_type,
      date: e.event_date,
      title: e.title,
      is_milestone: e.is_milestone,
    }))

    return NextResponse.json({
      data: {
        totalProposals,
        activeProposals,
        averageRounds,
        daysInNegotiation,
        totalPropertyValue,
        husbandShare,
        wifeShare,
        monthlySupport,
        supportPayor,
        documentsGenerated,
        documentsPending,
        documentsApproved,
        mediationSessions,
        mediationOutcome,
        timelineEvents,
        lastActivity: lastEvent?.event_date || null,
        proposalHistory,
        eventTimeline,
        totalAssetValue,
        totalDebtValue,
      },
    })
  } catch (error) {
    console.error('Settlement analytics GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
