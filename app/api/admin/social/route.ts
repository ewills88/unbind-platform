import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { client: supabase, user } = await getAuthenticatedClient(request)
  if (!user || !supabase || user.email !== process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('*')
    .order('scheduled_for', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ posts: posts || [] })
}

export async function POST(request: NextRequest) {
  const { client: supabase, user } = await getAuthenticatedClient(request)
  if (!user || !supabase || user.email !== process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { platform, content, scheduled_for, status } = body

  if (!platform || !content) {
    return NextResponse.json({ error: 'Platform and content required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('social_posts')
    .insert({
      platform,
      content,
      scheduled_for: scheduled_for || null,
      status: status || 'scheduled',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ post: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const { client: supabase, user } = await getAuthenticatedClient(request)
  if (!user || !supabase || user.email !== process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('social_posts')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
