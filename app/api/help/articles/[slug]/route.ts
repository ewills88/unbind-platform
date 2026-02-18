// Session 25: Help Article by Slug API
// GET: single article by slug

import { NextResponse } from 'next/server'
import { getArticleBySlug } from '@/lib/help/helpService'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params
    const article = await getArticleBySlug(slug)
    return NextResponse.json(article)
  } catch (error) {
    console.error('Help article fetch error:', error)
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }
}
