'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  ClipboardList,
  FileText,
  Search,
  Handshake,
  Scale,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ClientProgress,
  CaseStage,
  STAGE_DEFINITIONS,
  STAGE_ORDER,
} from '@/types/client'
import { getDaysUntil, formatShortDate } from '@/lib/dates'

const _supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STAGE_ICONS: Record<CaseStage, typeof ClipboardList> = {
  getting_started: ClipboardList,
  filed: FileText,
  discovery: Search,
  negotiation: Handshake,
  final: Scale,
  complete: CheckCircle2,
}

interface ProgressTrackerProps {
  caseId: string
}

export default function ProgressTracker({ caseId }: ProgressTrackerProps) {
  const [progress, setProgress] = useState<ClientProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedStage, setExpandedStage] = useState<CaseStage | null>(null)

  useEffect(() => {
    fetchProgress()
  }, [caseId])

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/client/progress')
      if (res.ok) {
        const data = await res.json()
        setProgress(data)
      }
    } catch (err) {
      console.error('Error fetching progress:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
          <div className="flex space-x-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 w-10 bg-gray-200 rounded-full"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const currentStage = progress?.current_stage || 'getting_started'
  const currentStageIndex = STAGE_ORDER.indexOf(currentStage)
  const percentage = progress?.overall_completion_percentage || 0
  const milestonesCompleted = progress?.milestones_completed || []

  const getStageStatus = (stage: CaseStage): 'done' | 'current' | 'upcoming' => {
    const stageIndex = STAGE_ORDER.indexOf(stage)
    if (stageIndex < currentStageIndex) return 'done'
    if (stageIndex === currentStageIndex) return 'current'
    return 'upcoming'
  }

  const estimatedDaysRemaining = progress?.estimated_completion_date
    ? getDaysUntil(progress.estimated_completion_date)
    : null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header with progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Case Progress</h3>
          <span className="text-sm font-medium text-blue-600">{percentage}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Desktop: Horizontal timeline */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between relative">
          {/* Connector line */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 z-0" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-blue-500 z-0 transition-all duration-500"
            style={{
              width: `${Math.max(0, (currentStageIndex / (STAGE_ORDER.length - 1)) * 100)}%`,
              maxWidth: 'calc(100% - 40px)',
            }}
          />

          {STAGE_ORDER.map((stage) => {
            const status = getStageStatus(stage)
            const def = STAGE_DEFINITIONS[stage]
            const Icon = STAGE_ICONS[stage]
            const isExpanded = expandedStage === stage

            return (
              <div key={stage} className="flex flex-col items-center z-10 relative">
                <button
                  onClick={() => setExpandedStage(isExpanded ? null : stage)}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                    status === 'done' && 'bg-green-500 border-green-500 text-white',
                    status === 'current' && 'bg-blue-500 border-blue-500 text-white animate-pulse',
                    status === 'upcoming' && 'bg-white border-gray-300 text-gray-400'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </button>
                <span
                  className={cn(
                    'text-xs mt-2 text-center font-medium max-w-[80px]',
                    status === 'done' && 'text-green-700',
                    status === 'current' && 'text-blue-700',
                    status === 'upcoming' && 'text-gray-400'
                  )}
                >
                  {def.name}
                </span>
                <span
                  className={cn(
                    'text-[10px] mt-0.5',
                    status === 'done' && 'text-green-600',
                    status === 'current' && 'text-blue-600',
                    status === 'upcoming' && 'text-gray-400'
                  )}
                >
                  {status === 'done' ? 'Complete' : status === 'current' ? 'In Progress' : 'Upcoming'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Expanded stage details */}
        {expandedStage && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{STAGE_DEFINITIONS[expandedStage].name}</h4>
              <button onClick={() => setExpandedStage(null)} className="text-gray-400 hover:text-gray-600">
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">{STAGE_DEFINITIONS[expandedStage].description}</p>
            <div className="space-y-2">
              {STAGE_DEFINITIONS[expandedStage].milestones.map((milestone, i) => {
                const isCompleted = milestonesCompleted.includes(milestone)
                return (
                  <div key={i} className="flex items-center space-x-2">
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      )}
                    >
                      {isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className={cn('text-sm', isCompleted ? 'text-gray-700 line-through' : 'text-gray-600')}>
                      {milestone}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Vertical timeline */}
      <div className="md:hidden space-y-0">
        {STAGE_ORDER.map((stage, idx) => {
          const status = getStageStatus(stage)
          const def = STAGE_DEFINITIONS[stage]
          const Icon = STAGE_ICONS[stage]
          const isExpanded = expandedStage === stage
          const isLast = idx === STAGE_ORDER.length - 1

          return (
            <div key={stage} className="relative">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-5 top-10 w-0.5 h-full -translate-x-1/2',
                    status === 'done' || (status === 'current') ? 'bg-blue-300' : 'bg-gray-200'
                  )}
                />
              )}

              <button
                onClick={() => setExpandedStage(isExpanded ? null : stage)}
                className="flex items-center space-x-3 py-3 w-full text-left"
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 z-10',
                    status === 'done' && 'bg-green-500 border-green-500 text-white',
                    status === 'current' && 'bg-blue-500 border-blue-500 text-white animate-pulse',
                    status === 'upcoming' && 'bg-white border-gray-300 text-gray-400'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    status === 'done' && 'text-green-700',
                    status === 'current' && 'text-blue-700',
                    status === 'upcoming' && 'text-gray-400'
                  )}>
                    {def.name}
                  </p>
                  <p className={cn(
                    'text-xs',
                    status === 'done' && 'text-green-600',
                    status === 'current' && 'text-blue-600',
                    status === 'upcoming' && 'text-gray-400'
                  )}>
                    {status === 'done' ? 'Complete' : status === 'current' ? 'In Progress' : 'Upcoming'}
                  </p>
                </div>
                {status === 'current' && (
                  isExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Expanded milestones */}
              {isExpanded && status === 'current' && (
                <div className="ml-[52px] pb-3">
                  <p className="text-xs text-gray-500 mb-2">{def.description}</p>
                  <div className="space-y-1.5">
                    {def.milestones.map((milestone, i) => {
                      const isCompleted = milestonesCompleted.includes(milestone)
                      return (
                        <div key={i} className="flex items-center space-x-2">
                          <div
                            className={cn(
                              'w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0',
                              isCompleted ? 'bg-green-500' : 'bg-gray-200'
                            )}
                          >
                            {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className={cn('text-xs', isCompleted ? 'text-gray-700 line-through' : 'text-gray-600')}>
                            {milestone}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Estimated completion */}
      {progress?.estimated_completion_date && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Estimated Completion
            </p>
            <p className="text-xs text-blue-700">
              {formatShortDate(progress.estimated_completion_date)}
              {estimatedDaysRemaining !== null && estimatedDaysRemaining > 0 && (
                <span> · ~{estimatedDaysRemaining} days remaining</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
