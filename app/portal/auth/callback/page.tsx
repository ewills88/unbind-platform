'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { authFetch } from '@/lib/supabase/auth-fetch'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    verifyToken()
  }, [])

  const verifyToken = async () => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setErrorMsg('No login token found. Please request a new login link.')
      return
    }

    try {
      const res = await authFetch('/api/portal/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (data.success) {
        setStatus('success')
        // Store session token if needed
        if (data.session_token) {
          localStorage.setItem('portal_session', data.session_token)
        }
        // Redirect to portal dashboard after brief success display
        setTimeout(() => {
          router.push('/portal/dashboard')
        }, 1500)
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Verification failed')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Your Login</h2>
              <p className="text-gray-600">Please wait while we verify your secure link...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Login Successful</h2>
              <p className="text-gray-600">Redirecting to your portal...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
              <p className="text-gray-600 mb-6">{errorMsg}</p>
              <button
                onClick={() => router.push('/portal/login')}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Request New Link
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PortalAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
