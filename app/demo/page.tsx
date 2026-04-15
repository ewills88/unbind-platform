'use client'

import Link from 'next/link'
import { Scale, Check, Clock, CreditCard, PhoneOff, ArrowRight } from 'lucide-react'

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/your-link'

export default function DemoPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0f1e' }}>
      {/* Nav */}
      <nav className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Scale className="w-7 h-7 text-amber-400" />
            <span className="text-xl font-bold text-white">Unbind</span>
          </Link>
          <div className="flex items-center gap-4">
            <a href="https://app.unbind.law/login" className="text-sm text-slate-400 hover:text-white transition-colors">
              Sign In
            </a>
            <a
              href="https://buy.stripe.com/14AcN57TyfScdzxcOL2wU0c"
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: '#f5a623', color: '#0a0f1e' }}
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left: Copy */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
              See Unbind In Action
            </h1>
            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              15-minute demo. See exactly how much time you&apos;d save.
            </p>

            {/* Benefits */}
            <div className="space-y-4 mb-10">
              {[
                { icon: Clock, text: '15+ hours saved per week on case admin' },
                { icon: CreditCard, text: '40% faster payments with online invoicing' },
                { icon: PhoneOff, text: '50% fewer client status calls with the portal' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(245,166,35,0.15)' }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: '#f5a623' }} />
                    </div>
                    <span className="text-slate-300 text-sm">{item.text}</span>
                  </div>
                )
              })}
            </div>

            {/* Beta Pricing */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-white">$89</span>
                <span className="text-slate-400">/month</span>
                <span className="text-sm text-slate-500 line-through ml-2">$179</span>
              </div>
              <p className="text-sm text-amber-400 font-medium mb-3">Beta price — locked in for life</p>
              <ul className="space-y-1.5 text-sm text-slate-400">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-400" />Everything included, no add-ons</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-400" />Unlimited cases &amp; team members</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-400" />14-day free trial, cancel anytime</li>
              </ul>
            </div>

            {/* Walkthrough Link */}
            <Link
              href="/demo/walkthrough"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-amber-400 transition-colors"
            >
              Want to explore on your own first? Try the interactive walkthrough
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Right: Calendly Embed */}
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
            <iframe
              src={CALENDLY_URL}
              width="100%"
              height="700"
              frameBorder="0"
              title="Book a demo with Unbind"
              className="w-full"
              style={{ minHeight: '650px' }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} Unbind. All rights reserved.
          </p>
          <p className="text-xs text-slate-600">
            Questions? <a href="mailto:demo@unbind.law" className="text-slate-500 hover:text-white">demo@unbind.law</a>
          </p>
        </div>
      </div>
    </div>
  )
}
