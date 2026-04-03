import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/proposals/[id]/terms - Save spousal support, child support, custody, or other terms
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { _type, ...termData } = body

    if (_type === 'spousal_support') {
      // Upsert: delete existing and insert new
      await supabase
        .from('proposal_spousal_support')
        .delete()
        .eq('proposal_id', id)

      if (termData.support_type !== 'none') {
        const { data, error } = await supabase
          .from('proposal_spousal_support')
          .insert({ proposal_id: id, ...termData })
          .select()
          .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Update proposal summary totals
        await supabase
          .from('settlement_proposals')
          .update({
            monthly_support_husband_pays: termData.payor === 'husband' ? termData.monthly_amount : 0,
            monthly_support_wife_pays: termData.payor === 'wife' ? termData.monthly_amount : 0,
            support_duration_months: termData.duration_months || null,
          })
          .eq('id', id)

        return NextResponse.json({ data })
      }

      // Cleared support - update proposal
      await supabase
        .from('settlement_proposals')
        .update({
          monthly_support_husband_pays: 0,
          monthly_support_wife_pays: 0,
          support_duration_months: null,
        })
        .eq('id', id)

      return NextResponse.json({ data: null })
    }

    if (_type === 'child_support') {
      await supabase
        .from('proposal_child_support')
        .delete()
        .eq('proposal_id', id)

      const { data, error } = await supabase
        .from('proposal_child_support')
        .insert({ proposal_id: id, ...termData })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    if (_type === 'custody') {
      await supabase
        .from('proposal_custody')
        .delete()
        .eq('proposal_id', id)

      const { data, error } = await supabase
        .from('proposal_custody')
        .insert({ proposal_id: id, ...termData })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    if (_type === 'other_term') {
      const { data, error } = await supabase
        .from('proposal_other_terms')
        .insert({ proposal_id: id, ...termData })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    if (_type === 'other_terms_bulk') {
      await supabase
        .from('proposal_other_terms')
        .delete()
        .eq('proposal_id', id)

      const termsArray = termData.terms || []
      if (termsArray.length > 0) {
        const insertData = termsArray.map((t: Record<string, unknown>, i: number) => ({
          proposal_id: id,
          ...t,
          display_order: i,
        }))
        await supabase.from('proposal_other_terms').insert(insertData)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid _type' }, { status: 400 })
  } catch (error) {
    console.error('Terms save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/proposals/[id]/terms?type=other_term&term_id=xxx
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await params
    const { searchParams } = new URL(request.url)
    const termId = searchParams.get('term_id')

    if (!termId) {
      return NextResponse.json({ error: 'term_id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('proposal_other_terms')
      .delete()
      .eq('id', termId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Term delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
