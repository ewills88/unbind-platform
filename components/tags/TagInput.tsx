'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Search, Loader2 } from 'lucide-react'
import { Tag, TagColor, TAG_COLORS } from '@/types/tags'
import { TagBadge } from './TagBadge'

interface TagInputProps {
  selectedTags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  placeholder?: string
  maxTags?: number
  allowCreate?: boolean
  disabled?: boolean
  className?: string
}

export function TagInput({
  selectedTags,
  onTagsChange,
  placeholder = 'Add tags...',
  maxTags = 10,
  allowCreate = true,
  disabled = false,
  className = ''
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [createColor, setCreateColor] = useState<TagColor>('blue')

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch tag suggestions
  const fetchSuggestions = useCallback(async (search: string) => {
    if (!search.trim()) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/tags?search=${encodeURIComponent(search)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        // Filter out already selected tags
        const filtered = (data.tags || []).filter(
          (tag: Tag) => !selectedTags.some(t => t.id === tag.id)
        )
        setSuggestions(filtered)
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedTags])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (inputValue.trim()) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(inputValue)
      }, 200)
    } else {
      setSuggestions([])
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [inputValue, fetchSuggestions])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectTag = (tag: Tag) => {
    if (selectedTags.length >= maxTags) return
    onTagsChange([...selectedTags, tag])
    setInputValue('')
    setSuggestions([])
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter(t => t.id !== tagId))
  }

  const handleCreateTag = async () => {
    if (!inputValue.trim() || !allowCreate) return
    if (selectedTags.length >= maxTags) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inputValue.trim(), color: createColor })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.tag) {
          handleSelectTag(data.tag)
        }
      }
    } catch (error) {
      console.error('Error creating tag:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const maxIndex = suggestions.length + (allowCreate && inputValue.trim() ? 0 : -1)
      setHighlightedIndex(prev => Math.min(prev + 1, maxIndex))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectTag(suggestions[highlightedIndex])
      } else if (
        allowCreate &&
        inputValue.trim() &&
        (highlightedIndex === suggestions.length || suggestions.length === 0)
      ) {
        handleCreateTag()
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setInputValue('')
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      handleRemoveTag(selectedTags[selectedTags.length - 1].id)
    }
  }

  const showCreateOption = allowCreate && inputValue.trim() && !suggestions.some(
    t => t.name.toLowerCase() === inputValue.trim().toLowerCase()
  )

  const showDropdown = isOpen && (suggestions.length > 0 || showCreateOption || isLoading)

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          flex flex-wrap items-center gap-1.5 min-h-[42px] p-2
          border rounded-lg bg-white
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500'}
          ${showDropdown ? 'rounded-b-none border-b-0' : ''}
          border-gray-300
        `}
      >
        {selectedTags.map(tag => (
          <TagBadge
            key={tag.id}
            tag={tag}
            showRemove={!disabled}
            onRemove={() => handleRemoveTag(tag.id)}
          />
        ))}
        <div className="flex-1 min-w-[120px] flex items-center gap-1">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setIsOpen(true)
              setHighlightedIndex(-1)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedTags.length >= maxTags ? 'Max tags reached' : placeholder}
            disabled={disabled || selectedTags.length >= maxTags}
            className={`
              flex-1 min-w-0 outline-none text-sm bg-transparent
              placeholder:text-gray-400
              ${disabled ? 'cursor-not-allowed' : ''}
            `}
          />
          {isLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
        </div>
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="
            absolute z-50 w-full
            bg-white border border-t-0 border-gray-300 rounded-b-lg
            shadow-lg max-h-60 overflow-auto
          "
        >
          {suggestions.map((tag, index) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleSelectTag(tag)}
              className={`
                w-full px-3 py-2 text-left text-sm
                flex items-center justify-between
                ${highlightedIndex === index ? 'bg-blue-50' : 'hover:bg-gray-50'}
              `}
            >
              <TagBadge tag={tag} />
              <span className="text-xs text-gray-400">
                {tag.usage_count} uses
              </span>
            </button>
          ))}

          {showCreateOption && (
            <button
              type="button"
              onClick={handleCreateTag}
              className={`
                w-full px-3 py-2 text-left text-sm
                flex items-center gap-2
                ${highlightedIndex === suggestions.length ? 'bg-blue-50' : 'hover:bg-gray-50'}
                border-t border-gray-100
              `}
            >
              <Plus className="w-4 h-4 text-gray-500" />
              <span>Create &quot;{inputValue.trim()}&quot;</span>
              <div className="ml-auto flex items-center gap-1">
                {(['blue', 'green', 'orange', 'purple', 'red'] as TagColor[]).map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCreateColor(color)
                    }}
                    className={`
                      w-4 h-4 rounded-full
                      ${TAG_COLORS[color].bg}
                      ${createColor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}
                    `}
                    aria-label={`Use ${color} color`}
                  />
                ))}
              </div>
            </button>
          )}

          {isLoading && suggestions.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              Searching...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
