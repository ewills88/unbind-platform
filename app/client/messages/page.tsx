'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { MessageSquare, Phone, Clock, ArrowLeft, Loader2, User } from 'lucide-react'
import { MessageThread } from '@/components/messaging'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface CaseInfo {
  id: string
  client_name: string
  attorney_id: string
  attorney_name: string
  attorney_phone: string | null
}

function ClientMessagesContent() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChatData()
  }, [])

  const loadChatData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      // Get client's case with attorney info
      const { data: caseData } = await supabase
        .from('cases')
        .select('id, client_name, attorney_id')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!caseData) {
        setLoading(false)
        return
      }

      // Get attorney profile
      let attorneyName = 'Your Attorney'
      let attorneyPhone: string | null = null
      if (caseData.attorney_id) {
        const { data: attorney } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', caseData.attorney_id)
          .single()
        if (attorney) {
          attorneyName = attorney.full_name || 'Your Attorney'
          attorneyPhone = attorney.phone
        }
      }

      setCaseInfo({
        id: caseData.id,
        client_name: caseData.client_name,
        attorney_id: caseData.attorney_id,
        attorney_name: attorneyName,
        attorney_phone: attorneyPhone,
      })
    } catch (err) {
      console.error('Error loading chat data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!currentUserId || !caseInfo) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Messages</h3>
          <p className="text-gray-600">No active case found for messaging.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{caseInfo.attorney_name}</h3>
            <p className="text-xs text-gray-500">Your Attorney</p>
          </div>
          {caseInfo.attorney_phone && (
            <a
              href={`tel:${caseInfo.attorney_phone}`}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Call attorney"
            >
              <Phone className="w-5 h-5" />
            </a>
          )}
        </div>

        {/* Office hours notice */}
        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Office hours: Mon-Fri 9am-5pm. We typically respond within 24 hours.
          </p>
        </div>
      </div>

      {/* Message thread (reuses existing component) */}
      <div className="flex-1 overflow-hidden">
        <MessageThread
          caseId={caseInfo.id}
          currentUserId={currentUserId}
        />
      </div>

      {/* Quick replies */}
      <div className="bg-white border-t border-gray-100 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <QuickReplyButton label="Thank you" />
          <QuickReplyButton label="I have a question" />
          <QuickReplyButton label="When is my next deadline?" />
          <QuickReplyButton label="I need to reschedule" />
        </div>
      </div>
    </div>
  )
}

function QuickReplyButton({ label }: { label: string }) {
  // Quick replies work by programmatically setting the composer's content
  // Since MessageThread manages the composer internally, we use a custom event
  const handleClick = () => {
    // Dispatch a custom event that the MessageComposer can listen for
    window.dispatchEvent(new CustomEvent('quick-reply', { detail: label }))
  }

  return (
    <button
      onClick={handleClick}
      className="whitespace-nowrap px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors min-h-[32px]"
    >
      {label}
    </button>
  )
}

export default function ClientMessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    }>
      <ClientMessagesContent />
    </Suspense>
  )
}
