import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processPaymentPlanInstallment } from '@/lib/portal/paymentService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/cron/process-payment-plans — process due payment plan installments
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Get payment plans due today with auto-charge enabled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: duePlans } = await (supabase as any)
      .from('payment_plans')
      .select('id')
      .eq('status', 'active')
      .eq('auto_charge', true)
      .eq('next_payment_date', today)

    if (!duePlans || duePlans.length === 0) {
      return NextResponse.json({ message: 'No plans due today', processed: 0 })
    }

    const results = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const plan of duePlans as any[]) {
      const result = await processPaymentPlanInstallment(plan.id)
      results.push({ planId: plan.id, ...result })
    }

    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      message: 'Processing complete',
      processed: results.length,
      succeeded,
      failed,
      results,
    })
  } catch (error) {
    console.error('Process payment plans error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
