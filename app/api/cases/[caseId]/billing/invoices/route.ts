import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/cases/[caseId]/billing/invoices - List invoices for case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Verify access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, client_id')
      .eq('id', caseId)
      .single()

    if (!caseData || (caseData.attorney_id !== user.id && caseData.client_id !== user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('invoices')
      .select(`
        *,
        line_items:invoice_line_items(*)
      `)
      .eq('case_id', caseId)
      .order('issue_date', { ascending: false })

    // Clients can only see non-draft invoices
    if (caseData.client_id === user.id) {
      query = query.neq('status', 'draft')
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: invoices, error } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }

    // Calculate summary
    const totalInvoiced = invoices?.reduce((sum, i) => sum + Number(i.total_amount), 0) || 0
    const totalPaid = invoices?.reduce((sum, i) => sum + Number(i.amount_paid), 0) || 0
    const totalOutstanding = invoices?.filter(i => !['paid', 'void'].includes(i.status))
      .reduce((sum, i) => sum + Number(i.balance_due), 0) || 0

    return NextResponse.json({
      invoices,
      summary: {
        total_invoices: invoices?.length || 0,
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        total_outstanding: totalOutstanding
      }
    })
  } catch (error) {
    console.error('Invoices GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/billing/invoices - Generate invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()

    // Verify attorney access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, case_number, client_name')
      .eq('id', caseId)
      .single()

    if (!caseData || caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Only attorneys can generate invoices' }, { status: 403 })
    }

    // Get billing settings
    const { data: settings } = await supabase
      .from('attorney_billing_settings')
      .select('*')
      .eq('attorney_id', user.id)
      .single()

    // Generate invoice number
    const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number', {
      p_attorney_id: user.id
    })

    // Get unbilled time entries (or specific IDs if provided)
    let timeQuery = supabase
      .from('time_entries')
      .select('*')
      .eq('case_id', caseId)
      .eq('billable', true)
      .is('billed_at', null)

    if (body.time_entry_ids && body.time_entry_ids.length > 0) {
      timeQuery = timeQuery.in('id', body.time_entry_ids)
    }

    const { data: timeEntries } = await timeQuery

    // Get unbilled expenses (or specific IDs if provided)
    let expenseQuery = supabase
      .from('expenses')
      .select('*')
      .eq('case_id', caseId)
      .eq('billable', true)
      .is('billed_at', null)

    if (body.expense_ids && body.expense_ids.length > 0) {
      expenseQuery = expenseQuery.in('id', body.expense_ids)
    }

    const { data: expenses } = await expenseQuery

    // Check if there's anything to invoice
    if ((!timeEntries || timeEntries.length === 0) && (!expenses || expenses.length === 0)) {
      return NextResponse.json({ error: 'No unbilled items to invoice' }, { status: 400 })
    }

    // Calculate totals
    const subtotalServices = timeEntries?.reduce((sum, t) => sum + Number(t.amount), 0) || 0
    const subtotalExpenses = expenses?.reduce((sum, e) => sum + Number(e.billed_amount || e.amount), 0) || 0
    const subtotal = subtotalServices + subtotalExpenses

    const taxRate = body.tax_rate || settings?.default_tax_rate || 0
    const taxAmount = subtotal * (taxRate / 100)

    const retainerApplied = body.retainer_applied || 0
    const totalAmount = subtotal + taxAmount - retainerApplied

    // Calculate due date
    const issueDate = body.issue_date || new Date().toISOString().split('T')[0]
    const termsDays = settings?.default_payment_terms_days || 30
    const dueDate = body.due_date || (() => {
      const date = new Date(issueDate)
      date.setDate(date.getDate() + termsDays)
      return date.toISOString().split('T')[0]
    })()

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        case_id: caseId,
        invoice_number: invoiceNumber,
        issue_date: issueDate,
        due_date: dueDate,
        status: 'draft',
        subtotal_services: subtotalServices,
        subtotal_expenses: subtotalExpenses,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        retainer_applied: retainerApplied,
        total_amount: totalAmount,
        amount_paid: 0,
        balance_due: totalAmount,
        notes: body.notes,
        payment_instructions: settings?.firm_name ?
          `Please make payment to ${settings.firm_name}` : undefined,
        created_by: user.id
      })
      .select()
      .single()

    if (invoiceError || !invoice) {
      console.error('Error creating invoice:', invoiceError)
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }

    // Create line items for time entries
    const lineItems = []
    let sortOrder = 0

    for (const entry of timeEntries || []) {
      lineItems.push({
        invoice_id: invoice.id,
        item_type: 'time_entry',
        line_date: entry.entry_date,
        description: `${entry.activity_type.replace(/_/g, ' ')}: ${entry.description}`,
        quantity: Number((entry.duration_minutes / 60).toFixed(2)),
        rate: Number(entry.hourly_rate),
        amount: Number(entry.amount),
        reference_id: entry.id,
        sort_order: sortOrder++
      })
    }

    // Create line items for expenses
    for (const expense of expenses || []) {
      lineItems.push({
        invoice_id: invoice.id,
        item_type: 'expense',
        line_date: expense.expense_date,
        description: `${expense.expense_type.replace(/_/g, ' ')}: ${expense.description}`,
        quantity: 1,
        rate: Number(expense.billed_amount || expense.amount),
        amount: Number(expense.billed_amount || expense.amount),
        reference_id: expense.id,
        sort_order: sortOrder++
      })
    }

    // Insert line items
    if (lineItems.length > 0) {
      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItems)

      if (lineItemsError) {
        console.error('Error creating line items:', lineItemsError)
      }
    }

    // Mark time entries and expenses as billed
    const now = new Date().toISOString()

    if (timeEntries && timeEntries.length > 0) {
      await supabase
        .from('time_entries')
        .update({ billed_at: now, invoice_id: invoice.id })
        .in('id', timeEntries.map(t => t.id))
    }

    if (expenses && expenses.length > 0) {
      await supabase
        .from('expenses')
        .update({ billed_at: now, invoice_id: invoice.id })
        .in('id', expenses.map(e => e.id))
    }

    // Fetch complete invoice with line items
    const { data: completeInvoice } = await supabase
      .from('invoices')
      .select(`
        *,
        line_items:invoice_line_items(*)
      `)
      .eq('id', invoice.id)
      .single()

    return NextResponse.json({
      invoice: completeInvoice,
      time_entries_billed: timeEntries?.length || 0,
      expenses_billed: expenses?.length || 0,
      message: 'Invoice generated successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Invoices POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/billing/invoices - Update invoice
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params
    const body = await request.json()
    const { invoice_id, action, ...updates } = body

    if (!invoice_id) {
      return NextResponse.json({ error: 'invoice_id is required' }, { status: 400 })
    }

    // Verify attorney access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id')
      .eq('id', caseId)
      .single()

    if (!caseData || caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Only attorneys can update invoices' }, { status: 403 })
    }

    // Get existing invoice
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .eq('case_id', caseId)
      .single()

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Handle specific actions
    if (action === 'send') {
      // Mark as sent
      const { data: invoice, error } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', invoice_id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to send invoice' }, { status: 500 })
      }

      return NextResponse.json({ invoice, message: 'Invoice marked as sent' })
    }

    if (action === 'void') {
      if (existingInvoice.status === 'paid') {
        return NextResponse.json({ error: 'Cannot void a paid invoice' }, { status: 400 })
      }

      // Unmark time entries and expenses
      await supabase
        .from('time_entries')
        .update({ billed_at: null, invoice_id: null })
        .eq('invoice_id', invoice_id)

      await supabase
        .from('expenses')
        .update({ billed_at: null, invoice_id: null })
        .eq('invoice_id', invoice_id)

      const { data: invoice, error } = await supabase
        .from('invoices')
        .update({ status: 'void' })
        .eq('id', invoice_id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to void invoice' }, { status: 500 })
      }

      return NextResponse.json({ invoice, message: 'Invoice voided' })
    }

    if (action === 'mark_viewed') {
      if (!existingInvoice.viewed_at) {
        await supabase
          .from('invoices')
          .update({
            status: existingInvoice.status === 'sent' ? 'viewed' : existingInvoice.status,
            viewed_at: new Date().toISOString()
          })
          .eq('id', invoice_id)
      }
      return NextResponse.json({ success: true })
    }

    // Regular updates (only for draft invoices)
    if (existingInvoice.status !== 'draft') {
      return NextResponse.json({ error: 'Can only update draft invoices' }, { status: 400 })
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', invoice_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating invoice:', error)
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Invoices PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
