import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

// GET /api/cases/[caseId]/trust - Get trust account with transactions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    // Verify case access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id, case_number, client_name')
      .eq('id', caseId)
      .single()

    if (!caseData || caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get trust account
    let { data: trustAccount } = await supabase
      .from('trust_accounts')
      .select('*')
      .eq('case_id', caseId)
      .single()

    // Create trust account if it doesn't exist
    if (!trustAccount) {
      const { data: newAccount, error: createError } = await supabase
        .from('trust_accounts')
        .insert({
          case_id: caseId,
          opening_balance: 0,
          current_balance: 0
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating trust account:', createError)
        return NextResponse.json(
          { error: 'Failed to create trust account' },
          { status: 500 }
        )
      }

      trustAccount = newAccount
    }

    // Get transactions
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: transactions, error: txError } = await supabase
      .from('trust_transactions')
      .select(`
        *,
        invoice:invoices(id, invoice_number),
        payment:payments(id, amount)
      `)
      .eq('trust_account_id', trustAccount.id)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (txError) {
      console.error('Error fetching transactions:', txError)
    }

    return NextResponse.json({
      trust_account: {
        ...trustAccount,
        case: caseData
      },
      transactions: transactions || []
    })
  } catch (error) {
    console.error('Trust account GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/trust - Add transaction (deposit/withdrawal)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { caseId } = await params

    // Verify case access
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, attorney_id')
      .eq('id', caseId)
      .single()

    if (!caseData || caseData.attorney_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { action, amount, description, invoice_id, check_number } = body

    if (!action || !amount) {
      return NextResponse.json(
        { error: 'action and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Get or create trust account
    let { data: trustAccount } = await supabase
      .from('trust_accounts')
      .select('*')
      .eq('case_id', caseId)
      .single()

    if (!trustAccount) {
      const { data: newAccount } = await supabase
        .from('trust_accounts')
        .insert({
          case_id: caseId,
          opening_balance: 0,
          current_balance: 0
        })
        .select()
        .single()

      trustAccount = newAccount
    }

    if (!trustAccount) {
      return NextResponse.json(
        { error: 'Failed to access trust account' },
        { status: 500 }
      )
    }

    let newBalance: number
    let transactionType: string

    switch (action) {
      case 'deposit': {
        transactionType = 'deposit'
        newBalance = trustAccount.current_balance + amount

        // Create transaction
        const { data: transaction, error: txError } = await supabase
          .from('trust_transactions')
          .insert({
            trust_account_id: trustAccount.id,
            case_id: caseId,
            transaction_type: transactionType,
            amount: amount,
            balance_after: newBalance,
            description: description || `Retainer deposit${check_number ? ` - Check #${check_number}` : ''}`,
            created_by: user.id
          })
          .select()
          .single()

        if (txError) {
          console.error('Error creating transaction:', txError)
          return NextResponse.json(
            { error: 'Failed to record transaction' },
            { status: 500 }
          )
        }

        // Update trust account
        await supabase
          .from('trust_accounts')
          .update({
            current_balance: newBalance,
            total_deposits: trustAccount.total_deposits + amount,
            last_transaction_date: new Date().toISOString()
          })
          .eq('id', trustAccount.id)

        return NextResponse.json({
          transaction,
          trust_account: {
            ...trustAccount,
            current_balance: newBalance,
            total_deposits: trustAccount.total_deposits + amount
          },
          message: 'Deposit recorded successfully'
        })
      }

      case 'withdrawal': {
        transactionType = 'withdrawal'

        // Check sufficient balance
        if (amount > trustAccount.current_balance) {
          return NextResponse.json(
            { error: `Insufficient balance. Available: $${trustAccount.current_balance.toFixed(2)}` },
            { status: 400 }
          )
        }

        newBalance = trustAccount.current_balance - amount

        // Create transaction
        const { data: transaction, error: txError } = await supabase
          .from('trust_transactions')
          .insert({
            trust_account_id: trustAccount.id,
            case_id: caseId,
            transaction_type: transactionType,
            amount: amount,
            balance_after: newBalance,
            description: description || 'Withdrawal to operating account',
            reference_invoice_id: invoice_id || null,
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            created_by: user.id
          })
          .select()
          .single()

        if (txError) {
          console.error('Error creating transaction:', txError)
          return NextResponse.json(
            { error: 'Failed to record transaction' },
            { status: 500 }
          )
        }

        // Update trust account
        await supabase
          .from('trust_accounts')
          .update({
            current_balance: newBalance,
            total_withdrawals: trustAccount.total_withdrawals + amount,
            last_transaction_date: new Date().toISOString()
          })
          .eq('id', trustAccount.id)

        return NextResponse.json({
          transaction,
          trust_account: {
            ...trustAccount,
            current_balance: newBalance,
            total_withdrawals: trustAccount.total_withdrawals + amount
          },
          message: 'Withdrawal recorded successfully'
        })
      }

      case 'earn_against_invoice': {
        if (!invoice_id) {
          return NextResponse.json(
            { error: 'invoice_id is required for earning retainer' },
            { status: 400 }
          )
        }

        // Get invoice
        const { data: invoice } = await supabase
          .from('invoices')
          .select('id, invoice_number, total_amount, balance_due, retainer_applied, status')
          .eq('id', invoice_id)
          .single()

        if (!invoice) {
          return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        if (invoice.status === 'paid') {
          return NextResponse.json(
            { error: 'Invoice is already paid' },
            { status: 400 }
          )
        }

        // Determine amount to earn
        const amountToEarn = Math.min(
          amount || invoice.balance_due,
          trustAccount.current_balance,
          invoice.balance_due
        )

        if (amountToEarn <= 0) {
          return NextResponse.json(
            { error: 'No funds available to apply or invoice has no balance due' },
            { status: 400 }
          )
        }

        newBalance = trustAccount.current_balance - amountToEarn

        // Create transaction
        const { data: transaction, error: txError } = await supabase
          .from('trust_transactions')
          .insert({
            trust_account_id: trustAccount.id,
            case_id: caseId,
            transaction_type: 'withdrawal',
            amount: amountToEarn,
            balance_after: newBalance,
            description: `Earned against Invoice ${invoice.invoice_number}`,
            reference_invoice_id: invoice_id,
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            created_by: user.id
          })
          .select()
          .single()

        if (txError) {
          console.error('Error creating transaction:', txError)
          return NextResponse.json(
            { error: 'Failed to record transaction' },
            { status: 500 }
          )
        }

        // Update trust account
        await supabase
          .from('trust_accounts')
          .update({
            current_balance: newBalance,
            total_withdrawals: trustAccount.total_withdrawals + amountToEarn,
            last_transaction_date: new Date().toISOString()
          })
          .eq('id', trustAccount.id)

        // Update invoice
        const newRetainerApplied = (invoice.retainer_applied || 0) + amountToEarn
        const newBalanceDue = invoice.balance_due - amountToEarn
        const newStatus = newBalanceDue <= 0 ? 'paid' : invoice.status

        await supabase
          .from('invoices')
          .update({
            retainer_applied: newRetainerApplied,
            amount_paid: (invoice.total_amount - invoice.balance_due) + amountToEarn,
            balance_due: Math.max(0, newBalanceDue),
            status: newStatus,
            paid_at: newStatus === 'paid' ? new Date().toISOString() : null
          })
          .eq('id', invoice_id)

        return NextResponse.json({
          transaction,
          amount_applied: amountToEarn,
          trust_account: {
            ...trustAccount,
            current_balance: newBalance
          },
          invoice: {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            balance_due: Math.max(0, newBalanceDue),
            status: newStatus
          },
          message: `Applied $${amountToEarn.toFixed(2)} from retainer to invoice`
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: deposit, withdrawal, or earn_against_invoice' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Trust account POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
