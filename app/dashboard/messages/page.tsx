'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '@/components/layout/Sidebar'
import { MessageInbox, MessageThread } from '@/components/messaging'
import { ChevronLeft, MessageSquare } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function MessagesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    searchParams.get('case') || null
  )
  const [selectedCaseName, setSelectedCaseName] = useState<string>('')
  const [isMobileView, setIsMobileView] = useState(false)
  const [showThread, setShowThread] = useState(false)

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)
    }
    checkAuth()
  }, [router])

  // Handle responsive view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle case selection
  const handleSelectCase = async (caseId: string) => {
    setSelectedCaseId(caseId)
    setShowThread(true)

    // Update URL
    router.push(`/dashboard/messages?case=${caseId}`, { scroll: false })

    // Fetch case name for header
    const { data: caseData } = await supabase
      .from('cases')
      .select('client_name, spouse_name')
      .eq('id', caseId)
      .single()

    if (caseData) {
      setSelectedCaseName(caseData.client_name)
    }
  }

  const handleBackToInbox = () => {
    setShowThread(false)
    setSelectedCaseId(null)
    router.push('/dashboard/messages', { scroll: false })
  }

  if (!currentUserId) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-hidden">
        <div className="h-screen flex flex-col md:flex-row">
          {/* Inbox sidebar (desktop) / Full view (mobile when no selection) */}
          <div
            className={`
              bg-white border-r border-gray-200
              ${isMobileView
                ? showThread ? 'hidden' : 'w-full'
                : 'w-80 flex-shrink-0'
              }
            `}
          >
            <MessageInbox
              onSelectCase={handleSelectCase}
              selectedCaseId={selectedCaseId || undefined}
            />
          </div>

          {/* Message thread (desktop) / Full view (mobile when selected) */}
          <div
            className={`
              flex-1 flex flex-col bg-white
              ${isMobileView
                ? showThread ? 'w-full' : 'hidden'
                : ''
              }
            `}
          >
            {selectedCaseId ? (
              <>
                {/* Thread header */}
                <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                  {isMobileView && (
                    <button
                      onClick={handleBackToInbox}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                  )}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{selectedCaseName || 'Messages'}</h2>
                      <button
                        onClick={() => router.push(`/dashboard/cases/${selectedCaseId}`)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        View case details
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 hidden sm:block">
                    Press Ctrl+F to search
                  </div>
                </div>

                {/* Message thread */}
                <MessageThread
                  caseId={selectedCaseId}
                  currentUserId={currentUserId}
                  onMessageSent={() => {
                    // Could trigger inbox refresh if needed
                  }}
                />
              </>
            ) : (
              /* Empty state - no case selected (desktop only) */
              !isMobileView && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                    <p className="text-gray-600">Choose a case from the sidebar to view messages</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}
