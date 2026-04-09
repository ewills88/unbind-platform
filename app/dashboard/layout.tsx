'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const AssistantBubble = dynamic(
  () => import('@/components/assistant/AssistantBubble'),
  { ssr: false }
)

interface StepStatus {
  key: string
  label: string
  done: boolean
}

const TRACKED_STEPS: { key: string; label: string }[] = [
  { key: 'firm_profile', label: 'Firm Profile' },
  { key: 'first_intake', label: 'First Intake' },
  { key: 'setup_payments', label: 'Payments' },
]

const ALL_STEPS = ['firm_profile', 'first_intake', 'invite_team', 'connect_calendar', 'setup_payments']

function SetupBanner() {
  const [dismissed, setDismissed] = useState(true)
  const [steps, setSteps] = useState<StepStatus[]>([])
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const wasDismissed = localStorage.getItem('unbind_setup_banner_dismissed') === 'true'
    if (wasDismissed) return

    const allDone = ALL_STEPS.every(
      s => localStorage.getItem(`unbind_onboarding_${s}_done`) === 'true'
    )
    if (allDone) return

    const tracked = TRACKED_STEPS.map(s => ({
      ...s,
      done: localStorage.getItem(`unbind_onboarding_${s.key}_done`) === 'true',
    }))

    const pendingCount = ALL_STEPS.filter(
      s => localStorage.getItem(`unbind_onboarding_${s}_done`) !== 'true'
    ).length

    setSteps(tracked)
    setRemaining(pendingCount)
    setDismissed(false)
  }, [])

  if (dismissed) return null

  return (
    <div className="relative z-50 w-full border-b-2 border-[#0a0f1e]" style={{ backgroundColor: '#f5a623' }}>
      <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 max-w-[1600px] mx-auto">
        {/* Left: message */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl animate-bounce inline-block" role="img" aria-label="rocket">
            🚀
          </span>
          <p className="text-sm sm:text-[15px]" style={{ color: '#0a0f1e' }}>
            <span className="font-bold">Complete your practice setup</span>
            <span className="hidden sm:inline font-normal">
              {' '}— you&apos;re {remaining} step{remaining !== 1 ? 's' : ''} away from being fully operational
            </span>
          </p>
        </div>

        {/* Center: progress dots (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-5 shrink-0">
          {steps.map((step) => (
            <div key={step.key} className="flex items-center gap-1.5">
              <div
                className={`w-3 h-3 rounded-full border-2 transition-colors ${
                  step.done
                    ? 'bg-[#0a0f1e] border-[#0a0f1e]'
                    : 'bg-transparent border-[#0a0f1e]/40'
                }`}
              />
              <span
                className="text-xs font-medium whitespace-nowrap"
                style={{ color: step.done ? '#0a0f1e' : 'rgba(10,15,30,0.55)' }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Right: CTA + dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard?checklist=open"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
            style={{ backgroundColor: '#0a0f1e', color: '#f5a623' }}
          >
            View Checklist
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <button
            onClick={() => {
              setDismissed(true)
              localStorage.setItem('unbind_setup_banner_dismissed', 'true')
            }}
            className="p-1.5 rounded-md transition-colors hover:bg-[#0a0f1e]/10"
            style={{ color: '#0a0f1e' }}
            aria-label="Dismiss setup banner"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
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
