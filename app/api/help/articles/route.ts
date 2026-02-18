// Session 25: Help Articles API
// GET: search articles by query param 'q'

import { NextRequest, NextResponse } from 'next/server'
import { searchArticles, getPopularArticles } from '@/lib/help/helpService'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (query && query.trim().length > 0) {
      const results = await searchArticles(query.trim())
      return NextResponse.json(results)
    }

    // No query — return popular articles
    const popular = await getPopularArticles(10)
    return NextResponse.json(popular)
  } catch (error) {
    console.error('Help articles search error:', error)
    return NextResponse.json({ error: 'Failed to search articles' }, { status: 500 })
  }
}
