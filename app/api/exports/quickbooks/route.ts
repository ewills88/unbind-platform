import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { generateQuickBooksExport } from '@/lib/exports/quickbooksExport'
import { ExportFormat } from '@/types/webhooks'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { client: null, user: null }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: { headers: { cookie: cookieStore.toString() } }
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { client: null, user: null }
  return { client: supabase, user }
}

// POST - Generate a QuickBooks export
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const format = (body.format || 'csv') as ExportFormat
    if (!['csv', 'iif', 'qbo'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

    if (!body.startDate || !body.endDate) {
      return NextResponse.json({ error: 'Start date and end date required' }, { status: 400 })
    }

    // Get user's firm
    const { data: member } = await supabase
      .from('firm_members')
      .select('firm_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    const result = await generateQuickBooksExport({
      userId: user.id,
      firmId: member?.firm_id || null,
      startDate: body.startDate,
      endDate: body.endDate,
      format,
      includeInvoices: body.includeInvoices !== false,
      includePayments: body.includePayments !== false,
      includeTimeEntries: body.includeTimeEntries !== false,
    })

    // Return file as download
    return new NextResponse(result.content, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
      },
    })
  } catch (error) {
    console.error('QuickBooks export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - List export history
export async function GET() {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: exports, error } = await supabase
      .from('accounting_exports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ exports: exports || [] })
  } catch (error) {
    console.error('Exports GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
