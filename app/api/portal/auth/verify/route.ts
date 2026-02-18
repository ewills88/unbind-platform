import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/portal/auth/verify — verify a magic link token
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const supabase = getServiceClient()

    // Find the token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: accessToken } = await (supabase as any)
      .from('portal_access_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .is('used_at', null)
      .is('revoked_at', null)
      .single()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Check expiry
    if (new Date(accessToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token has expired. Please request a new login link.' },
        { status: 401 }
      )
    }

    // Mark token as used
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('portal_access_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', accessToken.id)

    // Create a session
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabase as any)
      .from('client_sessions')
      .insert({
        user_id: accessToken.user_id,
        session_token: crypto.createHash('sha256').update(sessionToken).digest('hex'),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
        device_type: detectDeviceType(request.headers.get('user-agent') || ''),
        expires_at: sessionExpiry.toISOString(),
      })
      .select()
      .single()

    // Update login history with session
    if (session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_login_history').insert({
        user_id: accessToken.user_id,
        login_method: 'magic_link',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
        device_type: detectDeviceType(request.headers.get('user-agent') || ''),
        success: true,
        session_id: session.id,
      })
    }

    // Log portal login activity
    if (accessToken.case_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('case_activity_log').insert({
        case_id: accessToken.case_id,
        user_id: accessToken.user_id,
        activity_type: 'portal_login',
        title: 'Client logged into portal',
        description: 'Client accessed the portal via magic link',
        is_visible_to_client: false,
      })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', accessToken.user_id)
      .single()

    return NextResponse.json({
      success: true,
      session_token: sessionToken,
      user: profile ? {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
      } : null,
    })
  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
  const ua = userAgent.toLowerCase()
  if (/ipad|tablet|playbook|silk/.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) return 'mobile'
  return 'desktop'
}
