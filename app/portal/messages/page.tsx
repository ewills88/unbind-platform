'use client'

import { authFetch } from '@/lib/supabase/auth-fetch'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Plus, Send, Loader2, ArrowLeft, X,
  FileText, Search,
} from 'lucide-react'
import {
  PortalConversationWithDetails, PortalMessageWithSender,
  CONVERSATION_TYPE_LABELS, ConversationType,
} from '@/types/portal'

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

interface TemplateItem {
  id: string
  title: string
  content: string
  category: string
}

export default function PortalMessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<PortalConversationWithDetails[]>([])
  const [selectedConversation, setSelectedConversation] = useState<PortalConversationWithDetails | null>(null)
  const [messages, setMessages] = useState<PortalMessageWithSender[]>([])
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newType, setNewType] = useState<ConversationType>('general')
  const [newInitialMessage, setNewInitialMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [searchQuery, setSearchQuery] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchConversations()
    fetchTemplates()
  }, [statusFilter])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Poll for new messages when conversation is open
  const selectedConversationIdRef = useRef<string | null>(null)
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id || null
  }, [selectedConversation?.id])

  useEffect(() => {
    if (!selectedConversation) return
    const conversationId = selectedConversation.id
    const interval = setInterval(() => {
      fetchMessages(conversationId, true)
    }, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id])

  const fetchConversations = async () => {
    try {
      const res = await authFetch(`/api/portal/conversations?status=${statusFilter}`)
      if (res.status === 401) { router.push('/portal/login'); return }
      const data = await res.json()
      setConversations(data.data || [])
    } catch (err) {
      console.error('Fetch conversations error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string, silent = false) => {
    if (!silent) setMessagesLoading(true)
    try {
      const res = await authFetch(`/api/portal/conversations/${conversationId}/messages`)
      const data = await res.json()
      setMessages(data.data || [])

      // Update unread count locally
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, client_unread_count: 0 } : c
      ))
    } catch (err) {
      console.error('Fetch messages error:', err)
    } finally {
      setMessagesLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await authFetch('/api/portal/templates')
      const data = await res.json()
      setTemplates(data.data || [])
    } catch {
      // Templates are optional
    }
  }

  const selectConversation = (conv: PortalConversationWithDetails) => {
    setSelectedConversation(conv)
    fetchMessages(conv.id)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return
    setSending(true)

    try {
      const res = await authFetch(`/api/portal/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      })
      const data = await res.json()
      if (data.data) {
        setMessages(prev => [...prev, data.data])
        setNewMessage('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      }
    } catch (err) {
      console.error('Send message error:', err)
    } finally {
      setSending(false)
    }
  }

  const createConversation = async () => {
    if (!newSubject.trim() || !newInitialMessage.trim()) return
    setSending(true)

    try {
      const res = await authFetch('/api/portal/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newSubject.trim(),
          conversation_type: newType,
          initial_message: newInitialMessage.trim(),
        }),
      })
      const data = await res.json()
      if (data.data) {
        setShowNewConversation(false)
        setNewSubject('')
        setNewType('general')
        setNewInitialMessage('')
        await fetchConversations()
        selectConversation(data.data)
      }
    } catch (err) {
      console.error('Create conversation error:', err)
    } finally {
      setSending(false)
    }
  }

  const closeConversation = async (id: string) => {
    try {
      await authFetch(`/api/portal/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      fetchConversations()
      if (selectedConversation?.id === id) {
        setSelectedConversation(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Close conversation error:', err)
    }
  }

  const applyTemplate = (template: TemplateItem) => {
    setNewMessage(template.content)
    setShowTemplates(false)
    textareaRef.current?.focus()
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const filteredConversations = conversations.filter(c =>
    !searchQuery || c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen bg-white">
      {/* Conversation List */}
      <div className={`${
        selectedConversation ? 'hidden lg:flex' : 'flex'
      } flex-col w-full lg:w-96 border-r border-gray-200`}>
        {/* List Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <button
              onClick={() => setShowNewConversation(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="New Conversation"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-1">
            {['open', 'closed', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-medium">No conversations</p>
              <p className="text-xs text-gray-400 mt-1">Start a new conversation to message your attorney.</p>
              <button
                onClick={() => setShowNewConversation(true)}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                New Conversation
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const typeInfo = CONVERSATION_TYPE_LABELS[conv.conversation_type as ConversationType]
              const isSelected = selectedConversation?.id === conv.id
              const hasUnread = conv.client_unread_count > 0

              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      hasUnread ? 'bg-blue-600' : 'bg-transparent'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm truncate ${
                          hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                        }`}>
                          {conv.subject}
                        </span>
                        {conv.last_message_at && (
                          <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                            {formatRelativeTime(conv.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                          {typeInfo?.label || conv.conversation_type}
                        </span>
                        {conv.status === 'closed' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Closed</span>
                        )}
                      </div>
                      {conv.last_message_preview && (
                        <p className={`text-xs mt-1 truncate ${
                          hasUnread ? 'text-gray-700' : 'text-gray-500'
                        }`}>
                          {conv.last_message_preview}
                        </p>
                      )}
                    </div>
                    {hasUnread && (
                      <span className="bg-blue-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {conv.client_unread_count}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className={`${
        selectedConversation ? 'flex' : 'hidden lg:flex'
      } flex-1 flex-col`}>
        {selectedConversation ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSelectedConversation(null); setMessages([]) }}
                  className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 truncate">
                    {selectedConversation.subject}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      CONVERSATION_TYPE_LABELS[selectedConversation.conversation_type as ConversationType]?.color || 'bg-gray-100'
                    }`}>
                      {CONVERSATION_TYPE_LABELS[selectedConversation.conversation_type as ConversationType]?.label || selectedConversation.conversation_type}
                    </span>
                    {selectedConversation.assignee_name && (
                      <span className="text-xs text-gray-500">
                        Assigned to {selectedConversation.assignee_name}
                      </span>
                    )}
                  </div>
                </div>
                {selectedConversation.status === 'open' && (
                  <button
                    onClick={() => closeConversation(selectedConversation.id)}
                    className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No messages yet</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSystem = msg.sender_role === 'system'
                  const isClient = msg.sender_role === 'client'

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center">
                        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${isClient ? 'order-2' : 'order-1'}`}>
                        {!isClient && (
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-[10px] font-medium">
                                {msg.sender_avatar_initials}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-gray-700">{msg.sender_name}</span>
                          </div>
                        )}
                        <div className={`rounded-2xl px-4 py-2.5 ${
                          isClient
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className={`text-[10px] mt-1 ${
                          isClient ? 'text-right text-gray-400' : 'text-gray-400'
                        }`}>
                          {formatMessageTime(msg.created_at)}
                          {msg.is_read && isClient && ' · Read'}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            {selectedConversation.status === 'open' ? (
              <div className="p-4 border-t border-gray-200 bg-white">
                {/* Templates bar */}
                {showTemplates && templates.length > 0 && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">Quick Replies</span>
                      <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => applyTemplate(t)}
                          className="w-full text-left p-2 text-xs text-gray-700 hover:bg-white rounded transition-colors"
                        >
                          <span className="font-medium">{t.title}</span>
                          <span className="text-gray-400 ml-2 truncate">{t.content.substring(0, 60)}...</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  {templates.length > 0 && (
                    <button
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                      title="Quick replies"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                  )}
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={handleTextareaInput}
                      onKeyDown={handleTextareaKeyDown}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      style={{ maxHeight: '120px' }}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-gray-200 bg-gray-50 text-center">
                <p className="text-sm text-gray-500">This conversation is closed</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Select a conversation</p>
              <p className="text-sm text-gray-400 mt-1">Choose from the list or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">New Conversation</h2>
              <button
                onClick={() => setShowNewConversation(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="What is this about?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ConversationType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  {Object.entries(CONVERSATION_TYPE_LABELS).map(([key, info]) => (
                    <option key={key} value={key}>{info.label} - {info.description}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={newInitialMessage}
                  onChange={(e) => setNewInitialMessage(e.target.value)}
                  placeholder="Write your message..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewConversation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createConversation}
                disabled={!newSubject.trim() || !newInitialMessage.trim() || sending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
