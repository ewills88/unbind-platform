'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useState, useEffect, useMemo } from 'react'
import {
  CheckCircle2, Circle, Clock, MinusCircle, XCircle,
  Loader2, ChevronDown, ChevronUp, Lightbulb, Calendar,
  FileText, AlertTriangle,
} from 'lucide-react'
import {
  CHECKLIST_PHASE_INFO,
  getChecklistProgress,
  type FilingChecklist as FilingChecklistType,
  type ChecklistItem,
  type ChecklistItemStatus,
  type ChecklistPhase,
} from '@/types/court-forms'

interface Props {
  caseId: string
}

export default function FilingChecklist({ caseId }: Props) {
  const [checklists, setChecklists] = useState<FilingChecklistType[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [updating, setUpdating] = useState<string | null>(null)

  async function loadChecklists() {
    try {
      const res = await authFetch(`/api/cases/${caseId}/checklist`)
      if (res.ok) {
        const json = await res.json()
        const data = json.data || []
        setChecklists(data)
        // Auto-expand first incomplete phase
        const incomplete = data.find((c: FilingChecklistType) => {
          const progress = getChecklistProgress(c.items)
          return progress.percentage < 100
        })
        if (incomplete) setExpandedPhase(incomplete.id)
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChecklists()
  }, [caseId])

  async function handleUpdateStatus(checklistId: string, itemId: string, itemName: string, status: ChecklistItemStatus) {
    setUpdating(`${checklistId}-${itemId}`)
    try {
      await authFetch(`/api/cases/${caseId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist_id: checklistId,
          item_id: itemId,
          item_name: itemName,
          status,
        }),
      })
      await loadChecklists()
    } catch {
      // Ignore
    } finally {
      setUpdating(null)
    }
  }

  function toggleItemExpand(itemId: string) {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    let complete = 0
    let total = 0

    checklists.forEach(checklist => {
      checklist.items.forEach((item: ChecklistItem) => {
        if (item.is_mandatory) {
          total++
          if (item.status === 'complete') complete++
        }
      })
    })

    return {
      complete,
      total,
      percentage: total > 0 ? Math.round((complete / total) * 100) : 0,
    }
  }, [checklists])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const statusIcons: Record<string, React.ReactNode> = {
    not_started: <Circle className="w-5 h-5 text-gray-400" />,
    in_progress: <Clock className="w-5 h-5 text-yellow-500" />,
    complete: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    not_applicable: <MinusCircle className="w-5 h-5 text-gray-400" />,
    waived: <XCircle className="w-5 h-5 text-orange-500" />,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Filing Checklist</h2>
          <p className="text-sm text-gray-500 mt-0.5">Track required filings and deadlines</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{overallProgress.percentage}%</p>
          <p className="text-xs text-gray-500">
            {overallProgress.complete} of {overallProgress.total} required items
          </p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-500 rounded-full"
          style={{ width: `${overallProgress.percentage}%` }}
        />
      </div>

      {/* Checklists by phase */}
      <div className="space-y-3">
        {checklists.map(checklist => {
          const progress = getChecklistProgress(checklist.items)
          const phaseInfo = CHECKLIST_PHASE_INFO[checklist.phase as ChecklistPhase]
          const isExpanded = expandedPhase === checklist.id
          const isComplete = progress.percentage === 100

          return (
            <div key={checklist.id} className="bg-white border border-gray-200 rounded-lg">
              {/* Phase header */}
              <button
                onClick={() => setExpandedPhase(isExpanded ? null : checklist.id)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isComplete ? 'bg-green-100' : progress.complete > 0 ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className={`w-5 h-5 ${progress.complete > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{checklist.checklist_name}</p>
                    <p className="text-xs text-gray-500">{checklist.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${phaseInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                    {phaseInfo?.label || checklist.phase}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {progress.complete}/{progress.total}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Phase progress bar */}
              {!isExpanded && progress.total > 0 && (
                <div className="px-4 pb-3">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Checklist items */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {checklist.items.map((item: ChecklistItem) => {
                    const isItemExpanded = expandedItems.has(item.id)
                    const isUpdating = updating === `${checklist.id}-${item.id}`
                    const itemStatus = item.status || 'not_started'
                    const isOverdue = item.deadline_date && new Date(item.deadline_date) < new Date() && itemStatus !== 'complete'

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${
                          itemStatus === 'complete' ? 'bg-green-50 border-green-200' :
                          itemStatus === 'in_progress' ? 'bg-yellow-50 border-yellow-200' :
                          isOverdue ? 'bg-red-50 border-red-200' :
                          'bg-white border-gray-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {statusIcons[itemStatus] || statusIcons.not_started}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${
                                    itemStatus === 'complete' ? 'text-gray-500 line-through' : 'text-gray-900'
                                  }`}>
                                    {item.name}
                                  </span>
                                  {item.is_mandatory && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Required</span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                                )}
                              </div>
                              <select
                                value={itemStatus}
                                onChange={e => handleUpdateStatus(checklist.id, item.id, item.name, e.target.value as ChecklistItemStatus)}
                                disabled={isUpdating}
                                className="text-xs px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                              >
                                <option value="not_started">Not Started</option>
                                <option value="in_progress">In Progress</option>
                                <option value="complete">Complete</option>
                                <option value="not_applicable">N/A</option>
                                <option value="waived">Waived</option>
                              </select>
                            </div>

                            {/* Overdue warning */}
                            {isOverdue && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                <span className="text-xs text-red-600 font-medium">
                                  Overdue - Due {new Date(item.deadline_date!).toLocaleDateString()}
                                </span>
                              </div>
                            )}

                            {/* Deadline */}
                            {item.deadline_date && !isOverdue && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  Due: {new Date(item.deadline_date).toLocaleDateString()}
                                </span>
                              </div>
                            )}

                            {/* Expandable details */}
                            {(item.forms?.length || item.tips?.length) && (
                              <div className="mt-2">
                                <button
                                  onClick={() => toggleItemExpand(item.id)}
                                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                                >
                                  {isItemExpanded ? 'Hide details' : 'Show details'}
                                  {isItemExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>

                                {isItemExpanded && (
                                  <div className="mt-2 space-y-2">
                                    {item.forms && item.forms.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-600">Required Forms:</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {item.forms.map(form => (
                                            <span key={form} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono flex items-center gap-1">
                                              <FileText className="w-3 h-3" />
                                              {form}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {item.tips && item.tips.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-gray-600">Tips:</p>
                                        <ul className="mt-1 space-y-1">
                                          {item.tips.map((tip, i) => (
                                            <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                              <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                              {tip}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {checklists.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No Checklists Available</h3>
          <p className="text-sm text-gray-500">Filing checklists for this case type have not been configured.</p>
        </div>
      )}
    </div>
  )
}
