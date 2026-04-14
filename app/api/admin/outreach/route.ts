import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { client: supabase, user } = await getAuthenticatedClient(request)
  if (!user || !supabase || user.email !== process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [leadsRes, todayRes, weekRes] = await Promise.all([
    supabase.from('outreach_leads').select('*').order('created_at', { ascending: false }),
    supabase.from('outreach_emails_sent').select('id', { count: 'exact', head: true }).gte('sent_at', todayStart),
    supabase.from('outreach_emails_sent').select('id', { count: 'exact', head: true }).gte('sent_at', weekStart),
  ])

  const leads = leadsRes.data || []

  const stats = {
    total: leads.length,
    emailsSentToday: todayRes.count || 0,
    emailsSentWeek: weekRes.count || 0,
    activeInSequence: leads.filter(l => l.status === 'in_sequence').length,
    demosBooked: leads.filter(l => l.demo_booked).length,
    converted: leads.filter(l => l.converted).length,
  }

  return NextResponse.json({ leads, stats })
}

export async function PATCH(request: NextRequest) {
  const { client: supabase, user } = await getAuthenticatedClient(request)
  if (!user || !supabase || user.email !== process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'Lead ID required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('outreach_leads')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
