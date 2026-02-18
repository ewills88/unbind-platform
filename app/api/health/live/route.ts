import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Kubernetes liveness probe
  // Returns 200 if the application is running
  return NextResponse.json({
    alive: true,
    timestamp: new Date().toISOString(),
  })
}
