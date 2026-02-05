'use client'

import { useState } from 'react'
import {
  Sparkles,
  X,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  History
} from 'lucide-react'
import { DocumentTemplateType, DOCUMENT_TYPE_INFO } from '@/types/document-templates'

interface AIAssistantProps {
  caseId: string
  documentType?: DocumentTemplateType
  onInsertText?: (text: string) => void
  context?: string
  isOpen?: boolean
  onToggle?: () => void
}

interface DraftHistory {
  id: string
  prompt: string
  response: string
  timestamp: Date
}

const COMMON_PROMPTS = [
  {
    category: 'Custody',
    prompts: [
      'Draft custody declaration for primary custody',
      'Write about my involvement in children\'s daily care',
      'Respond to custody concerns raised by opposing party'
    ]
  },
  {
    category: 'Support',
    prompts: [
      'Draft spousal support argument based on income disparity',
      'Request temporary support during proceedings',
      'Calculate child support based on guideline factors'
    ]
  },
  {
    category: 'Property',
    prompts: [
      'Draft property division proposal (50/50 split)',
      'Identify and describe separate property claims',
      'Respond to property characterization disputes'
    ]
  },
  {
    category: 'General',
    prompts: [
      'Draft settlement proposal covering all issues',
      'Write declaration in support of motion',
      'Draft response to opposing motion'
    ]
  }
]

export default function AIAssistant({
  caseId,
  documentType,
  onInsertText,
  context,
  isOpen = true,
  onToggle
}: AIAssistantProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftResult, setDraftResult] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [showPrompts, setShowPrompts] = useState(false)
  const [history, setHistory] = useState<DraftHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return

    try {
      setLoading(true)
      setError(null)
      setDraftResult(null)
      setWarnings([])

      const response = await fetch('/api/documents/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          case_id: caseId,
          document_type: documentType,
          context
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate draft')
      }

      setDraftResult(data.draft)
      setWarnings(data.warnings || [])

      // Add to history
      setHistory(prev => [{
        id: Date.now().toString(),
        prompt: prompt.trim(),
        response: data.draft,
        timestamp: new Date()
      }, ...prev.slice(0, 9)]) // Keep last 10

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate draft')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!draftResult) return

    await navigator.clipboard.writeText(draftResult)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleInsert = () => {
    if (!draftResult || !onInsertText) return
    onInsertText(draftResult)
  }

  const handlePromptSelect = (selectedPrompt: string) => {
    setPrompt(selectedPrompt)
    setShowPrompts(false)
  }

  const handleHistorySelect = (item: DraftHistory) => {
    setPrompt(item.prompt)
    setDraftResult(item.response)
    setShowHistory(false)
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 p-4 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50"
        title="Open AI Assistant"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-2xl border z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">AI Drafting Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-white/20 rounded"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1 hover:bg-white/20 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          {/* Document context */}
          {documentType && (
            <div className="px-4 py-2 bg-purple-50 text-sm text-purple-700 border-b">
              Drafting: {DOCUMENT_TYPE_INFO[documentType]?.label || documentType}
            </div>
          )}

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            {/* Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  What do you need help writing?
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPrompts(!showPrompts)}
                    className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    <Lightbulb className="w-3 h-3" />
                    Suggestions
                  </button>
                  {history.length > 0 && (
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <History className="w-3 h-3" />
                      History
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Draft a custody declaration explaining why I should have primary custody..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                      handleSubmit()
                    }
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || loading}
                  className="absolute bottom-2 right-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Prompt Suggestions */}
            {showPrompts && (
              <div className="border rounded-lg p-3 bg-gray-50 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Common Prompts</h4>
                {COMMON_PROMPTS.map(category => (
                  <div key={category.category}>
                    <p className="text-xs text-gray-500 mb-1">{category.category}</p>
                    <div className="space-y-1">
                      {category.prompts.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => handlePromptSelect(p)}
                          className="w-full text-left text-xs px-2 py-1.5 hover:bg-purple-100 rounded text-gray-700"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* History */}
            {showHistory && history.length > 0 && (
              <div className="border rounded-lg p-3 bg-gray-50 space-y-2 max-h-40 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-700">Recent Drafts</h4>
                {history.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleHistorySelect(item)}
                    className="w-full text-left text-xs p-2 hover:bg-purple-100 rounded"
                  >
                    <p className="text-gray-700 truncate">{item.prompt}</p>
                    <p className="text-gray-400 text-[10px]">
                      {item.timestamp.toLocaleTimeString()}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Generating draft...</p>
                </div>
              </div>
            )}

            {/* Result */}
            {draftResult && !loading && (
              <div className="space-y-3">
                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2 text-sm text-yellow-700">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        {warnings.map((w, i) => (
                          <p key={i}>{w}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Draft text */}
                <div className="border rounded-lg">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
                    <span className="text-xs font-medium text-gray-600">Generated Draft</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleCopy}
                        className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {draftResult}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {onInsertText && (
                    <button
                      onClick={handleInsert}
                      className="flex-1 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                    >
                      Insert into Document
                    </button>
                  )}
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
            AI-generated content requires attorney review before filing
          </div>
        </>
      )}
    </div>
  )
}
