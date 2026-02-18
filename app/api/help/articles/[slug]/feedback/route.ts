// Session 25: Article Feedback API
// POST: submit feedback (requires auth)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { submitFeedback } from '@/lib/help/helpService'

async function getAuthenticatedUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params
    const body = await request.json()

    if (typeof body.is_helpful !== 'boolean') {
      return NextResponse.json({ error: 'is_helpful is required' }, { status: 400 })
    }

    // Use slug as article_id if it's a UUID, otherwise look up
    const articleId = slug
    const feedback = await submitFeedback(
      articleId,
      user.id,
      body.is_helpful,
      body.comment
    )

    return NextResponse.json(feedback)
  } catch (error) {
    console.error('Article feedback error:', error)
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
  }
}
