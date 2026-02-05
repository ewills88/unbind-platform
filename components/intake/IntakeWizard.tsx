'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Save,
  Send,
  AlertCircle,
  Loader2,
  User,
  Heart,
  Users,
  DollarSign,
  Scale,
} from 'lucide-react'
import {
  ClientIntake,
  IntakeData,
  STEP_LABELS,
  TOTAL_INTAKE_STEPS,
} from '@/types/intake'
import PersonalInfoStep from './steps/PersonalInfoStep'
import MarriageDetailsStep from './steps/MarriageDetailsStep'
import ChildrenCustodyStep from './steps/ChildrenCustodyStep'
import FinancialOverviewStep from './steps/FinancialOverviewStep'
import LegalGoalsStep from './steps/LegalGoalsStep'

interface IntakeWizardProps {
  intakeId: string
  initialData?: ClientIntake
}

const STEP_ICONS = [User, Heart, Users, DollarSign, Scale]

export default function IntakeWizard({ intakeId, initialData }: IntakeWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(initialData?.current_step || 1)
  const [completedSteps, setCompletedSteps] = useState<number[]>(
    initialData?.completed_steps || []
  )
  const [intakeData, setIntakeData] = useState<IntakeData>(
    initialData?.intake_data || {}
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(
    initialData?.last_saved_at ? new Date(initialData.last_saved_at) : null
  )
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})

  // Auto-save functionality
  const saveProgress = useCallback(async (data: IntakeData, step: number, completed: number[]) => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/intakes/${intakeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_step: step,
          completed_steps: completed,
          intake_data: data,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save progress')
      }

      setLastSaved(new Date())
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save progress. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [intakeId])

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(intakeData).length > 0) {
        saveProgress(intakeData, currentStep, completedSteps)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [intakeData, currentStep, completedSteps, saveProgress])

  const handleStepDataChange = (stepKey: keyof IntakeData, data: IntakeData[keyof IntakeData]) => {
    setIntakeData((prev) => ({
      ...prev,
      [stepKey]: data,
    }))
  }

  const handleStepComplete = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps((prev) => [...prev, step])
    }
  }

  const handleNext = () => {
    handleStepComplete(currentStep)
    if (currentStep < TOTAL_INTAKE_STEPS) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepClick = (step: number) => {
    // Only allow navigation to completed steps or next available step
    if (completedSteps.includes(step) || step <= Math.max(...completedSteps, 0) + 1) {
      setCurrentStep(step)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    setValidationErrors({})

    try {
      const response = await fetch(`/api/intakes/${intakeId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake_data: intakeData }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.validation_errors) {
          setValidationErrors(result.validation_errors)
          setError('Please complete all required fields before submitting.')
        } else {
          throw new Error(result.error || 'Failed to submit intake')
        }
        return
      }

      // Success - redirect to confirmation
      router.push('/intake/success')
    } catch (err) {
      console.error('Submit error:', err)
      setError('Failed to submit intake. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPercentage = Math.round((completedSteps.length / TOTAL_INTAKE_STEPS) * 100)

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalInfoStep
            data={intakeData.personal}
            onChange={(data) => handleStepDataChange('personal', data)}
            errors={validationErrors.personal}
          />
        )
      case 2:
        return (
          <MarriageDetailsStep
            data={intakeData.marriage}
            onChange={(data) => handleStepDataChange('marriage', data)}
            errors={validationErrors.marriage}
          />
        )
      case 3:
        return (
          <ChildrenCustodyStep
            data={intakeData.children}
            onChange={(data) => handleStepDataChange('children', data)}
            errors={validationErrors.children}
          />
        )
      case 4:
        return (
          <FinancialOverviewStep
            data={intakeData.financial}
            onChange={(data) => handleStepDataChange('financial', data)}
            errors={validationErrors.financial}
          />
        )
      case 5:
        return (
          <LegalGoalsStep
            data={intakeData.legalGoals}
            onChange={(data) => handleStepDataChange('legalGoals', data)}
            errors={validationErrors.legalGoals}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Client Intake Questionnaire</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <Save className="w-4 h-4" />
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progressPercentage}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {Array.from({ length: TOTAL_INTAKE_STEPS }, (_, i) => i + 1).map((step) => {
            const Icon = STEP_ICONS[step - 1]
            const isCompleted = completedSteps.includes(step)
            const isCurrent = currentStep === step
            const isAccessible = completedSteps.includes(step) || step <= Math.max(...completedSteps, 0) + 1

            return (
              <button
                key={step}
                onClick={() => handleStepClick(step)}
                disabled={!isAccessible}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  isAccessible ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? 'bg-green-100 text-green-600'
                      : isCurrent
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}
                >
                  {STEP_LABELS[step]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Step {currentStep}: {STEP_LABELS[currentStep]}
        </h2>
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            currentStep === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => saveProgress(intakeData, currentStep, completedSteps)}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Progress
          </button>

          {currentStep < TOTAL_INTAKE_STEPS ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || completedSteps.length < TOTAL_INTAKE_STEPS - 1}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                isSubmitting || completedSteps.length < TOTAL_INTAKE_STEPS - 1
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              Submit Intake
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
