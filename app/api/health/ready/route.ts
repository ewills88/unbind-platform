import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Kubernetes readiness probe
  // Returns 200 when app is ready to receive traffic
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    })

    if (!response.ok) {
      throw new Error('Database not ready')
    }

    return NextResponse.json({ ready: true })
  } catch (error) {
    return NextResponse.json(
      { ready: false, error: error instanceof Error ? error.message : 'Not ready' },
      { status: 503 }
    )
  }
}
