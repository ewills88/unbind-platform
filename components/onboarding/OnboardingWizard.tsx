'use client'

import { useState, useEffect } from 'react'
import {
  MessageSquare,
  FileText,
  Calendar,
  DollarSign,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  X,
  PartyPopper,
} from 'lucide-react'
import { ONBOARDING_STEPS } from '@/types/intake-workflow'

interface OnboardingWizardProps {
  userId: string
  caseId: string
  onComplete?: () => void
  onSkip?: () => void
}

const STEP_ICONS = {
  welcome: PartyPopper,
  messages: MessageSquare,
  documents: FileText,
  timeline: Calendar,
  finances: DollarSign,
  tasks: CheckSquare,
}

const STEP_CONTENT = {
  welcome: {
    title: 'Welcome to Your Case Portal',
    description: 'This is your secure space to manage your divorce case. Let us show you around.',
    tips: [
      'All your case information is in one place',
      'Communicate securely with your attorney',
      'Track progress and upcoming deadlines',
    ],
  },
  messages: {
    title: 'Secure Messaging',
    description: 'Send messages to your attorney through our secure portal.',
    tips: [
      'All messages are encrypted and confidential',
      'Attach documents directly to messages',
      'Get notified when your attorney responds',
    ],
  },
  documents: {
    title: 'Document Management',
    description: 'Upload and organize all your case documents.',
    tips: [
      'Drag and drop files to upload',
      'Documents are automatically categorized',
      'Access your documents anytime, anywhere',
    ],
  },
  timeline: {
    title: 'Case Timeline',
    description: 'Track important dates and milestones in your case.',
    tips: [
      'See upcoming deadlines at a glance',
      'Receive reminders for important dates',
      'Track your case progress',
    ],
  },
  finances: {
    title: 'Financial Overview',
    description: 'View and manage financial information for your case.',
    tips: [
      'Track assets and debts',
      'See income comparisons',
      'Plan property division scenarios',
    ],
  },
  tasks: {
    title: 'Your Tasks',
    description: 'Complete tasks assigned by your attorney.',
    tips: [
      'See what you need to do next',
      'Mark tasks as complete',
      'Stay on top of deadlines',
    ],
  },
}

export default function OnboardingWizard({
  userId,
  caseId: _caseId,
  onComplete,
  onSkip,
}: OnboardingWizardProps) {
  void _caseId // Reserved for future case-specific onboarding
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [isVisible, setIsVisible] = useState(true)

  const steps = ONBOARDING_STEPS
  const currentStepData = steps[currentStep]
  const stepId = currentStepData?.id as keyof typeof STEP_ICONS
  const StepIcon = STEP_ICONS[stepId] || PartyPopper
  const content = STEP_CONTENT[stepId]

  useEffect(() => {
    // Check if onboarding was already completed
    const checkOnboarding = async () => {
      try {
        const response = await fetch(`/api/onboarding/${userId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.onboarding?.tour_completed || data.onboarding?.tour_skipped) {
            setIsVisible(false)
          }
        }
      } catch (error) {
        console.error('Error checking onboarding:', error)
      }
    }
    checkOnboarding()
  }, [userId])

  const handleNext = () => {
    // Mark current step as completed
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId])
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = async () => {
    try {
      await fetch(`/api/onboarding/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tour_skipped: true }),
      })
    } catch (error) {
      console.error('Error skipping onboarding:', error)
    }

    setIsVisible(false)
    onSkip?.()
  }

  const handleComplete = async () => {
    try {
      await fetch(`/api/onboarding/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_completed: true,
          steps_completed: completedSteps,
        }),
      })
    } catch (error) {
      console.error('Error completing onboarding:', error)
    }

    setIsVisible(false)
    onComplete?.()
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <StepIcon className="w-8 h-8 text-blue-600" />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {content?.title}
          </h2>
          <p className="text-gray-600 mb-6">
            {content?.description}
          </p>

          {/* Tips */}
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <ul className="space-y-2">
              {content?.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-500 mt-0.5">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Dots */}
        <div className="flex justify-center gap-2 pb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentStep
                  ? 'bg-blue-600'
                  : i < currentStep
                  ? 'bg-blue-300'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
