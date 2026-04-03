import { NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
const STAGE_ORDER = [
  'initial_filing',
  'discovery',
  'negotiation',
  'mediation',
  'settlement',
  'trial',
  'closed',
]

const STAGE_LABELS: Record<string, string> = {
  initial_filing: 'Initial Filing',
  discovery: 'Discovery',
  negotiation: 'Negotiation',
  mediation: 'Mediation',
  settlement: 'Settlement',
  trial: 'Trial',
  closed: 'Closed',
  active: 'Active',
}

// GET /api/firms/analytics/pipeline - Case pipeline data
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'Not a firm member' }, { status: 400 })
    }

    const firmId = profile.current_firm_id

    // Get all cases for this firm
    const { data: cases } = await supabase
      .from('cases')
      .select('id, status, case_stage')
      .eq('firm_id', firmId)

    if (!cases || cases.length === 0) {
      return NextResponse.json({
        pipeline: {
          stages: [],
          total_cases: 0,
          total_value: 0,
        }
      })
    }

    // Get invoice totals per case for pipeline value
    const caseIds = cases.map(c => c.id)
    const { data: invoices } = await supabase
      .from('invoices')
      .select('case_id, total_amount')
      .in('case_id', caseIds)

    const caseValues: Record<string, number> = {}
    for (const inv of invoices || []) {
      caseValues[inv.case_id] = (caseValues[inv.case_id] || 0) + (inv.total_amount || 0)
    }

    // Group cases by stage
    const stageGroups: Record<string, { count: number; total_value: number }> = {}
    for (const c of cases) {
      const stage = c.case_stage || c.status || 'active'
      if (!stageGroups[stage]) {
        stageGroups[stage] = { count: 0, total_value: 0 }
      }
      stageGroups[stage].count++
      stageGroups[stage].total_value += caseValues[c.id] || 0
    }

    // Build ordered stages
    const stages = []
    const seenStages = new Set<string>()

    for (const stageKey of STAGE_ORDER) {
      if (stageGroups[stageKey]) {
        stages.push({
          name: STAGE_LABELS[stageKey] || stageKey,
          count: stageGroups[stageKey].count,
          total_value: Math.round(stageGroups[stageKey].total_value * 100) / 100,
        })
        seenStages.add(stageKey)
      }
    }

    // Add any stages not in the predefined order
    for (const [stageKey, data] of Object.entries(stageGroups)) {
      if (!seenStages.has(stageKey)) {
        stages.push({
          name: STAGE_LABELS[stageKey] || stageKey,
          count: data.count,
          total_value: Math.round(data.total_value * 100) / 100,
        })
      }
    }

    const totalValue = stages.reduce((sum, s) => sum + s.total_value, 0)

    return NextResponse.json({
      pipeline: {
        stages,
        total_cases: cases.length,
        total_value: Math.round(totalValue * 100) / 100,
      }
    })
  } catch (error) {
    console.error('Case pipeline GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
