'use client'

import { useState, useMemo } from 'react'
import {
  CheckCircle2, Circle, Clock, AlertTriangle, FileText, ChevronDown, ChevronRight,
  Calendar, ListChecks, Info,
} from 'lucide-react'
import { generateProcedureChecklist, GeneratedTask } from '@/lib/procedureGenerator'
import { categorizeDeadlines, calculateProgress, getDeadlineLabel, getDeadlineColor } from '@/lib/deadlineMonitor'
import { ProcedureTask, PROCEDURE_TYPE_INFO } from '@/types/procedures'

interface ProcedureChecklistProps {
  caseId: string
  stateCode: string
  filingDate?: string
  hasChildren?: boolean
}

export default function ProcedureChecklist({
  caseId,
  stateCode,
  filingDate,
  hasChildren = false,
}: ProcedureChecklistProps) {
  const [fDate, setFDate] = useState(filingDate || '')
  const [generated, setGenerated] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set())
  const [expandedTask, setExpandedTask] = useState<number | null>(null)

  const checklist = useMemo(() => {
    if (!fDate) return null
    return generateProcedureChecklist(stateCode, fDate, hasChildren)
  }, [stateCode, fDate, hasChildren])

  const handleGenerate = () => {
    if (fDate) setGenerated(true)
  }

  const toggleComplete = (taskOrder: number) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskOrder)) next.delete(taskOrder)
      else next.add(taskOrder)
      return next
    })
  }

  // Convert generated tasks to ProcedureTask shape for deadline monitor
  const asProcedureTasks: ProcedureTask[] = useMemo(() => {
    if (!checklist) return []
    return checklist.tasks.map((t) => ({
      id: String(t.task_order),
      case_id: caseId,
      procedure_id: null,
      state_code: stateCode,
      task_order: t.task_order,
      task_name: t.task_name,
      task_description: t.task_description,
      assigned_to: null,
      due_date: t.due_date,
      completed_at: completedTasks.has(t.task_order) ? new Date().toISOString() : null,
      completion_notes: null,
      required_documents: t.required_documents,
      estimated_duration_days: t.estimated_duration_days,
      dependencies: [],
      state_statute_reference: t.state_statute_reference,
      is_urgent: false,
      created_at: '',
      updated_at: '',
    }))
  }, [checklist, completedTasks, caseId, stateCode])

  const progress = useMemo(() => calculateProgress(asProcedureTasks), [asProcedureTasks])
  const deadlines = useMemo(() => categorizeDeadlines(asProcedureTasks), [asProcedureTasks])

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ListChecks className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Procedure Checklist — {stateCode}
        </h3>
      </div>

      {!generated && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Generate a state-specific procedure checklist with calculated deadlines for this case.
          </p>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filing Date</label>
            <input
              type="date"
              value={fDate}
              onChange={(e) => setFDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!fDate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ListChecks className="w-4 h-4" /> Generate Checklist
          </button>
        </div>
      )}

      {generated && checklist && (
        <>
          {/* Progress & deadline summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium">Progress</p>
              <p className="text-2xl font-bold text-indigo-600">{progress.percentage}%</p>
              <p className="text-xs text-gray-500">{progress.completed}/{progress.total} tasks</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
            <div className={`rounded-lg border p-4 ${deadlines.overdue.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
              <p className="text-xs text-gray-500 font-medium">Overdue</p>
              <p className={`text-2xl font-bold ${deadlines.overdue.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {deadlines.overdue.length}
              </p>
            </div>
            <div className={`rounded-lg border p-4 ${deadlines.urgent.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
              <p className="text-xs text-gray-500 font-medium">Due Today/Tomorrow</p>
              <p className={`text-2xl font-bold ${deadlines.urgent.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                {deadlines.urgent.length}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium">Est. Completion</p>
              <p className="text-sm font-bold text-gray-900">{fmtDate(checklist.estimatedCompletionDate)}</p>
            </div>
          </div>

          {/* Key dates */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-semibold text-gray-900">Key Dates</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {Object.entries(checklist.keyDates)
                .filter(([, v]) => v)
                .map(([key, val]) => (
                  <div key={key}>
                    <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="font-medium text-gray-900">{fmtDate(val!)}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Task list */}
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {checklist.tasks.map((task) => {
              const isCompleted = completedTasks.has(task.task_order)
              const isExpanded = expandedTask === task.task_order
              const typeInfo = PROCEDURE_TYPE_INFO[task.procedure_type]
              const deadlineColorClass = !isCompleted && task.due_date ? getDeadlineColor(task.due_date) : ''

              return (
                <div key={task.task_order} className={`${isCompleted ? 'bg-gray-50 opacity-75' : ''}`}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleComplete(task.task_order)}
                      className="flex-shrink-0"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 hover:text-indigo-400" />
                      )}
                    </button>

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-mono w-5">{task.task_order}.</span>
                        <p className={`text-sm font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {task.task_name}
                        </p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Deadline badge */}
                    {task.due_date && !isCompleted && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${deadlineColorClass}`}>
                        <Clock className="w-3 h-3" />
                        {getDeadlineLabel(task.due_date)}
                      </span>
                    )}

                    {/* Assignee */}
                    <span className="text-xs text-gray-400 capitalize hidden md:inline">
                      {task.default_assignee}
                    </span>

                    {/* Expand */}
                    <button
                      onClick={() => setExpandedTask(isExpanded ? null : task.task_order)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-12 space-y-3">
                      <p className="text-sm text-gray-600">{task.task_description}</p>

                      <div className="flex flex-wrap gap-4 text-xs">
                        {task.due_date && (
                          <div>
                            <span className="text-gray-500">Due:</span>{' '}
                            <span className="font-medium">{fmtDate(task.due_date)}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Est. Duration:</span>{' '}
                          <span className="font-medium">{task.estimated_duration_days} day{task.estimated_duration_days !== 1 ? 's' : ''}</span>
                        </div>
                        {task.state_statute_reference && (
                          <div>
                            <span className="text-gray-500">Statute:</span>{' '}
                            <span className="font-medium font-mono">{task.state_statute_reference}</span>
                          </div>
                        )}
                      </div>

                      {task.required_documents.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Required Documents:</p>
                          <div className="flex flex-wrap gap-1">
                            {task.required_documents.map((doc, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                <FileText className="w-3 h-3" /> {doc}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {task.dependencies.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Depends on:</p>
                          <ul className="list-disc list-inside text-xs text-gray-600">
                            {task.dependencies.map((dep, i) => <li key={i}>{dep}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-400 italic">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Deadlines are estimates based on state rules and filing date. Actual deadlines may vary
              by county, case complexity, and court scheduling. Attorney should verify all dates.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
