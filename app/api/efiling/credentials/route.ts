import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { EFilingService, encryptCredentialFields } from '@/lib/efiling/efilingService'

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

// GET /api/efiling/credentials - List credentials for a firm
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const firmId = searchParams.get('firm_id')

    if (!firmId) {
      return NextResponse.json({ error: 'firm_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('efiling_credentials')
      .select(`
        id, provider, environment, display_name, firm_id,
        firm_id_at_provider, is_active, last_verified_at,
        last_error, settings, created_at, updated_at
      `)
      .eq('firm_id', firmId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch payment accounts for each credential
    const credIds = (data || []).map((c: { id: string }) => c.id)
    let paymentAccounts: Record<string, unknown[]> = {}

    if (credIds.length > 0) {
      const { data: accounts } = await supabase
        .from('efiling_payment_accounts')
        .select('*')
        .in('credential_id', credIds)
        .eq('is_active', true)

      paymentAccounts = (accounts || []).reduce((
        acc: Record<string, unknown[]>,
        a: { credential_id: string }
      ) => {
        if (!acc[a.credential_id]) acc[a.credential_id] = []
        acc[a.credential_id].push(a)
        return acc
      }, {})
    }

    const enriched = (data || []).map((cred: { id: string }) => ({
      ...cred,
      payment_accounts: paymentAccounts[cred.id] || [],
    }))

    return NextResponse.json({ data: enriched })
  } catch (error) {
    console.error('E-filing credentials GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/efiling/credentials - Add new credentials
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { firm_id, provider, environment, display_name, username, password, client_token, api_key, firm_id_at_provider, settings } = body

    if (!firm_id || !provider) {
      return NextResponse.json({ error: 'firm_id and provider are required' }, { status: 400 })
    }

    const encrypted = encryptCredentialFields({ username, password, client_token, api_key })

    const { data, error } = await supabase
      .from('efiling_credentials')
      .insert({
        firm_id,
        provider,
        environment: environment || 'production',
        display_name: display_name || `${provider} E-Filing`,
        ...encrypted,
        firm_id_at_provider: firm_id_at_provider || null,
        settings: settings || {},
        is_active: true,
        created_by: user.id,
      })
      .select('id, provider, environment, display_name, firm_id, firm_id_at_provider, is_active, settings, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Try to verify credentials
    let warning: string | null = null
    try {
      // Re-fetch full record for verification
      const { data: fullCred } = await supabase
        .from('efiling_credentials')
        .select('*')
        .eq('id', data.id)
        .single()

      if (fullCred) {
        const service = new EFilingService(fullCred)
        const result = await service.verifyCredentials()
        if (!result.success) {
          warning = `Credentials saved but verification failed: ${result.error}`
        }

        // Fetch payment accounts
        try {
          const accounts = await service.getPaymentAccounts()
          for (const account of accounts) {
            await supabase.from('efiling_payment_accounts').insert({
              credential_id: data.id,
              account_id_at_provider: account.id,
              account_name: account.name,
              account_type: account.type || 'credit_card',
              last_four: account.lastFour || null,
              is_default: account.isDefault || false,
              is_active: true,
            })
          }
        } catch {
          // Payment account fetch is optional
        }
      }
    } catch {
      warning = 'Credentials saved but could not verify'
    }

    return NextResponse.json({
      data,
      ...(warning ? { warning } : {}),
    }, { status: 201 })
  } catch (error) {
    console.error('E-filing credentials POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
