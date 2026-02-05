'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import IntakeWizard from '@/components/intake/IntakeWizard'
import { ClientIntake } from '@/types/intake'

export default function IntakePage() {
  const params = useParams()
  const router = useRouter()
  const [intake, setIntake] = useState<ClientIntake | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const intakeId = params.id as string

  useEffect(() => {
    const fetchIntake = async () => {
      try {
        const response = await fetch(`/api/intakes/${intakeId}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('Intake not found')
          } else if (response.status === 401) {
            router.push('/login')
            return
          } else if (response.status === 403) {
            setError('You do not have access to this intake')
          } else {
            setError('Failed to load intake')
          }
          return
        }

        const data = await response.json()

        // If intake is already submitted, redirect to success page
        if (data.intake.status === 'submitted') {
          router.push('/intake/success')
          return
        }

        setIntake(data.intake)
      } catch (err) {
        console.error('Fetch intake error:', err)
        setError('Failed to load intake')
      } finally {
        setIsLoading(false)
      }
    }

    if (intakeId) {
      fetchIntake()
    }
  }, [intakeId, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your questionnaire...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/intake')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start New Intake
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {intake && (
        <IntakeWizard
          intakeId={intakeId}
          initialData={intake}
        />
      )}
    </div>
  )
}
