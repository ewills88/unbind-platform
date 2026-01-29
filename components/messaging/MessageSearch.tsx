'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import { MessageWithSender } from '@/types/messages'

interface MessageSearchProps {
  caseId: string
  onResultSelect: (messageId: string) => void
  onClose: () => void
}

interface SearchResult {
  id: string
  content: string
  sender_name: string
  created_at: string
  highlight_start: number
  highlight_end: number
}

export default function MessageSearch({
  caseId,
  onResultSelect,
  onClose
}: MessageSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim().length < 2) {
      setResults([])
      setTotalCount(0)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await fetch(
          `/api/cases/${caseId}/messages?search=${encodeURIComponent(query)}&limit=50`
        )
        if (response.ok) {
          const data = await response.json()
          const searchResults: SearchResult[] = (data.messages || []).map((msg: MessageWithSender) => {
            const lowerContent = msg.content.toLowerCase()
            const lowerQuery = query.toLowerCase()
            const highlightStart = lowerContent.indexOf(lowerQuery)
            const highlightEnd = highlightStart + query.length

            return {
              id: msg.id,
              content: msg.content,
              sender_name: msg.sender?.full_name || 'Unknown',
              created_at: msg.created_at,
              highlight_start: highlightStart,
              highlight_end: highlightEnd
            }
          })
          setResults(searchResults)
          setTotalCount(data.total_count || searchResults.length)
          setCurrentIndex(0)
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, caseId])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && results.length > 0) {
        onResultSelect(results[currentIndex].id)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCurrentIndex(prev => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCurrentIndex(prev => Math.max(prev - 1, 0))
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [results, currentIndex, onResultSelect, onClose])

  const navigateResult = (direction: 'up' | 'down') => {
    if (results.length === 0) return

    if (direction === 'down') {
      const newIndex = Math.min(currentIndex + 1, results.length - 1)
      setCurrentIndex(newIndex)
      onResultSelect(results[newIndex].id)
    } else {
      const newIndex = Math.max(currentIndex - 1, 0)
      setCurrentIndex(newIndex)
      onResultSelect(results[newIndex].id)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  const highlightText = (text: string, start: number, end: number) => {
    if (start < 0) return text.substring(0, 100) + (text.length > 100 ? '...' : '')

    const before = text.substring(Math.max(0, start - 30), start)
    const match = text.substring(start, end)
    const after = text.substring(end, end + 50)

    return (
      <>
        {start > 30 && '...'}
        {before}
        <mark className="bg-yellow-200 text-yellow-900 px-0.5 rounded">{match}</mark>
        {after}
        {end + 50 < text.length && '...'}
      </>
    )
  }

  return (
    <div className="absolute inset-x-0 top-0 bg-white border-b border-gray-200 shadow-lg z-30">
      <div className="flex items-center gap-2 p-3">
        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 text-sm focus:outline-none"
        />

        {isSearching && (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        )}

        {results.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>{currentIndex + 1} of {totalCount}</span>
            <button
              onClick={() => navigateResult('up')}
              disabled={currentIndex === 0}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigateResult('down')}
              disabled={currentIndex === results.length - 1}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Results dropdown */}
      {results.length > 0 && (
        <div className="max-h-64 overflow-y-auto border-t border-gray-100">
          {results.map((result, index) => (
            <button
              key={result.id}
              onClick={() => {
                setCurrentIndex(index)
                onResultSelect(result.id)
              }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 ${
                index === currentIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {result.sender_name}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(result.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {highlightText(result.content, result.highlight_start, result.highlight_end)}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {query.trim().length >= 2 && !isSearching && results.length === 0 && (
        <div className="p-4 text-center text-gray-500 text-sm border-t border-gray-100">
          No messages found for &quot;{query}&quot;
        </div>
      )}

      {/* Hint */}
      {query.trim().length < 2 && (
        <div className="p-3 text-center text-gray-400 text-xs border-t border-gray-100">
          Type at least 2 characters to search
        </div>
      )}
    </div>
  )
}
