import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
import { exec } from 'child_process'

export async function POST(request: NextRequest) {
  const { client: supabase, user } = await getAuthenticatedClient(request)
  if (!user || !supabase || user.email !== process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  return new Promise<NextResponse>((resolve) => {
    exec('npx tsx scripts/email-scheduler.ts', { timeout: 300000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Scheduler error:', stderr)
        resolve(NextResponse.json({ error: 'Scheduler failed', details: stderr.slice(0, 500) }, { status: 500 }))
      } else {
        resolve(NextResponse.json({ success: true, output: stdout.slice(-1000) }))
      }
    })
  })
}
