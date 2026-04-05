import { NextRequest, NextResponse } from 'next/server'
import { AssetFormData, Asset } from '@/types/financial'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// GET /api/cases/[caseId]/assets - List all assets for a case
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
    const category = searchParams.get('category')
    const ownership = searchParams.get('ownership')

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Build query
    let query = supabase
      .from('assets')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    if (ownership) {
      query = query.eq('ownership', ownership)
    }

    const { data: assets, error } = await query

    if (error) {
      console.error('Error fetching assets:', error)
      return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
    }

    // Calculate totals
    const totalValue = (assets as Asset[] || []).reduce((sum: number, a: Asset) => sum + Number(a.estimated_value), 0)

    return NextResponse.json({
      assets: assets || [],
      total_value: totalValue,
      count: assets?.length || 0,
    })
  } catch (error) {
    console.error('Error in assets GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cases/[caseId]/assets - Create a new asset
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
    const body: AssetFormData = await request.json()

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Create the asset
    const { data: asset, error } = await supabase
      .from('assets')
      .insert({
        case_id: caseId,
        category: body.category,
        name: body.name,
        description: body.description || null,
        estimated_value: body.estimated_value,
        date_acquired: body.date_acquired || null,
        ownership: body.ownership,
        supporting_documents: body.supporting_documents || [],
        notes: body.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating asset:', error)
      return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
    }

    return NextResponse.json({ asset }, { status: 201 })
  } catch (error) {
    console.error('Error in assets POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/cases/[caseId]/assets - Update an asset
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
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 })
    }

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Update the asset
    const { data: asset, error } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', id)
      .eq('case_id', caseId)
      .select()
      .single()

    if (error) {
      console.error('Error updating asset:', error)
      return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
    }

    return NextResponse.json({ asset })
  } catch (error) {
    console.error('Error in assets PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/cases/[caseId]/assets - Delete an asset
export async function DELETE(
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
    const assetId = searchParams.get('id')

    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 })
    }

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .or(`attorney_id.eq.${user.id},client_id.eq.${user.id}`)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Delete the asset
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', assetId)
      .eq('case_id', caseId)

    if (error) {
      console.error('Error deleting asset:', error)
      return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in assets DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
