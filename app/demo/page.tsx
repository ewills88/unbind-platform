'use client'

import Link from 'next/link'
import { Check, Clock, CreditCard, PhoneOff, ArrowRight } from 'lucide-react'

const CAL_URL = process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://cal.com/eric-wills-snawfe/15min'

export default function DemoPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0f1e' }}>
      {/* Nav */}
      <nav className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <svg width="28" height="20" viewBox="2 10 56 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
              <path d="M8 24c0-5.5 4.5-10 10-10 3.3 0 6.2 1.6 8 4.1l1.5 2 1.5-2C30.8 15.6 33.7 14 37 14c5.5 0 10 4.5 10 10s-4.5 10-10 10c-3.3 0-6.2-1.6-8-4.1l-1.5-2-1.5 2C24.2 32.4 21.3 34 18 34c-5.5 0-10-4.5-10-10z" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="49" cy="14" r="2.5" fill="#f5a623"/>
            </svg>
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

            {/* Walkthrough CTA */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Or explore on your own</p>
              <Link
                href="/demo/walkthrough"
                className="flex items-center justify-center gap-2 w-full py-3.5 border border-white/20 text-white rounded-xl font-medium hover:bg-white/5 transition-colors text-base"
              >
                Explore the interactive walkthrough
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-center text-xs text-slate-600 mt-2">No login required. See a real case.</p>
            </div>
          </div>

          {/* Right: Stats + Book CTA */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
              <div className="grid grid-cols-1 gap-8">
                {[
                  { stat: '15+', unit: 'hrs', label: 'Saved per week on case admin' },
                  { stat: '40', unit: '%', label: 'Faster payments with online invoicing' },
                  { stat: '50', unit: '%', label: 'Fewer client status calls' },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold" style={{ color: '#f5a623' }}>{item.stat}</span>
                      <span className="text-2xl font-bold" style={{ color: '#f5a623' }}>{item.unit}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-2">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Book Demo CTA */}
            <a
              href={CAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-4 rounded-xl text-lg font-semibold transition-colors hover:opacity-90"
              style={{ backgroundColor: '#f5a623', color: '#0a0f1e' }}
            >
              Book Your 15-Min Demo
            </a>
            <p className="text-center text-xs text-slate-500">
              Free. No obligation. See Unbind live in 15 minutes.
            </p>
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
