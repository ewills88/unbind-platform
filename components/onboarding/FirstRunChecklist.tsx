'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Settings, FileText, Users, Calendar, CreditCard,
  CheckCircle2, Sparkles, ArrowRight, Mail,
} from 'lucide-react'

interface ChecklistStep {
  key: string
  title: string
  description: string
  href: string
  ctaLabel: string
  icon: typeof Settings
}

const STEPS: ChecklistStep[] = [
  {
    key: 'firm_profile',
    title: 'Set up your firm profile',
    description: 'Add your logo, billing rates, and payment terms.',
    href: '/dashboard/admin/settings',
    ctaLabel: 'Go to Settings',
    icon: Settings,
  },
  {
    key: 'first_intake',
    title: 'Start your first client intake',
    description: "Capture a new client's information and open their case in minutes.",
    href: '/dashboard/intake/new',
    ctaLabel: 'New Intake',
    icon: FileText,
  },
  {
    key: 'invite_team',
    title: 'Invite your team (optional)',
    description: 'Add paralegals or associates. Control what they see.',
    href: '/dashboard/admin/users',
    ctaLabel: 'Manage Users',
    icon: Users,
  },
  {
    key: 'connect_calendar',
    title: 'Connect your calendar',
    description: 'Sync deadlines and appointments to Google Calendar.',
    href: '/dashboard/settings/integrations',
    ctaLabel: 'Connect',
    icon: Calendar,
  },
  {
    key: 'setup_payments',
    title: 'Set up client payments',
    description: 'Add your bank account so clients can pay invoices online.',
    href: '/dashboard/admin/billing',
    ctaLabel: 'Set Up Payments',
    icon: CreditCard,
  },
]

export default function FirstRunChecklist() {
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  useEffect(() => {
    const saved = new Set<string>()
    for (const step of STEPS) {
      if (localStorage.getItem(`unbind_onboarding_${step.key}_done`) === 'true') {
        saved.add(step.key)
      }
    }
    setCompleted(saved)
  }, [])

  const markDone = (key: string) => {
    localStorage.setItem(`unbind_onboarding_${key}_done`, 'true')
    setCompleted(prev => new Set([...prev, key]))
  }

  const completedCount = completed.size
  const totalSteps = STEPS.length
  const progress = Math.round((completedCount / totalSteps) * 100)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 text-white">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Welcome to Unbind. Let&apos;s set up your practice.</h2>
          </div>
        </div>
        <p className="text-slate-400 text-sm mb-6 ml-[52px]">
          Most attorneys are billing through Unbind within one afternoon.
        </p>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>{completedCount} of {totalSteps} complete</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((step) => {
            const isDone = completed.has(step.key)

            return (
              <div
                key={step.key}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                  isDone
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="mt-0.5">
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-amber-400 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${isDone ? 'text-green-300 line-through' : 'text-white'}`}>
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                </div>
                {!isDone && (
                  <Link
                    href={step.href}
                    onClick={() => markDone(step.key)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 transition-colors whitespace-nowrap shrink-0"
                  >
                    {step.ctaLabel}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        {/* Walkthrough CTA */}
        <div className="mt-6 pt-5 border-t border-slate-700 text-center">
          <p className="text-sm text-slate-400">
            Want a guided walkthrough?{' '}
            <a
              href="mailto:demo@unbind.law"
              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium"
            >
              <Mail className="w-3.5 h-3.5" />
              Book 15 minutes with our team
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
