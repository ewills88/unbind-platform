import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { CreateFirmRequest } from '@/types/firm'
import { getDefaultPermissions } from '@/lib/permissions'

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

// POST /api/firms/create - Create a new firm
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an attorney
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, current_firm_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only attorneys can create firms' }, { status: 403 })
    }

    if (profile.current_firm_id) {
      return NextResponse.json({ error: 'You are already a member of a firm' }, { status: 400 })
    }

    // Check not already an owner
    const { data: existingFirm } = await supabase
      .from('firms')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .single()

    if (existingFirm) {
      return NextResponse.json({ error: 'You already own a firm' }, { status: 400 })
    }

    const body: CreateFirmRequest = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Firm name is required' }, { status: 400 })
    }

    // Generate slug from name
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check slug uniqueness
    const { data: slugExists } = await supabase
      .from('firms')
      .select('id')
      .eq('slug', slug)
      .limit(1)
      .single()

    const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug

    // Create firm
    const { data: firm, error: firmError } = await supabase
      .from('firms')
      .insert({
        name: body.name.trim(),
        slug: finalSlug,
        owner_id: user.id,
        plan: body.plan || 'solo',
        address: body.address || null,
        phone: body.phone || null,
        email: body.email || null,
        website: body.website || null,
      })
      .select()
      .single()

    if (firmError) {
      console.error('Error creating firm:', firmError)
      return NextResponse.json({ error: 'Failed to create firm' }, { status: 500 })
    }

    // Create owner membership
    const { error: memberError } = await supabase
      .from('firm_members')
      .insert({
        firm_id: firm.id,
        user_id: user.id,
        role: 'owner',
        permissions: getDefaultPermissions('owner'),
        status: 'active',
        joined_at: new Date().toISOString(),
      })

    if (memberError) {
      console.error('Error creating owner membership:', memberError)
      // Clean up firm
      await supabase.from('firms').delete().eq('id', firm.id)
      return NextResponse.json({ error: 'Failed to create firm membership' }, { status: 500 })
    }

    // Update profile with current_firm_id
    await supabase
      .from('profiles')
      .update({ current_firm_id: firm.id })
      .eq('id', user.id)

    return NextResponse.json({ firm })
  } catch (error) {
    console.error('Firm creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
