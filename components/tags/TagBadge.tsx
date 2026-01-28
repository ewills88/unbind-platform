'use client'

import { X } from 'lucide-react'
import { Tag, TAG_COLORS, TagColor } from '@/types/tags'

interface TagBadgeProps {
  tag: Tag | { name: string; color: TagColor }
  onRemove?: () => void
  size?: 'sm' | 'md'
  showRemove?: boolean
  className?: string
}

export function TagBadge({
  tag,
  onRemove,
  size = 'sm',
  showRemove = false,
  className = ''
}: TagBadgeProps) {
  const colors = TAG_COLORS[tag.color] || TAG_COLORS.gray

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-2.5 py-1'

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${colors.bg} ${colors.text} ${colors.border} border
        ${sizeClasses}
        ${className}
      `}
    >
      {tag.name}
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className={`
            -mr-1 rounded-full p-0.5
            hover:bg-black/10 transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400
          `}
          aria-label={`Remove ${tag.name} tag`}
        >
          <X className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>
      )}
    </span>
  )
}

interface TagListProps {
  tags: Tag[]
  onRemove?: (tagId: string) => void
  size?: 'sm' | 'md'
  maxVisible?: number
  className?: string
}

export function TagList({
  tags,
  onRemove,
  size = 'sm',
  maxVisible,
  className = ''
}: TagListProps) {
  const visibleTags = maxVisible ? tags.slice(0, maxVisible) : tags
  const hiddenCount = maxVisible ? Math.max(0, tags.length - maxVisible) : 0

  if (tags.length === 0) {
    return null
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size={size}
          showRemove={!!onRemove}
          onRemove={onRemove ? () => onRemove(tag.id) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <span className={`
          inline-flex items-center rounded-full font-medium
          bg-gray-100 text-gray-600 border border-gray-200
          ${size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'}
        `}>
          +{hiddenCount} more
        </span>
      )}
    </div>
  )
}
