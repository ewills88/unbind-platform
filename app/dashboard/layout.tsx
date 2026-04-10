'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const AssistantBubble = dynamic(
  () => import('@/components/assistant/AssistantBubble'),
  { ssr: false }
)

const MobileBottomNav = dynamic(
  () => import('@/components/navigation/MobileBottomNav'),
  { ssr: false }
)

const ALL_STEPS = ['firm_profile', 'first_intake', 'invite_team', 'connect_calendar', 'setup_payments']

function SetupBanner() {
  const [dismissed, setDismissed] = useState(true)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const wasDismissed = localStorage.getItem('unbind_setup_banner_dismissed') === 'true'
    if (wasDismissed) return

    const pendingCount = ALL_STEPS.filter(
      s => localStorage.getItem(`unbind_onboarding_${s}_done`) !== 'true'
    ).length

    if (pendingCount === 0) return

    setRemaining(pendingCount)
    setDismissed(false)
  }, [])

  if (dismissed) return null

  return (
    <div
      className="fixed top-0 right-0 left-0 lg:left-64 z-40 border-b-2"
      style={{
        backgroundColor: '#f5a623',
        borderColor: '#0a0f1e',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="flex items-center justify-between py-3 px-6">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg animate-bounce inline-block" role="img" aria-label="rocket">
            🚀
          </span>
          <p className="text-sm font-bold" style={{ color: '#0a0f1e' }}>
            Finish setting up your practice
            <span className="hidden sm:inline font-normal">
              {' '}— {remaining} step{remaining !== 1 ? 's' : ''} remaining
            </span>
            {' '}
            <Link
              href="/dashboard?checklist=open"
              className="underline underline-offset-2 hover:no-underline"
              style={{ color: '#0a0f1e' }}
            >
              View checklist →
            </Link>
          </p>
        </div>

        <button
          onClick={() => {
            setDismissed(true)
            localStorage.setItem('unbind_setup_banner_dismissed', 'true')
          }}
          className="p-1.5 rounded-md transition-colors hover:bg-black/10 shrink-0 ml-4"
          style={{ color: '#0a0f1e' }}
          aria-label="Dismiss setup banner"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <SetupBanner />
      <div className="pb-20 md:pb-0">
        {children}
      </div>
      <MobileBottomNav />
      <AssistantBubble />
    </div>
  )
}
