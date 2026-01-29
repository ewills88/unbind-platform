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

interface RouteParams {
  params: Promise<{ messageId: string }>
}

/**
 * PATCH /api/messages/[messageId]/read
 * Mark a message as read
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messageId } = await params

    if (!messageId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Message ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to the message (via case access)
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('id, case_id, sender_id')
      .eq('id', messageId)
      .single()

    if (msgError || !message) {
      return NextResponse.json(
        { error: 'Not Found', details: 'Message not found or access denied' },
        { status: 404 }
      )
    }

    // Don't mark own messages as read (already read by sender)
    if (message.sender_id === user.id) {
      return NextResponse.json({
        success: true,
        message: 'Own message - already read'
      })
    }

    // Check if already read
    const { data: existingRead } = await supabase
      .from('message_reads')
      .select('read_at')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .single()

    if (existingRead) {
      return NextResponse.json({
        success: true,
        message: 'Already marked as read',
        read_at: existingRead.read_at
      })
    }

    // Mark as read
    const { data: readRecord, error: insertError } = await supabase
      .from('message_reads')
      .insert({
        message_id: messageId,
        user_id: user.id
      })
      .select('read_at')
      .single()

    if (insertError) {
      console.error('Error marking message as read:', insertError)
      return NextResponse.json(
        { error: 'Failed to mark as read', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      read_at: readRecord.read_at
    })

  } catch (error) {
    console.error('Mark read API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
