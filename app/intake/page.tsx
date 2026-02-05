'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ArrowRight, Clock, Shield, CheckCircle, Loader2 } from 'lucide-react'

export default function IntakeStartPage() {
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartIntake = async () => {
    setIsStarting(true)
    setError(null)

    try {
      const response = await fetch('/api/intakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 409 && result.existingIntakeId) {
          // Redirect to existing intake
          router.push(`/intake/${result.existingIntakeId}`)
          return
        }
        throw new Error(result.error || 'Failed to start intake')
      }

      // Redirect to new intake
      router.push(`/intake/${result.intake.id}`)
    } catch (err) {
      console.error('Start intake error:', err)
      setError(err instanceof Error ? err.message : 'Failed to start intake')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-6">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Client Intake Questionnaire
          </h1>
          <p className="text-lg text-gray-600">
            Complete this questionnaire to help your attorney understand your situation
            and provide the best possible guidance for your case.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <Clock className="w-6 h-6 text-blue-500 mb-2" />
            <h3 className="font-medium text-gray-900">15-20 Minutes</h3>
            <p className="text-sm text-gray-600">Estimated completion time</p>
          </div>
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <Shield className="w-6 h-6 text-green-500 mb-2" />
            <h3 className="font-medium text-gray-900">Confidential</h3>
            <p className="text-sm text-gray-600">Your information is secure</p>
          </div>
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <CheckCircle className="w-6 h-6 text-purple-500 mb-2" />
            <h3 className="font-medium text-gray-900">Auto-Save</h3>
            <p className="text-sm text-gray-600">Progress saved automatically</p>
          </div>
        </div>

        {/* What to Expect */}
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">What to Expect</h2>
          <p className="text-gray-600 mb-4">
            The questionnaire covers 5 sections:
          </p>
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                1
              </span>
              <div>
                <span className="font-medium text-gray-900">Personal Information</span>
                <p className="text-sm text-gray-600">Your and your spouse&apos;s contact details</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                2
              </span>
              <div>
                <span className="font-medium text-gray-900">Marriage Details</span>
                <p className="text-sm text-gray-600">Marriage history and current situation</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                3
              </span>
              <div>
                <span className="font-medium text-gray-900">Children & Custody</span>
                <p className="text-sm text-gray-600">Information about children and custody preferences</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                4
              </span>
              <div>
                <span className="font-medium text-gray-900">Financial Overview</span>
                <p className="text-sm text-gray-600">Employment, assets, and debts</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                5
              </span>
              <div>
                <span className="font-medium text-gray-900">Legal Goals</span>
                <p className="text-sm text-gray-600">Your priorities and desired outcomes</p>
              </div>
            </li>
          </ol>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Start Button */}
        <div className="text-center">
          <button
            onClick={handleStartIntake}
            disabled={isStarting}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                Begin Questionnaire
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          <p className="text-sm text-gray-500 mt-4">
            You can save your progress and return later at any time.
          </p>
        </div>
      </div>
    </div>
  )
}
