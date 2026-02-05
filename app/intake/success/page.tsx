'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle, Home, FileText, Phone } from 'lucide-react'

export default function IntakeSuccessPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Intake Submitted Successfully!
        </h1>

        <p className="text-lg text-gray-600 mb-8">
          Thank you for completing the intake questionnaire. Your attorney has been
          notified and will review your information shortly.
        </p>

        {/* What Happens Next */}
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-8 text-left">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">What Happens Next?</h2>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                1
              </span>
              <div>
                <span className="font-medium text-gray-900">Review</span>
                <p className="text-sm text-gray-600">
                  Your attorney will review your questionnaire responses.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                2
              </span>
              <div>
                <span className="font-medium text-gray-900">Contact</span>
                <p className="text-sm text-gray-600">
                  You&apos;ll receive a call or email to schedule your consultation.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                3
              </span>
              <div>
                <span className="font-medium text-gray-900">Consultation</span>
                <p className="text-sm text-gray-600">
                  Discuss your case and next steps with your attorney.
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Contact Info */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-8">
          <Phone className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <p className="text-blue-900">
            Have questions? Contact our office at{' '}
            <a href="tel:555-123-4567" className="font-medium underline">
              (555) 123-4567
            </a>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5" />
            Print Confirmation
          </button>
        </div>
      </div>
    </div>
  )
}
