import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { IntakeQueueFilter, IntakeQueueSort } from '@/types/intake-workflow'

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

// GET /api/attorney/intakes - Get intake queue for attorney
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = (searchParams.get('filter') || 'all') as IntakeQueueFilter
    const sort = (searchParams.get('sort') || 'newest') as IntakeQueueSort
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build query for intakes the attorney can see
    let query = supabase
      .from('client_intakes')
      .select(`
        *,
        intake_ai_analysis (
          complexity_score,
          flags,
          recommendations
        )
      `)
      .in('status', ['submitted', 'reviewed'])

    // Apply filters
    switch (filter) {
      case 'new':
        query = query.eq('review_status', 'pending')
        break
      case 'under_review':
        query = query.eq('review_status', 'under_review')
        break
      case 'info_requested':
        query = query.eq('review_status', 'info_requested')
        break
      case 'flagged':
        // Filter for intakes with AI flags
        query = query.eq('review_status', 'pending')
        break
    }

    // Apply sorting
    switch (sort) {
      case 'newest':
        query = query.order('submitted_at', { ascending: false })
        break
      case 'oldest':
        query = query.order('submitted_at', { ascending: true })
        break
      case 'most_complex':
      case 'least_complex':
        // Will sort in memory after fetching
        query = query.order('submitted_at', { ascending: false })
        break
    }

    // Pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: intakes, error, count } = await query

    if (error) {
      console.error('Error fetching intakes:', error)
      return NextResponse.json({ error: 'Failed to fetch intakes' }, { status: 500 })
    }

    // Get document stats for each intake
    const intakeIds = (intakes || []).map(i => i.id)
    const { data: documentStats } = await supabase
      .from('intake_documents')
      .select('intake_id, upload_status')
      .in('intake_id', intakeIds)

    // Calculate stats per intake
    const statsMap = new Map<string, { total: number; uploaded: number; verified: number; rejected: number }>()
    for (const doc of documentStats || []) {
      if (!statsMap.has(doc.intake_id)) {
        statsMap.set(doc.intake_id, { total: 0, uploaded: 0, verified: 0, rejected: 0 })
      }
      const stats = statsMap.get(doc.intake_id)!
      stats.total++
      if (['uploaded', 'processing', 'verified'].includes(doc.upload_status)) {
        stats.uploaded++
      }
      if (doc.upload_status === 'verified') {
        stats.verified++
      }
      if (doc.upload_status === 'rejected') {
        stats.rejected++
      }
    }

    // Enrich intakes with document stats
    const enrichedIntakes = (intakes || []).map(intake => ({
      ...intake,
      ai_analysis: intake.intake_ai_analysis?.[0] || null,
      document_stats: statsMap.get(intake.id) || { total: 0, uploaded: 0, verified: 0, rejected: 0 },
    }))

    // Sort by complexity if needed
    if (sort === 'most_complex') {
      enrichedIntakes.sort((a, b) =>
        (b.ai_analysis?.complexity_score || 0) - (a.ai_analysis?.complexity_score || 0)
      )
    } else if (sort === 'least_complex') {
      enrichedIntakes.sort((a, b) =>
        (a.ai_analysis?.complexity_score || 0) - (b.ai_analysis?.complexity_score || 0)
      )
    }

    // Filter for flagged if needed
    let finalIntakes = enrichedIntakes
    if (filter === 'flagged') {
      finalIntakes = enrichedIntakes.filter(i =>
        i.ai_analysis?.flags && i.ai_analysis.flags.length > 0
      )
    }

    // Get queue stats
    const { data: statsData } = await supabase
      .from('client_intakes')
      .select('review_status, approved_at')
      .in('status', ['submitted', 'reviewed'])

    const stats = {
      pending_review: 0,
      under_review: 0,
      info_requested: 0,
      approved_today: 0,
      average_review_time_hours: 0,
    }

    const today = new Date().toISOString().split('T')[0]
    for (const s of statsData || []) {
      if (s.review_status === 'pending') stats.pending_review++
      if (s.review_status === 'under_review') stats.under_review++
      if (s.review_status === 'info_requested') stats.info_requested++
      if (s.approved_at && s.approved_at.startsWith(today)) stats.approved_today++
    }

    return NextResponse.json({
      intakes: finalIntakes,
      stats,
      pagination: {
        page,
        limit,
        total: count || finalIntakes.length,
      }
    })
  } catch (error) {
    console.error('Attorney intakes GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
