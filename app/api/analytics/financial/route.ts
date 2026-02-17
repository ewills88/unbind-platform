import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  getRevenueReport,
  getARAgingReport,
  getCollectionsReport,
  getProfitabilityReport,
  getTrustAccountReport,
} from '@/lib/analytics/financialAnalytics'

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

// GET /api/analytics/financial?type=revenue|ar_aging|collections|profitability|trust
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
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
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'revenue'

    // Parse date filters
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const caseType = searchParams.get('case_type') || undefined

    const filters: { dateRange?: { start: Date; end: Date }; caseType?: string } = {}
    if (startDate && endDate) {
      filters.dateRange = { start: new Date(startDate), end: new Date(endDate) }
    }
    if (caseType) filters.caseType = caseType

    let data
    switch (type) {
      case 'revenue':
        data = await getRevenueReport(firmId, filters)
        break
      case 'ar_aging':
        data = await getARAgingReport(firmId)
        break
      case 'collections':
        data = await getCollectionsReport(firmId, filters)
        break
      case 'profitability':
        data = await getProfitabilityReport(firmId, filters)
        break
      case 'trust':
        data = await getTrustAccountReport(firmId)
        break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    return NextResponse.json({ type, data })
  } catch (error) {
    console.error('Financial analytics GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
