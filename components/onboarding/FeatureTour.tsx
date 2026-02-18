'use client'

// Session 25: Feature Tour Component
// Tooltip-style overlay positioned near target elements with step navigation

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface TourStep {
  title: string
  content: string
  target?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

interface FeatureTourProps {
  featureKey: string
  userId: string
  onComplete?: () => void
}

export default function FeatureTour({ featureKey, userId, onComplete }: FeatureTourProps) {
  const [tourId, setTourId] = useState<string | null>(null)
  const [steps, setSteps] = useState<TourStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    async function fetchTour() {
      try {
        const res = await fetch(`/api/onboarding/tour?featureKey=${featureKey}`)
        if (!res.ok) return

        const tour = await res.json()
        if (!tour || !tour.steps || tour.steps.length === 0) return

        // Check if user already completed this tour
        const progressRes = await fetch(`/api/onboarding/tour-progress?userId=${userId}&tourId=${tour.id}`)
        if (progressRes.ok) {
          const progress = await progressRes.json()
          if (progress?.is_completed) return
        }

        setTourId(tour.id)
        setSteps(tour.steps)
        setVisible(true)
      } catch {
        // Tour fetch failed silently
      }
    }

    fetchTour()
  }, [featureKey, userId])

  const updatePosition = useCallback(() => {
    const step = steps[currentStep]
    if (!step?.target) {
      setPosition({ top: 120, left: window.innerWidth / 2 - 160 })
      return
    }

    const el = document.querySelector(step.target)
    if (!el) {
      setPosition({ top: 120, left: window.innerWidth / 2 - 160 })
      return
    }

    const rect = el.getBoundingClientRect()
    const pos = step.position || 'bottom'

    switch (pos) {
      case 'top':
        setPosition({ top: rect.top - 10, left: rect.left + rect.width / 2 - 160 })
        break
      case 'bottom':
        setPosition({ top: rect.bottom + 10, left: rect.left + rect.width / 2 - 160 })
        break
      case 'left':
        setPosition({ top: rect.top + rect.height / 2 - 60, left: rect.left - 330 })
        break
      case 'right':
        setPosition({ top: rect.top + rect.height / 2 - 60, left: rect.right + 10 })
        break
    }
  }, [steps, currentStep])

  useEffect(() => {
    if (visible && steps.length > 0) {
      updatePosition()
      window.addEventListener('resize', updatePosition)
      return () => window.removeEventListener('resize', updatePosition)
    }
  }, [visible, steps, currentStep, updatePosition])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setVisible(false)
    if (tourId) {
      try {
        await fetch('/api/onboarding/complete-tour', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, tourId }),
        })
      } catch {
        // Tour completion failed silently
      }
    }
    onComplete?.()
  }

  const handleSkip = () => {
    handleComplete()
  }

  if (!visible || steps.length === 0) return null

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-[9998] transition-opacity duration-200"
        onClick={handleSkip}
      />

      {/* Tour tooltip */}
      <div
        className="fixed z-[9999] w-80 bg-white rounded-lg shadow-xl border border-gray-200 transition-all duration-300"
        style={{ top: position.top, left: position.left }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">{step.title}</h3>
          <button
            onClick={handleSkip}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-600 leading-relaxed">{step.content}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <span className="text-xs text-gray-400">
            {currentStep + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              {isLast ? 'Done' : 'Next'}
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
