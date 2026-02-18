// Session 25: Beta Signup API
// POST: public beta signup, validates with Zod

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const betaSignupSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required').max(200),
  firm_name: z.string().max(200).optional(),
  role: z.string().max(100).optional(),
  firm_size: z.string().max(50).optional(),
  practice_areas: z.array(z.string()).optional(),
  message: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = betaSignupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('beta_signups')
      .insert({
        email: parsed.data.email,
        name: parsed.data.name,
        firm_name: parsed.data.firm_name || null,
        role: parsed.data.role || null,
        firm_size: parsed.data.firm_size || null,
        practice_areas: parsed.data.practice_areas || [],
        message: parsed.data.message || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This email has already signed up for beta access.' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json(
      { message: 'Successfully signed up for beta access!', id: data.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Beta signup error:', error)
    return NextResponse.json({ error: 'Failed to process signup' }, { status: 500 })
  }
}
