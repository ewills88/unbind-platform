import { NextRequest, NextResponse } from 'next/server'
import { acceptInvite } from '@/lib/portal/invitationService'

// POST /api/portal/auth/accept-invite — Client accepts invitation
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const result = await acceptInvite(token)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      session_token: result.session_token,
      user: result.user,
    })
  } catch (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
