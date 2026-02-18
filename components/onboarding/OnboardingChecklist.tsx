'use client'

// Session 25: Onboarding Checklist Component
// Sidebar checklist with progress bar, step items, and dismiss

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp } from 'lucide-react'

interface ChecklistItem {
  id: string
  step_number: number
  title: string
  description: string
  action_url: string
  is_required: boolean
}

interface OnboardingProgress {
  current_step: number
  completed_steps: string[]
  is_completed: boolean
}

interface OnboardingChecklistProps {
  userId: string
  role: string
}

export default function OnboardingChecklist({ userId, role }: OnboardingChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [checklistRes, progressRes] = await Promise.all([
        fetch(`/api/onboarding/checklist?role=${role}`),
        fetch(`/api/onboarding/progress?userId=${userId}`),
      ])

      if (checklistRes.ok) {
        const data = await checklistRes.json()
        setChecklist(data)
      }

      if (progressRes.ok) {
        const data = await progressRes.json()
        setProgress(data)
        if (data.is_completed) {
          setDismissed(true)
        }
      }
    } catch {
      // Fetch failed silently
    }
    setLoading(false)
  }, [userId, role])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCompleteStep = async (stepKey: string) => {
    try {
      const res = await fetch('/api/onboarding/complete-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, stepKey }),
      })

      if (res.ok) {
        const updated = await res.json()
        setProgress(updated)
      }
    } catch {
      // Step completion failed silently
    }
  }

  if (dismissed || loading || !progress || checklist.length === 0) {
    return null
  }

  const completedCount = progress.completed_steps?.length || 0
  const totalSteps = checklist.length
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900">Getting Started</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={collapsed ? 'Expand checklist' : 'Collapse checklist'}
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss checklist"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {completedCount}/{totalSteps}
          </span>
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="divide-y divide-gray-50">
          {checklist.map((item) => {
            const isCompleted = progress.completed_steps?.includes(String(item.step_number))
            return (
              <div
                key={item.id}
                className={`p-4 flex items-start gap-3 ${
                  isCompleted ? 'bg-green-50/50' : 'hover:bg-gray-50'
                } transition-colors`}
              >
                <button
                  onClick={() => !isCompleted && handleCompleteStep(String(item.step_number))}
                  className="mt-0.5 shrink-0"
                  disabled={isCompleted}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300 hover:text-blue-400 transition-colors" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.action_url ? (
                      <a
                        href={item.action_url}
                        className={`text-sm font-medium ${
                          isCompleted
                            ? 'text-gray-400 line-through'
                            : 'text-gray-900 hover:text-blue-600'
                        } transition-colors`}
                      >
                        {item.title}
                      </a>
                    ) : (
                      <span
                        className={`text-sm font-medium ${
                          isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </span>
                    )}
                    {item.is_required && !isCompleted && (
                      <span className="text-xs text-red-500">Required</span>
                    )}
                  </div>
                  {item.description && !isCompleted && (
                    <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
