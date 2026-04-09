import { SupabaseClient } from '@supabase/supabase-js'

interface AssistantContextOptions {
  supabase: SupabaseClient
  userId: string
  audience: 'attorney' | 'client'
  caseId?: string
}

export async function getAssistantContext({
  supabase,
  userId,
  audience,
  caseId,
}: AssistantContextOptions): Promise<string> {
  if (audience === 'attorney') {
    return getAttorneyContext(supabase, userId, caseId)
  }
  return getClientContext(supabase, userId)
}

async function getAttorneyContext(
  supabase: SupabaseClient,
  userId: string,
  caseId?: string
): Promise<string> {
  const lines: string[] = []

  // Firm and attorney info
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, current_firm_id')
    .eq('id', userId)
    .single()

  let firmName = 'Unknown Firm'
  if (profile?.current_firm_id) {
    const { data: firm } = await supabase
      .from('firms')
      .select('name')
      .eq('id', profile.current_firm_id)
      .single()
    if (firm) firmName = firm.name
  }

  lines.push(`FIRM: ${firmName} | ATTORNEY: ${profile?.full_name || 'Unknown'}`)

  // Active cases count
  const { count: activeCases } = await supabase
    .from('cases')
    .select('id', { count: 'exact', head: true })
    .eq('attorney_id', userId)
    .eq('status', 'active')

  lines.push(`ACTIVE CASES: ${activeCases || 0}`)

  // Deadlines in next 7 days
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('title, start_date, case_id, cases!inner(client_name, spouse_name)')
    .eq('status', 'pending')
    .lte('start_date', nextWeek.toISOString())
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(10)

  if (upcomingEvents && upcomingEvents.length > 0) {
    lines.push(`DEADLINES THIS WEEK: ${upcomingEvents.length}`)
    for (const e of upcomingEvents) {
      const caseName = (e as Record<string, unknown>).cases
        ? `${((e as Record<string, unknown>).cases as Record<string, string>).client_name} v. ${((e as Record<string, unknown>).cases as Record<string, string>).spouse_name}`
        : 'Unknown case'
      const date = new Date(e.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      lines.push(`  - ${e.title} (${caseName}) — ${date}`)
    }
  } else {
    lines.push('DEADLINES THIS WEEK: 0')
  }

  // Outstanding invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('balance_due')
    .in('status', ['sent', 'viewed', 'overdue'])
    .gt('balance_due', 0)

  if (invoices && invoices.length > 0) {
    const total = invoices.reduce((s, i) => s + parseFloat(String(i.balance_due)), 0)
    lines.push(`OUTSTANDING INVOICES: ${invoices.length} invoices | $${total.toLocaleString()} total`)
  } else {
    lines.push('OUTSTANDING INVOICES: 0')
  }

  // Cases with no activity in 14 days
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const { data: staleCases } = await supabase
    .from('cases')
    .select('client_name, spouse_name, updated_at')
    .eq('attorney_id', userId)
    .eq('status', 'active')
    .lt('updated_at', twoWeeksAgo.toISOString())
    .limit(5)

  if (staleCases && staleCases.length > 0) {
    lines.push(`INACTIVE CASES (no activity 14+ days): ${staleCases.length}`)
    for (const c of staleCases) {
      lines.push(`  - ${c.client_name} v. ${c.spouse_name}`)
    }
  }

  // Case-specific context
  if (caseId) {
    lines.push('')
    lines.push('--- CURRENT CASE ---')

    const { data: caseData } = await supabase
      .from('cases')
      .select('client_name, spouse_name, status, case_type, state_code')
      .eq('id', caseId)
      .single()

    if (caseData) {
      lines.push(`CASE: ${caseData.client_name} v. ${caseData.spouse_name}`)
      lines.push(`STATUS: ${caseData.status} | TYPE: ${caseData.case_type || 'standard'} | STATE: ${caseData.state_code || 'N/A'}`)
    }

    // Open tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, due_date, status, priority')
      .eq('case_id', caseId)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true })
      .limit(10)

    if (tasks && tasks.length > 0) {
      const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date())
      lines.push(`OPEN TASKS: ${tasks.length} (${overdue.length} overdue)`)
      for (const t of tasks.slice(0, 5)) {
        const due = t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'no date'
        lines.push(`  - [${t.priority || 'medium'}] ${t.title} — due ${due}`)
      }
    }

    // Documents count
    const { count: docCount } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', caseId)

    lines.push(`DOCUMENTS: ${docCount || 0} uploaded`)

    // Last 3 messages
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('content, created_at, sender_id')
      .eq('case_id', caseId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(3)

    if (recentMessages && recentMessages.length > 0) {
      lines.push('RECENT MESSAGES:')
      for (const m of recentMessages) {
        const ago = getRelativeTime(m.created_at)
        const preview = m.content.length > 80 ? m.content.slice(0, 80) + '...' : m.content
        const who = m.sender_id === userId ? 'You' : 'Client'
        lines.push(`  - ${who} (${ago}): ${preview}`)
      }
    }

    // Discovery items
    const { data: discovery } = await supabase
      .from('discovery_requests')
      .select('title, request_type, response_deadline, status')
      .eq('case_id', caseId)
      .in('status', ['pending', 'in_progress'])
      .limit(5)

    if (discovery && discovery.length > 0) {
      lines.push(`OUTSTANDING DISCOVERY: ${discovery.length}`)
      for (const d of discovery) {
        const deadline = d.response_deadline
          ? new Date(d.response_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'no deadline'
        lines.push(`  - ${d.request_type}: ${d.title} — due ${deadline}`)
      }
    }

    // Most recent invoice
    const { data: caseInvoice } = await supabase
      .from('invoices')
      .select('status, balance_due, due_date')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (caseInvoice) {
      lines.push(`LATEST INVOICE: ${caseInvoice.status} — $${parseFloat(String(caseInvoice.balance_due)).toLocaleString()} due`)
    }
  }

  return lines.join('\n')
}

async function getClientContext(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const lines: string[] = []

  // Client profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()

  lines.push(`CLIENT: ${profile?.full_name || 'Unknown'}`)

  // Their case
  const { data: caseData } = await supabase
    .from('cases')
    .select('id, client_name, spouse_name, status, case_type, attorney_id')
    .eq('client_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!caseData) {
    lines.push('No active case found.')
    return lines.join('\n')
  }

  lines.push(`CASE: ${caseData.client_name} v. ${caseData.spouse_name}`)
  lines.push(`STATUS: ${caseData.status} | TYPE: ${caseData.case_type || 'divorce'}`)

  // Attorney name
  const { data: attorney } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', caseData.attorney_id)
    .single()

  if (attorney) {
    lines.push(`YOUR ATTORNEY: ${attorney.full_name}`)
  }

  // Next deadline/appointment
  const { data: nextEvent } = await supabase
    .from('events')
    .select('title, start_date')
    .eq('case_id', caseData.id)
    .eq('status', 'pending')
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(1)
    .single()

  if (nextEvent) {
    const date = new Date(nextEvent.start_date).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    })
    lines.push(`NEXT UPCOMING: ${nextEvent.title} — ${date}`)
  }

  // Incomplete tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, due_date')
    .eq('case_id', caseData.id)
    .eq('assigned_to', userId)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true })
    .limit(5)

  if (tasks && tasks.length > 0) {
    lines.push(`YOUR INCOMPLETE TASKS: ${tasks.length}`)
    for (const t of tasks) {
      const due = t.due_date
        ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'no date'
      lines.push(`  - ${t.title} — due ${due}`)
    }
  }

  // Outstanding invoice balance
  const { data: invoices } = await supabase
    .from('invoices')
    .select('balance_due')
    .eq('case_id', caseData.id)
    .in('status', ['sent', 'viewed', 'overdue'])
    .gt('balance_due', 0)

  if (invoices && invoices.length > 0) {
    const total = invoices.reduce((s, i) => s + parseFloat(String(i.balance_due)), 0)
    lines.push(`OUTSTANDING BALANCE: $${total.toLocaleString()}`)
  }

  return lines.join('\n')
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
