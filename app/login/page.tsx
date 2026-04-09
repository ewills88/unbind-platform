'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#0a0f1e' }}>
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo-dark.svg" alt="Unbind" className="h-16 mx-auto" />
        </div>

        <div className="bg-slate-900 border border-white/10 rounded-xl px-8 py-10">
          <div className="mb-8">
            <h2 className="text-center text-2xl font-bold text-white">
              Welcome back
            </h2>
            <p className="mt-2 text-center text-sm text-slate-400">
              Sign in to your Unbind account
            </p>
          </div>

          <div className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                placeholder="you@law-firm.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="block w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                placeholder="Enter your password"
              />
              <div className="mt-1.5 text-right">
                <Link href="/forgot-password" className="text-xs text-slate-500 hover:text-amber-400 transition-colors">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#f5a623', color: '#0a0f1e' }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </div>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-slate-900 text-slate-500">New to Unbind?</span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <a
                href="https://buy.stripe.com/14AcN57TyfScdzxcOL2wU0c"
                className="font-medium text-amber-400 hover:text-amber-300 transition-colors text-sm"
              >
                Start your free trial &rarr;
              </a>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          &copy; {new Date().getFullYear()} Unbind. All rights reserved.
        </p>
      </div>
    </div>
  )
}
