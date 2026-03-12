import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { inviteClient, revokeClientAccess, getInviteStatus, resendInvite } from '@/lib/portal/invitationService'

async function getAuthenticatedUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return null
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
  if (error || !user) return null
  return user
}

// POST /api/clients/invite — Send client invitation
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId, clientEmail, clientName, resend } = await request.json()

    if (resend && caseId) {
      const result = await resendInvite(user.id, caseId)
      return NextResponse.json(result, { status: result.success ? 200 : 400 })
    }

    if (!caseId || !clientEmail) {
      return NextResponse.json({ error: 'caseId and clientEmail are required' }, { status: 400 })
    }

    const result = await inviteClient(user.id, { caseId, clientEmail, clientName })
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('Client invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/clients/invite — Revoke client access
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await request.json()
    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
    }

    const result = await revokeClientAccess(user.id, caseId)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('Revoke access error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/clients/invite?caseId=xxx — Check invite status
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const caseId = request.nextUrl.searchParams.get('caseId')
    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
    }

    const status = await getInviteStatus(caseId)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Get invite status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
