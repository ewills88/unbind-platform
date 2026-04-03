'use client'

import { useState, useCallback } from 'react'
import { RelationshipType } from '@/types/tags'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface RelatedDocument {
  id: string
  documentId: string
  filename: string
  category: string | null
  mimeType: string
  relationshipType: RelationshipType
  confidence: number
  notes: string | null
  direction: 'incoming' | 'outgoing'
  createdAt: string
}

interface UseDocumentRelationshipsOptions {
  documentId: string
}

export function useDocumentRelationships({ documentId }: UseDocumentRelationshipsOptions) {
  const [relationships, setRelationships] = useState<RelatedDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch relationships for a document
  const fetchRelationships = useCallback(async () => {
    if (!documentId) return []

    setIsLoading(true)
    setError(null)
    try {
      const response = await authFetch(`/api/documents/${documentId}/relationships`)
      if (!response.ok) throw new Error('Failed to fetch relationships')

      const data = await response.json()
      setRelationships(data.relationships || [])
      return data.relationships as RelatedDocument[]
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch relationships'
      setError(message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [documentId])

  // Create a new relationship
  const createRelationship = useCallback(async (
    relatedDocumentId: string,
    relationshipType: RelationshipType,
    notes?: string
  ) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authFetch(`/api/documents/${documentId}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relatedDocumentId,
          relationshipType,
          notes
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.details || 'Failed to create relationship')
      }

      const data = await response.json()
      setRelationships(prev => [...prev, data.relationship])
      return data.relationship as RelatedDocument
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create relationship'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [documentId])

  // Remove a relationship
  const removeRelationship = useCallback(async (relationshipId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authFetch(`/api/documents/${documentId}/relationships?relationshipId=${relationshipId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to remove relationship')

      setRelationships(prev => prev.filter(r => r.id !== relationshipId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove relationship'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [documentId])

  return {
    relationships,
    isLoading,
    error,
    fetchRelationships,
    createRelationship,
    removeRelationship
  }
}
