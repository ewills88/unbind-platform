'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { X, ArrowRight } from 'lucide-react'

const AssistantBubble = dynamic(
  () => import('@/components/assistant/AssistantBubble'),
  { ssr: false }
)

const ONBOARDING_STEPS = ['firm_profile', 'first_intake', 'invite_team', 'connect_calendar', 'setup_payments']

function SetupBanner() {
  const [dismissed, setDismissed] = useState(true) // Default hidden until check
  const [incomplete, setIncomplete] = useState(false)

  useEffect(() => {
    const wasDismissed = localStorage.getItem('unbind_setup_banner_dismissed') === 'true'
    if (wasDismissed) return

    const allDone = ONBOARDING_STEPS.every(
      step => localStorage.getItem(`unbind_onboarding_${step}_done`) === 'true'
    )

    if (!allDone) {
      setIncomplete(true)
      setDismissed(false)
    }
  }, [])

  if (dismissed || !incomplete) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-amber-800">
        <span>Finish setting up your practice</span>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 font-medium text-amber-700 hover:text-amber-900"
        >
          View checklist
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <button
        onClick={() => {
          setDismissed(true)
          localStorage.setItem('unbind_setup_banner_dismissed', 'true')
        }}
        className="p-1 text-amber-400 hover:text-amber-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SetupBanner />
      {children}
      <AssistantBubble />
    </>
  )
}
