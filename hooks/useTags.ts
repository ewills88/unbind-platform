'use client'

import { useState, useCallback } from 'react'
import { Tag } from '@/types/tags'

interface UseTagsOptions {
  documentId?: string
}

export function useTags(options: UseTagsOptions = {}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { documentId: _documentId } = options
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all tags (for suggestions/filtering)
  const fetchAllTags = useCallback(async (search?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await fetch(`/api/tags?${params}`)
      if (!response.ok) throw new Error('Failed to fetch tags')

      const data = await response.json()
      setTags(data.tags || [])
      return data.tags as Tag[]
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tags'
      setError(message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch tags for a specific document
  const fetchDocumentTags = useCallback(async (docId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/documents/${docId}/tags`)
      if (!response.ok) throw new Error('Failed to fetch document tags')

      const data = await response.json()
      setTags(data.tags || [])
      return data.tags as Tag[]
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch document tags'
      setError(message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Add tags to a document
  const addTagsToDocument = useCallback(async (docId: string, tagIds: string[]) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/documents/${docId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds })
      })

      if (!response.ok) throw new Error('Failed to add tags')

      const data = await response.json()
      setTags(data.tags || [])
      return data.tags as Tag[]
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add tags'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Remove tag from a document
  const removeTagFromDocument = useCallback(async (docId: string, tagId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/documents/${docId}/tags?tagId=${tagId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to remove tag')

      const data = await response.json()
      setTags(data.tags || [])
      return data.tags as Tag[]
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove tag'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Create a new tag
  const createTag = useCallback(async (name: string, color?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color })
      })

      if (!response.ok) throw new Error('Failed to create tag')

      const data = await response.json()
      return data.tag as Tag
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tag'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Bulk tag operations
  const bulkAddTags = useCallback(async (documentIds: string[], tagIds: string[]) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/documents/bulk/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds, addTagIds: tagIds })
      })

      if (!response.ok) throw new Error('Failed to bulk add tags')

      return await response.json()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to bulk add tags'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const bulkRemoveTags = useCallback(async (documentIds: string[], tagIds: string[]) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/documents/bulk/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds, removeTagIds: tagIds })
      })

      if (!response.ok) throw new Error('Failed to bulk remove tags')

      return await response.json()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to bulk remove tags'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    tags,
    isLoading,
    error,
    fetchAllTags,
    fetchDocumentTags,
    addTagsToDocument,
    removeTagFromDocument,
    createTag,
    bulkAddTags,
    bulkRemoveTags
  }
}
