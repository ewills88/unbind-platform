import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const priceId = body.priceId || process.env.STRIPE_PRICE_ID_MONTHLY

  if (!priceId) {
    return NextResponse.json({ error: 'No price ID configured' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Dynamic import to avoid build errors when stripe isn't installed
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
  })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/?checkout=cancelled`,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 14,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
