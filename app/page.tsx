'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Scale, FileText, MessageSquare, CreditCard, Search, Users,
  Sparkles, Clock, ArrowRight, Check, Shield, Star, Menu, X,
  ChevronRight,
} from 'lucide-react'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [mobileNav, setMobileNav] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !name) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/beta/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Something went wrong')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-[family-name:var(--font-geist-sans)]">
      {/* ───────── NAV ───────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Scale className="w-7 h-7 text-blue-400" />
            <span className="text-xl font-bold tracking-tight">Unbind</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
            <Link href="/help" className="hover:text-white transition-colors">Help</Link>
            <Link href="/login" className="hover:text-white transition-colors">Log In</Link>
            <a
              href="#cta"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
            >
              Join the Beta
            </a>
          </div>

          <button onClick={() => setMobileNav(!mobileNav)} className="md:hidden p-2 text-slate-400">
            {mobileNav ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileNav && (
          <div className="md:hidden bg-slate-900 border-b border-white/5 px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileNav(false)} className="block text-slate-300 hover:text-white">Features</a>
            <a href="#pricing" onClick={() => setMobileNav(false)} className="block text-slate-300 hover:text-white">Pricing</a>
            <a href="#testimonials" onClick={() => setMobileNav(false)} className="block text-slate-300 hover:text-white">Testimonials</a>
            <Link href="/help" className="block text-slate-300 hover:text-white">Help</Link>
            <Link href="/login" className="block text-slate-300 hover:text-white">Log In</Link>
            <a href="#cta" onClick={() => setMobileNav(false)} className="block text-center px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium">Join the Beta</a>
          </div>
        )}
      </nav>

      {/* ───────── HERO ───────── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-[128px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Limited Beta — Lock in $89/mo for Life
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
            The Only Practice Management{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Built for Family Law
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Unbind replaces the spreadsheets, the missed deadlines, and the 11 PM admin sessions.
            Save 15+ hours a week so you can actually practice law.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#cta"
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all font-semibold text-lg shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
            >
              Join the Beta
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 border border-white/10 text-slate-300 rounded-lg hover:bg-white/5 transition-all font-medium text-lg flex items-center justify-center gap-2"
            >
              See How It Works
            </a>
          </div>

          <p className="mt-6 text-sm text-slate-500">
            No credit card required. 14-day free trial.
          </p>
        </div>
      </section>

      {/* ───────── PAIN POINTS ───────── */}
      <section className="py-20 sm:py-24 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">Sound Familiar?</h2>
            <p className="mt-3 text-slate-400 text-lg max-w-xl mx-auto">
              Family law attorneys spend more time on admin than on advocacy. We fix that.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: 'Drowning in Paperwork',
                desc: 'Discovery responses, financial declarations, settlement docs — you\'re buried in documents that should be generating themselves.',
              },
              {
                icon: CreditCard,
                title: 'Chasing Payments',
                desc: 'Unbilled time slips through the cracks. Invoices go unsent. Clients pay late. Your cash flow suffers while you do the work.',
              },
              {
                icon: MessageSquare,
                title: 'Scattered Client Comms',
                desc: 'Texts, emails, calls, voicemails. Your clients can\'t find their documents and you can\'t find their messages.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-slate-800/50 border border-white/5 rounded-xl p-7 hover:border-white/10 transition-colors"
              >
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center mb-5">
                  <card.icon className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FEATURES ───────── */}
      <section id="features" className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Everything You Need.{' '}
              <span className="text-slate-400">Nothing You Don&apos;t.</span>
            </h2>
            <p className="mt-3 text-slate-400 text-lg max-w-xl mx-auto">
              Purpose-built for divorce and family law. Not another generic legal tool.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Scale,
                title: 'Case Management',
                desc: 'Full lifecycle tracking from intake to disposition. Deadlines, tasks, and milestones in one place for every case.',
                color: 'blue',
              },
              {
                icon: Sparkles,
                title: 'AI Document Intelligence',
                desc: 'Upload documents and AI categorizes, summarizes, and extracts key data automatically. No more manual sorting.',
                color: 'purple',
              },
              {
                icon: Users,
                title: 'Client Portal',
                desc: 'Clients log in via magic link, view their case, upload docs, pay invoices, and message you — all in one secure portal.',
                color: 'cyan',
              },
              {
                icon: CreditCard,
                title: 'Billing & Trust Accounting',
                desc: 'Time tracking, invoice generation, Stripe payments, trust account ledger, and IOLTA compliance built in.',
                color: 'green',
              },
              {
                icon: MessageSquare,
                title: 'Secure Messaging',
                desc: 'Real-time encrypted messaging with clients and co-counsel. No more hunting through email threads.',
                color: 'amber',
              },
              {
                icon: Search,
                title: 'Discovery Tools',
                desc: 'Track interrogatories, RFPs, and RFAs with state-specific deadlines calculated automatically.',
                color: 'rose',
              },
            ].map((feature) => {
              const colorMap: Record<string, string> = {
                blue: 'bg-blue-500/10 text-blue-400',
                purple: 'bg-purple-500/10 text-purple-400',
                cyan: 'bg-cyan-500/10 text-cyan-400',
                green: 'bg-green-500/10 text-green-400',
                amber: 'bg-amber-500/10 text-amber-400',
                rose: 'bg-rose-500/10 text-rose-400',
              }

              return (
                <div
                  key={feature.title}
                  className="group bg-slate-800/30 border border-white/5 rounded-xl p-7 hover:bg-slate-800/50 hover:border-white/10 transition-all"
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-5 ${colorMap[feature.color]}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-white transition-colors">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/help"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Explore all features
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── STATS ───────── */}
      <section className="py-16 bg-slate-900/50 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { stat: '15+', label: 'Hours saved per week' },
            { stat: '50', label: 'States supported' },
            { stat: '99.9%', label: 'Uptime SLA' },
            { stat: '$0', label: 'Per-seat fees' },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-3xl sm:text-4xl font-bold text-white">{item.stat}</div>
              <div className="mt-1 text-sm text-slate-400">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── PRICING ───────── */}
      <section id="pricing" className="py-20 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, Honest Pricing</h2>
          <p className="text-slate-400 text-lg mb-12">
            One plan. Everything included. No per-seat charges.
          </p>

          <div className="relative bg-gradient-to-b from-slate-800/80 to-slate-800/40 border border-white/10 rounded-2xl p-8 sm:p-10 max-w-lg mx-auto">
            {/* Beta badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full shadow-lg shadow-blue-600/30">
              Beta Price — Locked for Life
            </div>

            <div className="mt-4">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-slate-500 line-through text-2xl">$179</span>
                <span className="text-5xl sm:text-6xl font-bold">$89</span>
                <span className="text-slate-400 text-lg">/mo</span>
              </div>
              <p className="mt-2 text-slate-400 text-sm">
                Sign up during beta and this rate is yours forever.
              </p>
            </div>

            <div className="mt-8 space-y-3 text-left max-w-xs mx-auto">
              {[
                'Unlimited cases & clients',
                'AI document categorization',
                'Client portal with magic links',
                'Billing, invoicing & trust accounting',
                'Discovery management',
                'Settlement tools & MSA generation',
                'E-filing integration',
                'All 50 state support',
                'Real-time analytics & reports',
                'Unlimited team members',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-blue-400 shrink-0" />
                  <span className="text-sm text-slate-300">{item}</span>
                </div>
              ))}
            </div>

            <a
              href="#cta"
              className="mt-8 w-full block px-8 py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all font-semibold text-lg shadow-lg shadow-blue-600/25 text-center"
            >
              Join the Beta
            </a>

            <p className="mt-4 text-xs text-slate-500">
              14-day free trial. Cancel anytime. No contracts.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── TESTIMONIALS ───────── */}
      <section id="testimonials" className="py-20 sm:py-24 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold">Trusted by Family Law Attorneys</h2>
            <p className="mt-3 text-slate-400 text-lg">
              Hear from attorneys who switched to Unbind.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Sarah Mitchell',
                title: 'Solo Practitioner, Austin TX',
                quote: 'I went from spending every Sunday doing case admin to having my weekends back. The AI document sorting alone saved me hours. Unbind is the first legal software that actually feels like it was made for my practice.',
              },
              {
                name: 'David Park',
                title: 'Partner, Park Family Law, Los Angeles CA',
                quote: 'The client portal changed everything. My clients stopped calling about case status because they can see it themselves. Our billing cycle dropped from 45 days to under two weeks.',
              },
              {
                name: 'Rachel Torres',
                title: 'Associate, Bright Legal Group, Miami FL',
                quote: 'Discovery deadline tracking is a game-changer. I used to maintain a spreadsheet and still miss things. Now the system calculates deadlines by state and pings me before anything slips.',
              },
            ].map((testimonial) => (
              <div
                key={testimonial.name}
                className="bg-slate-800/50 border border-white/5 rounded-xl p-7"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div>
                  <div className="font-semibold text-sm">{testimonial.name}</div>
                  <div className="text-xs text-slate-500">{testimonial.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA / SIGNUP ───────── */}
      <section id="cta" className="py-20 sm:py-24">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Reclaim Your Time?
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-lg mx-auto">
            Join the beta and lock in $89/month for life. Limited spots available.
          </p>

          {submitted ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8">
              <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-300 mb-2">You&apos;re on the list!</h3>
              <p className="text-slate-400">
                We&apos;ll be in touch soon with your beta access. Check your inbox.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-slate-800/50 border border-white/5 rounded-xl p-6 sm:p-8 text-left"
            >
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Work Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@lawfirm.com"
                    required
                    className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm mb-4">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-8 py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all font-semibold text-lg shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? 'Submitting...' : (
                  <>
                    Join the Beta
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="mt-3 text-xs text-slate-500 text-center">
                No credit card required. 14-day free trial included.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-6 h-6 text-blue-400" />
                <span className="text-lg font-bold">Unbind</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                AI-powered practice management built exclusively for family law attorneys.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-slate-300 mb-3">Product</h4>
              <div className="space-y-2 text-sm text-slate-500">
                <a href="#features" className="block hover:text-slate-300 transition-colors">Features</a>
                <a href="#pricing" className="block hover:text-slate-300 transition-colors">Pricing</a>
                <Link href="/help" className="block hover:text-slate-300 transition-colors">Help Center</Link>
                <Link href="/help/ai" className="block hover:text-slate-300 transition-colors">AI Assistant</Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-slate-300 mb-3">Company</h4>
              <div className="space-y-2 text-sm text-slate-500">
                <a href="mailto:support@unbind.law" className="block hover:text-slate-300 transition-colors">support@unbind.law</a>
                <a href="mailto:sales@unbind.law" className="block hover:text-slate-300 transition-colors">sales@unbind.law</a>
                <Link href="/privacy" className="block hover:text-slate-300 transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="block hover:text-slate-300 transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Shield className="w-4 h-4" />
              <span>SOC 2 compliant. Data encrypted at rest and in transit.</span>
            </div>
            <p className="text-sm text-slate-600">
              &copy; {new Date().getFullYear()} Unbind. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
