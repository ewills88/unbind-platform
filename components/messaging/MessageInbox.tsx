'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Search, Loader2, AlertCircle, Inbox } from 'lucide-react'
import { CaseWithMessages } from '@/types/messages'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface MessageInboxProps {
  onSelectCase?: (caseId: string) => void
  selectedCaseId?: string
}

export default function MessageInbox({
  onSelectCase,
  selectedCaseId
}: MessageInboxProps) {
  const router = useRouter()
  const [cases, setCases] = useState<CaseWithMessages[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [totalUnread, setTotalUnread] = useState(0)

  useEffect(() => {
    fetchInbox()
  }, [])

  const fetchInbox = async () => {
    try {
      const response = await authFetch('/api/messages/inbox')
      if (!response.ok) throw new Error('Failed to fetch inbox')

      const data = await response.json()
      setCases(data.cases || [])
      setTotalUnread(data.total_unread || 0)
    } catch (err) {
      console.error('Error fetching inbox:', err)
      setError('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  const filteredCases = cases.filter(c =>
    c.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.spouse_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.case_number && c.case_number.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleCaseClick = (caseId: string) => {
    if (onSelectCase) {
      onSelectCase(caseId)
    } else {
      router.push(`/dashboard/messages/${caseId}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-600">{error}</p>
        <button
          onClick={fetchInbox}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          {totalUnread > 0 && (
            <span className="px-2.5 py-0.5 bg-blue-600 text-white text-sm font-medium rounded-full">
              {totalUnread}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Case list */}
      <div className="flex-1 overflow-y-auto">
        {filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <Inbox className="w-12 h-12 text-gray-300 mb-4" />
            {searchQuery ? (
              <>
                <p className="text-gray-900 font-medium">No cases found</p>
                <p className="text-gray-500 text-sm mt-1">Try a different search term</p>
              </>
            ) : (
              <>
                <p className="text-gray-900 font-medium">No conversations yet</p>
                <p className="text-gray-500 text-sm mt-1">Messages will appear here once you start chatting</p>
              </>
            )}
          </div>
        ) : (
          filteredCases.map(caseItem => (
            <button
              key={caseItem.id}
              onClick={() => handleCaseClick(caseItem.id)}
              className={`w-full px-4 py-3 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors ${
                selectedCaseId === caseItem.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar/Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  caseItem.unread_count > 0 ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <MessageSquare className={`w-5 h-5 ${
                    caseItem.unread_count > 0 ? 'text-blue-600' : 'text-gray-500'
                  }`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm truncate ${
                      caseItem.unread_count > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                    }`}>
                      {caseItem.client_name}
                    </h3>
                    {caseItem.last_message && (
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatTime(caseItem.last_message.created_at)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 truncate">
                    Case #{caseItem.case_number || 'Pending'}
                  </p>

                  {caseItem.last_message && (
                    <p className={`text-sm truncate mt-1 ${
                      caseItem.unread_count > 0 ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      <span className="text-gray-500">
                        {caseItem.last_message.sender_name}:
                      </span>{' '}
                      {truncateMessage(caseItem.last_message.content)}
                    </p>
                  )}
                </div>

                {/* Unread badge */}
                {caseItem.unread_count > 0 && (
                  <span className="w-5 h-5 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center justify-center flex-shrink-0">
                    {caseItem.unread_count > 9 ? '9+' : caseItem.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
