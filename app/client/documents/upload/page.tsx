'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import MobileDocumentUpload from '@/components/client/MobileDocumentUpload'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ClientUploadPage() {
  const router = useRouter()
  const [caseId, setCaseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCase() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: caseData } = await supabase
        .from('cases')
        .select('id')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (caseData) setCaseId(caseData.id)
      setLoading(false)
    }
    loadCase()
  }, [router])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!caseId) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-gray-600">No active case found.</p>
        <Link href="/client" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/client/documents"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Documents
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
        <p className="text-sm text-gray-500 mt-1">
          Take a photo or select files from your device.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <MobileDocumentUpload
          caseId={caseId}
          onUploadComplete={() => router.push('/client/documents')}
        />
      </div>

      {/* Tips */}
      <div className="mt-6 bg-blue-50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Tips for Good Uploads</h3>
        <ul className="text-sm text-blue-800 space-y-1.5">
          <li>- Ensure documents are well-lit and in focus</li>
          <li>- Include all pages of multi-page documents</li>
          <li>- Accepted formats: PDF, JPG, PNG, Word docs</li>
          <li>- Max file size: 50MB per file</li>
        </ul>
      </div>
    </div>
  )
}
