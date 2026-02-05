'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import DocumentChecklist from '@/components/intake/DocumentChecklist'
import IntakeProgress from '@/components/intake/IntakeProgress'
import { ClientIntake } from '@/types/intake'

export default function IntakeDocumentsPage() {
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
          <p className="text-gray-600">Loading documents...</p>
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
            Back to Intake
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/intake/${intakeId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Questionnaire
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Document Collection</h1>
          <p className="text-gray-600 mt-1">
            Upload the required documents to complete your intake process.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Document Checklist */}
          <div className="lg:col-span-2">
            <DocumentChecklist intakeId={intakeId} />
          </div>

          {/* Sidebar - Progress */}
          <div className="lg:col-span-1">
            <IntakeProgress intakeId={intakeId} intake={intake || undefined} />

            {/* Tips */}
            <div className="mt-6 bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Tips for Document Upload</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  Make sure documents are clear and readable
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  PDF format is preferred for multi-page documents
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  Ensure all pages are included
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  Remove any highlighting or markings if possible
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  Bank statements should show account holder name
                </li>
              </ul>
            </div>

            {/* Need Help */}
            <div className="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
              <p className="text-sm text-blue-800">
                If you&apos;re having trouble locating or uploading any documents,
                contact our office and we&apos;ll guide you through the process.
              </p>
              <a
                href="tel:555-123-4567"
                className="mt-2 inline-block text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                Call (555) 123-4567
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
