import Link from 'next/link'
import { Check } from 'lucide-react'

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0f1e' }}>
      <div className="max-w-lg w-full text-center">
        {/* Checkmark */}
        <div className="mx-auto mb-8 w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(245,166,35,0.15)' }}>
          <Check className="w-10 h-10" style={{ color: '#f5a623' }} strokeWidth={3} />
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          You&apos;re in. Welcome to Unbind. 🎉
        </h1>

        {/* Subhead */}
        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
          Your 14-day free trial has started.<br />
          Check your email to activate your account.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg font-semibold text-lg transition-colors"
            style={{ backgroundColor: '#f5a623', color: '#0a0f1e' }}
          >
            Go to Dashboard
          </Link>
          <a
            href="mailto:demo@unbind.law"
            className="w-full sm:w-auto px-8 py-3.5 border border-white/15 text-slate-300 rounded-lg font-medium text-lg hover:bg-white/5 transition-colors text-center"
          >
            Book onboarding call
          </a>
        </div>

        {/* Help text */}
        <p className="text-sm text-slate-500">
          Questions?{' '}
          <a href="mailto:demo@unbind.law" className="text-slate-400 underline underline-offset-2 hover:text-white transition-colors">
            demo@unbind.law
          </a>
        </p>
      </div>
    </div>
  )
}
