'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { authFetch } from '@/lib/supabase/auth-fetch'

type Status = 'verifying' | 'success' | 'error'

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('verifying')
  const [errorMsg, setErrorMsg] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    acceptInvitation()
  }, [])

  const acceptInvitation = async () => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      setErrorMsg('No invitation token found. Please check your email for the correct link.')
      return
    }

    try {
      const res = await authFetch('/api/portal/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (data.success) {
        setStatus('success')
        if (data.session_token) {
          localStorage.setItem('portal_session', data.session_token)
        }
        if (data.user?.full_name) {
          setUserName(data.user.full_name)
        }
        setTimeout(() => {
          router.push('/portal/dashboard')
        }, 2000)
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Failed to accept invitation')
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
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl mb-6">
            <span className="text-white font-bold text-lg">U</span>
          </div>

          {status === 'verifying' && (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Accepting Invitation</h2>
              <p className="text-gray-600">Please wait while we set up your portal access...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome{userName ? `, ${userName}` : ''}!</h2>
              <p className="text-gray-600 mb-2">Your portal access has been activated.</p>
              <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Error</h2>
              <p className="text-gray-600 mb-6">{errorMsg}</p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/portal/login')}
                  className="w-full px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Login
                </button>
                <p className="text-xs text-gray-500">
                  If your invitation expired, please contact your attorney to request a new one.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
