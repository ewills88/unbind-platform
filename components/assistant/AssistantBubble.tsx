'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, ChevronDown, MoreVertical, Sparkles, X } from 'lucide-react'
import { useAssistantContext } from '@/hooks/useAssistantContext'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const ATTORNEY_QUESTIONS_FIRM = [
  'What deadlines do I have this week?',
  'Which cases have outstanding invoices?',
  'Which cases have had no activity recently?',
]

const ATTORNEY_QUESTIONS_CASE = [
  'What documents am I still missing?',
  'What tasks are overdue on this case?',
  'Summarize where this case stands',
]

const CLIENT_QUESTIONS = [
  "What's happening with my case?",
  'What do I need to send my attorney?',
  'How do I pay my invoice?',
]

export default function AssistantBubble() {
  const { audience, caseId } = useAssistantContext()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [hasPulsed, setHasPulsed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Load persisted state
  useEffect(() => {
    const savedState = localStorage.getItem('unbind_assistant_state')
    if (savedState === 'open') setIsOpen(true)
    const pulsed = localStorage.getItem('unbind_assistant_pulsed')
    if (pulsed === 'true') setHasPulsed(true)
    const disabledPref = localStorage.getItem('unbind_assistant_disabled')
    if (disabledPref === 'true') setDisabled(true)
  }, [])

  // Persist expanded/minimized state
  useEffect(() => {
    localStorage.setItem('unbind_assistant_state', isOpen ? 'open' : 'closed')
    if (isOpen && !hasPulsed) {
      setHasPulsed(true)
      localStorage.setItem('unbind_assistant_pulsed', 'true')
    }
  }, [isOpen, hasPulsed])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  if (disabled) return null

  const suggestedQuestions = audience === 'client'
    ? CLIENT_QUESTIONS
    : caseId ? ATTORNEY_QUESTIONS_CASE : ATTORNEY_QUESTIONS_FIRM

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = { role: 'user', content: content.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await authFetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          audience,
          caseId: caseId || undefined,
          threadHistory: updatedMessages.slice(0, -1),
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let assistantContent = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value, { stream: true })
        const current = assistantContent
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: current }
          return updated
        })
      }

      if (!assistantContent.trim()) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: "I wasn't able to generate a response. Please try again.",
          }
          return updated
        })
      }
    } catch {
      setMessages(prev => [
        ...prev.filter(m => m.content !== ''),
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble right now. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleDisable = () => {
    setDisabled(true)
    localStorage.setItem('unbind_assistant_disabled', 'true')
    setShowMenu(false)
  }

  const handleClearConversation = () => {
    setMessages([])
    setShowMenu(false)
  }

  // Collapsed bubble
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed right-6 z-50 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center justify-center group ${
          !hasPulsed ? 'animate-pulse' : ''
        }`}
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
        title="Need help?"
      >
        <Sparkles className="w-6 h-6" />
        <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Need help?
        </span>
      </button>
    )
  }

  // Expanded panel
  return (
    <>
      {/* Mobile: full-width bottom sheet overlay */}
      <div className="fixed inset-0 bg-black/30 z-40 sm:hidden" onClick={() => setIsOpen(false)} />

      <div className="fixed z-50 right-0 w-full sm:right-6 sm:w-[380px] h-[520px] sm:h-[520px] max-h-[calc(100vh-2rem)] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shrink-0 sm:rounded-t-2xl rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <div>
              <h3 className="font-semibold text-sm">
                {audience === 'attorney' ? 'Unbind Assistant' : 'Need Help?'}
              </h3>
              {caseId && audience === 'attorney' && (
                <p className="text-blue-100 text-[10px]">Viewing case context</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-blue-500 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={handleClearConversation}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Clear conversation
                  </button>
                  <button
                    onClick={handleDisable}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <X className="w-3.5 h-3.5 inline mr-2" />
                    Disable assistant
                  </button>
                </div>
              )}
            </div>
            {/* Minimize */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-blue-500 rounded-lg transition-colors"
              title="Minimize"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {audience === 'attorney'
                  ? 'Ask me about your cases, deadlines, or billing.'
                  : 'Ask me about your case or how to use the portal.'}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        {messages.length === 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{ maxHeight: '80px' }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
