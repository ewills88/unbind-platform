import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  getFirmSettings,
  updateFirmProfile,
  updateBillingSettings,
  updateCaseSettings,
  updateNotificationSettings,
} from '@/lib/admin/firmSettingsService'
import { logAudit } from '@/lib/admin/auditService'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { client: null, user: null }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: { headers: { cookie: cookieStore.toString() } },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { client: null, user: null }
  return { client: supabase, user }
}

// GET /api/admin/settings
export async function GET() {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'No firm' }, { status: 400 })
    }

    // Check admin access
    const { data: membership } = await supabase
      .from('firm_members')
      .select('role, is_admin, permissions, status')
      .eq('firm_id', profile.current_firm_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isAdmin = membership.role === 'owner' || membership.is_admin ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (membership.permissions as any)?.settings?.view

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const settings = await getFirmSettings(supabase, profile.current_firm_id)
    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('Admin settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/settings
export async function PATCH(req: Request) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_firm_id) {
      return NextResponse.json({ error: 'No firm' }, { status: 400 })
    }

    const { data: membership } = await supabase
      .from('firm_members')
      .select('role, is_admin, permissions, status')
      .eq('firm_id', profile.current_firm_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const isAdmin = membership.role === 'owner' || membership.is_admin ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (membership.permissions as any)?.settings?.edit

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { section, updates } = await req.json()
    const firmId = profile.current_firm_id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any

    switch (section) {
      case 'profile':
        result = await updateFirmProfile(supabase, firmId, updates)
        break
      case 'billing':
        result = await updateBillingSettings(supabase, firmId, updates)
        break
      case 'cases':
        result = await updateCaseSettings(supabase, firmId, updates)
        break
      case 'notifications':
        result = await updateNotificationSettings(supabase, firmId, updates)
        break
      default:
        return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }

    await logAudit({
      firmId,
      userId: user.id,
      action: 'update',
      entityType: `firm_${section}_settings`,
      entityId: firmId,
      entityName: `Firm ${section} settings`,
      changes: { after: updates },
    }).catch(() => {})

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Admin settings PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
