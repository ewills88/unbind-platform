'use client'

import { useState, useEffect } from 'react'
import { Tag as TagIcon, Plus, Loader2 } from 'lucide-react'
import { Tag } from '@/types/tags'
import { TagBadge, TagInput } from '@/components/tags'

interface DocumentTagEditorProps {
  documentId: string
  onTagsChange?: () => void
}

export default function DocumentTagEditor({
  documentId,
  onTagsChange
}: DocumentTagEditorProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    fetchTags()
  }, [documentId])

  const fetchTags = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/tags`)
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

  const handleTagsChange = async (newTags: Tag[]) => {
    // Find tags to add
    const currentIds = new Set(tags.map(t => t.id))
    const newIds = new Set(newTags.map(t => t.id))

    const tagsToAdd = newTags.filter(t => !currentIds.has(t.id))
    const tagsToRemove = tags.filter(t => !newIds.has(t.id))

    // Add new tags
    if (tagsToAdd.length > 0) {
      try {
        await fetch(`/api/documents/${documentId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagIds: tagsToAdd.map(t => t.id) })
        })
      } catch (error) {
        console.error('Error adding tags:', error)
      }
    }

    // Remove tags
    for (const tag of tagsToRemove) {
      try {
        await fetch(`/api/documents/${documentId}/tags?tagId=${tag.id}`, {
          method: 'DELETE'
        })
      } catch (error) {
        console.error('Error removing tag:', error)
      }
    }

    setTags(newTags)
    onTagsChange?.()
  }

  const handleRemoveTag = async (tagId: string) => {
    try {
      await fetch(`/api/documents/${documentId}/tags?tagId=${tagId}`, {
        method: 'DELETE'
      })
      setTags(prev => prev.filter(t => t.id !== tagId))
      onTagsChange?.()
    } catch (error) {
      console.error('Error removing tag:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading tags...</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TagIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Tags</span>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          {isEditing ? 'Done' : (
            <>
              <Plus className="w-3 h-3" />
              Add
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <TagInput
          selectedTags={tags}
          onTagsChange={handleTagsChange}
          placeholder="Search or create tags..."
          maxTags={10}
        />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.length === 0 ? (
            <span className="text-xs text-gray-400">No tags</span>
          ) : (
            tags.map(tag => (
              <TagBadge
                key={tag.id}
                tag={tag}
                showRemove
                onRemove={() => handleRemoveTag(tag.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
