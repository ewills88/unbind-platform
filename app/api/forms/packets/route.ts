import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
// GET /api/forms/packets - List form packets
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const stateCode = searchParams.get('state_code')
    const casePhase = searchParams.get('case_phase')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('form_packets')
      .select('*')
      .order('display_order', { ascending: true })

    if (stateCode) {
      query = query.eq('state_code', stateCode)
    }
    if (casePhase) {
      query = query.eq('case_phase', casePhase)
    }

    const { data: packets, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // For each packet, fetch the actual forms
    if (packets && packets.length > 0) {
      // Collect all form IDs
      const allFormIds: string[] = []
      for (const packet of packets) {
        if (packet.form_ids) {
          allFormIds.push(...packet.form_ids)
        }
      }

      const uniqueFormIds = Array.from(new Set(allFormIds))

      if (uniqueFormIds.length > 0) {
        const { data: forms } = await supabase
          .from('court_forms')
          .select('*')
          .in('id', uniqueFormIds)

        // Attach forms to their packets
        for (const packet of packets) {
          packet.forms = (forms || []).filter((f: { id: string }) =>
            (packet.form_ids || []).includes(f.id)
          )
        }
      }
    }

    return NextResponse.json({ data: packets })
  } catch (error) {
    console.error('Form packets GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
