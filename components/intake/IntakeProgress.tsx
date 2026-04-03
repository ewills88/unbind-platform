'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  Circle,
  Clock,
  FileText,
  User,
  Scale,
  AlertTriangle,
  ChevronRight,
  Loader2,
  PartyPopper,
} from 'lucide-react'
import { IntakeProgressSummary } from '@/types/intake-documents'
import { ClientIntake } from '@/types/intake'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface IntakeProgressProps {
  intakeId: string
  intake?: ClientIntake
}

interface ProgressStep {
  id: string
  label: string
  description: string
  icon: typeof CheckCircle
  status: 'complete' | 'current' | 'pending'
}

export default function IntakeProgress({ intakeId, intake }: IntakeProgressProps) {
  const router = useRouter()
  const [progress, setProgress] = useState<IntakeProgressSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        // Fetch documents for progress
        const docsResponse = await authFetch(`/api/intakes/${intakeId}/documents`)
        const docsData = await docsResponse.json()

        // Check if AI analysis exists
        const analysisExists = false // Would check analysis API

        const summary: IntakeProgressSummary = {
          intake_submitted: intake?.status === 'submitted' || intake?.status === 'reviewed',
          intake_submitted_at: intake?.submitted_at,
          documents_required: docsData.checklist?.totalRequired || 0,
          documents_uploaded: docsData.checklist?.uploadedRequired || 0,
          documents_verified: docsData.checklist?.required?.filter(
            (d: { status: string }) => d.status === 'verified'
          ).length || 0,
          documents_rejected: docsData.checklist?.required?.filter(
            (d: { status: string }) => d.status === 'rejected'
          ).length || 0,
          ai_analysis_complete: analysisExists,
          attorney_review_status: intake?.reviewed_at ? 'complete' : 'pending',
          case_created: !!intake?.converted_to_case_id,
        }

        // Determine next action
        if (!summary.intake_submitted) {
          summary.next_action = 'Complete your intake questionnaire'
        } else if (summary.documents_required > 0 && summary.documents_uploaded < summary.documents_required) {
          summary.next_action = `Upload ${summary.documents_required - summary.documents_uploaded} more required documents`
        } else if (summary.documents_rejected > 0) {
          summary.next_action = `Re-upload ${summary.documents_rejected} rejected documents`
        } else if (summary.attorney_review_status === 'pending') {
          summary.next_action = 'Awaiting attorney review'
        } else if (!summary.case_created) {
          summary.next_action = 'Your case is being set up'
        } else {
          summary.next_action = 'Go to your case dashboard'
        }

        setProgress(summary)
      } catch (error) {
        console.error('Error fetching progress:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProgress()
  }, [intakeId, intake])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!progress) return null

  const steps: ProgressStep[] = [
    {
      id: 'intake',
      label: 'Intake Questionnaire',
      description: progress.intake_submitted ? 'Completed' : 'In progress',
      icon: FileText,
      status: progress.intake_submitted ? 'complete' : 'current',
    },
    {
      id: 'documents',
      label: 'Document Collection',
      description: progress.documents_required > 0
        ? `${progress.documents_uploaded} of ${progress.documents_required} uploaded`
        : 'No documents required yet',
      icon: FileText,
      status: progress.intake_submitted
        ? progress.documents_uploaded >= progress.documents_required
          ? 'complete'
          : 'current'
        : 'pending',
    },
    {
      id: 'review',
      label: 'Attorney Review',
      description: progress.attorney_review_status === 'complete'
        ? 'Reviewed'
        : progress.attorney_review_status === 'in_progress'
        ? 'In review'
        : 'Pending',
      icon: User,
      status: progress.attorney_review_status === 'complete'
        ? 'complete'
        : progress.documents_uploaded >= progress.documents_required
        ? 'current'
        : 'pending',
    },
    {
      id: 'case',
      label: 'Case Setup',
      description: progress.case_created ? 'Case created' : 'Pending',
      icon: Scale,
      status: progress.case_created ? 'complete' : 'pending',
    },
  ]

  const completedSteps = steps.filter(s => s.status === 'complete').length
  const progressPercentage = (completedSteps / steps.length) * 100

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Your Progress</h2>
        <p className="text-gray-600 mt-1">
          {progress.case_created
            ? 'Your case has been set up!'
            : progress.next_action}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Overall Progress</span>
          <span className="font-medium text-blue-600">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="p-6">
        <div className="space-y-4">
          {steps.map((step) => {
            const isComplete = step.status === 'complete'
            const isCurrent = step.status === 'current'

            return (
              <div key={step.id} className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isComplete
                    ? 'bg-green-100 text-green-600'
                    : isCurrent
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {isComplete ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : isCurrent ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${
                      isComplete
                        ? 'text-green-700'
                        : isCurrent
                        ? 'text-blue-700'
                        : 'text-gray-500'
                    }`}>
                      {step.label}
                    </span>
                    {isCurrent && step.id === 'documents' && progress.documents_required > 0 && (
                      <button
                        onClick={() => router.push(`/intake/${intakeId}/documents`)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        Upload
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Alerts */}
      {progress.documents_rejected > 0 && (
        <div className="mx-6 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">
              {progress.documents_rejected} document{progress.documents_rejected > 1 ? 's' : ''} need{progress.documents_rejected === 1 ? 's' : ''} attention
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Please review and re-upload the rejected documents.
            </p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {progress.case_created && (
        <div className="mx-6 mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <PartyPopper className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-800">Your case has been set up!</p>
            <p className="text-sm text-green-700 mt-1">
              You can now access your full case dashboard.
            </p>
            <button
              onClick={() => router.push(`/dashboard/cases/${intake?.converted_to_case_id}`)}
              className="mt-2 text-sm font-medium text-green-700 hover:text-green-800 flex items-center gap-1"
            >
              Go to Case Dashboard
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Celebration for document completion */}
      {progress.intake_submitted &&
       progress.documents_required > 0 &&
       progress.documents_uploaded >= progress.documents_required &&
       progress.documents_rejected === 0 &&
       !progress.case_created && (
        <div className="mx-6 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <PartyPopper className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="font-medium text-blue-800">
            Great job! All required documents uploaded!
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Your intake is under review - we&apos;ll be in touch within 24 hours.
          </p>
        </div>
      )}
    </div>
  )
}
