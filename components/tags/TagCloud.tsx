'use client'

import { useEffect, useState } from 'react'
import { Tag, TAG_COLORS } from '@/types/tags'
import { Loader2 } from 'lucide-react'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface TagCloudProps {
  selectedTagIds: string[]
  onTagSelect: (tagId: string) => void
  onTagDeselect: (tagId: string) => void
  className?: string
}

export function TagCloud({
  selectedTagIds,
  onTagSelect,
  onTagDeselect,
  className = ''
}: TagCloudProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await authFetch('/api/tags?limit=30')
        if (response.ok) {
          const data = await response.json()
          setTags(data.tags || [])
        }
      } catch (error) {
        console.error('Error fetching tags:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTags()
  }, [])

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-4 ${className}`}>
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (tags.length === 0) {
    return (
      <div className={`text-sm text-gray-500 py-2 ${className}`}>
        No tags available
      </div>
    )
  }

  // Calculate font sizes based on usage count
  const maxUsage = Math.max(...tags.map(t => t.usage_count), 1)
  const getSize = (usage: number) => {
    const ratio = usage / maxUsage
    if (ratio > 0.7) return 'text-base'
    if (ratio > 0.4) return 'text-sm'
    return 'text-xs'
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map(tag => {
        const isSelected = selectedTagIds.includes(tag.id)
        const colors = TAG_COLORS[tag.color] || TAG_COLORS.gray

        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => isSelected ? onTagDeselect(tag.id) : onTagSelect(tag.id)}
            className={`
              px-2.5 py-1 rounded-full font-medium transition-all
              ${getSize(tag.usage_count)}
              ${isSelected
                ? `${colors.bg} ${colors.text} ${colors.border} border-2 ring-2 ring-offset-1 ring-${tag.color}-300`
                : `bg-gray-50 text-gray-600 border border-gray-200 hover:${colors.bg} hover:${colors.text}`
              }
            `}
          >
            {tag.name}
            {tag.usage_count > 0 && (
              <span className="ml-1 opacity-60">({tag.usage_count})</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface TagFilterBarProps {
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
  className?: string
}

export function TagFilterBar({
  selectedTagIds,
  onTagsChange,
  className = ''
}: TagFilterBarProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await authFetch('/api/tags?limit=20')
        if (response.ok) {
          const data = await response.json()
          setTags(data.tags || [])
        }
      } catch (error) {
        console.error('Error fetching tags:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTags()
  }, [])

  const handleToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId))
    } else {
      onTagsChange([...selectedTagIds, tagId])
    }
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-500">Tags:</span>
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (tags.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-1 ${className}`}>
      <span className="text-sm text-gray-500 flex-shrink-0">Tags:</span>
      <div className="flex gap-1.5">
        {tags.map(tag => {
          const isSelected = selectedTagIds.includes(tag.id)
          const colors = TAG_COLORS[tag.color] || TAG_COLORS.gray

          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleToggle(tag.id)}
              className={`
                px-2 py-0.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
                ${isSelected
                  ? `${colors.bg} ${colors.text} ${colors.border} border`
                  : 'bg-gray-100 text-gray-600 border border-transparent hover:border-gray-300'
                }
              `}
            >
              {tag.name}
            </button>
          )
        })}
      </div>
      {selectedTagIds.length > 0 && (
        <button
          type="button"
          onClick={() => onTagsChange([])}
          className="text-xs text-gray-500 hover:text-gray-700 flex-shrink-0"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
