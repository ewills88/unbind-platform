import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Create authenticated Supabase client
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

/**
 * POST /api/messages/mark-read
 * Batch mark multiple messages as read
 * Body: { message_ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const messageIds: string[] = body.message_ids

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'message_ids array is required' },
        { status: 400 }
      )
    }

    // Limit batch size
    if (messageIds.length > 100) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Maximum 100 messages per batch' },
        { status: 400 }
      )
    }

    // Verify user has access to these messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, sender_id')
      .in('id', messageIds)

    if (msgError) {
      console.error('Error verifying messages:', msgError)
      return NextResponse.json(
        { error: 'Failed to verify messages', details: msgError.message },
        { status: 500 }
      )
    }

    // Filter out own messages and already processed
    const messagesToMark = messages?.filter(m => m.sender_id !== user.id) || []

    if (messagesToMark.length === 0) {
      return NextResponse.json({
        success: true,
        marked_count: 0
      })
    }

    // Check which are already read
    const { data: existingReads } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('user_id', user.id)
      .in('message_id', messagesToMark.map(m => m.id))

    const alreadyRead = new Set(existingReads?.map(r => r.message_id) || [])
    const newToMark = messagesToMark.filter(m => !alreadyRead.has(m.id))

    if (newToMark.length === 0) {
      return NextResponse.json({
        success: true,
        marked_count: 0
      })
    }

    // Insert read records
    const { error: insertError } = await supabase
      .from('message_reads')
      .insert(
        newToMark.map(m => ({
          message_id: m.id,
          user_id: user.id
        }))
      )

    if (insertError) {
      console.error('Error marking messages as read:', insertError)
      return NextResponse.json(
        { error: 'Failed to mark as read', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      marked_count: newToMark.length
    })

  } catch (error) {
    console.error('Batch mark read API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
