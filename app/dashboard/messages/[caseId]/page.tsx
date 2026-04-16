'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '@/components/layout/Sidebar'
import { MessageThread } from '@/components/messaging'
import { ChevronLeft, MessageSquare, Loader2 } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface CaseData {
  id: string
  case_number: string | null
  client_name: string
  spouse_name: string
  status: string
}

export default function CaseMessagesPage() {
  const router = useRouter()
  const params = useParams()
  const caseId = params.caseId as string

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check auth and load case
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setCurrentUserId(user.id)

        // Load case data
        const { data: caseData, error: caseError } = await supabase
          .from('cases')
          .select('id, case_number, client_name, spouse_name, status')
          .eq('id', caseId)
          .single()

        if (caseError || !caseData) {
          setError('Case not found or access denied')
          return
        }

        setCaseData(caseData)
      } catch (err) {
        console.error('Error initializing:', err)
        setError('Failed to load case')
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [caseId, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-[#0d1526]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !caseData || !currentUserId) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-[#0d1526]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error || 'Something went wrong'}</p>
            <button
              onClick={() => router.push('/dashboard/messages')}
              className="text-blue-600 hover:text-blue-700"
            >
              Return to messages
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0d1526]">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-[#111827] border-b border-gray-200 dark:border-[#1f2937] px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/messages')}
            className="p-1 hover:bg-gray-100 dark:hover:bg-[#1f2937] rounded-full"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{caseData.client_name}</h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  Case #{caseData.case_number || 'Pending'}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  caseData.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {caseData.status}
                </span>
              </div>
            </div>
          </div>

          <div className="ml-auto">
            <button
              onClick={() => router.push(`/dashboard/cases/${caseId}`)}
              className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              View Case
            </button>
          </div>
        </div>

        {/* Message thread */}
        <div className="flex-1 overflow-hidden">
          <MessageThread
            caseId={caseId}
            currentUserId={currentUserId}
          />
        </div>
      </main>
    </div>
  )
}
