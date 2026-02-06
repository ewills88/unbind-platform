'use client'

import { useState, useEffect } from 'react'
import { Clock, ChevronDown, ChevronUp, Eye, RotateCcw, Tag } from 'lucide-react'
import { DocumentVersion, formatVersionDate } from '@/types/document-collaboration'

interface VersionHistoryProps {
  caseId: string
  documentId: string
  currentVersion: number
  onRestoreVersion?: (version: DocumentVersion) => void
  onPreviewVersion?: (version: DocumentVersion) => void
}

export default function VersionHistory({
  caseId,
  documentId,
  currentVersion,
  onRestoreVersion,
  onPreviewVersion
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [savingVersion, setSavingVersion] = useState(false)

  useEffect(() => {
    fetchVersions()
  }, [caseId, documentId])

  async function fetchVersions() {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}/versions`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch versions')
      }

      const data = await response.json()
      setVersions(data.versions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions')
    } finally {
      setLoading(false)
    }
  }

  async function createVersion(isMajor: boolean = false) {
    try {
      setSavingVersion(true)
      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}/versions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_major_version: isMajor,
            changes_summary: isMajor ? 'Major version saved' : 'Version saved'
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to save version')
      }

      await fetchVersions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save version')
    } finally {
      setSavingVersion(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-900">Version History</span>
          <span className="text-sm text-gray-500">
            (v{currentVersion} current)
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-200">
          {/* Save Version Buttons */}
          <div className="p-4 border-b border-gray-100 flex gap-2">
            <button
              onClick={() => createVersion(false)}
              disabled={savingVersion}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100
                       rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingVersion ? 'Saving...' : 'Save Version'}
            </button>
            <button
              onClick={() => createVersion(true)}
              disabled={savingVersion}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600
                       rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Tag className="w-4 h-4 inline mr-1" />
              Major Version
            </button>
          </div>

          {/* Version List */}
          <div className="max-h-96 overflow-y-auto">
            {error && (
              <div className="p-4 text-sm text-red-600">{error}</div>
            )}

            {versions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No versions saved yet
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-4 hover:bg-gray-50 ${
                      version.version_number === currentVersion
                        ? 'bg-blue-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            v{version.version_number}
                          </span>
                          {version.is_major_version && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100
                                           text-blue-700 rounded-full">
                              Major
                            </span>
                          )}
                          {version.version_number === currentVersion && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100
                                           text-green-700 rounded-full">
                              Current
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-gray-600">
                          {version.changes_summary || 'No description'}
                        </p>

                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          <span>
                            {version.created_by_user?.full_name || 'Unknown'}
                          </span>
                          <span>{formatVersionDate(version.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 ml-4">
                        {onPreviewVersion && (
                          <button
                            onClick={() => onPreviewVersion(version)}
                            className="p-2 text-gray-400 hover:text-gray-600
                                     hover:bg-gray-100 rounded-lg"
                            title="Preview this version"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {onRestoreVersion && version.version_number !== currentVersion && (
                          <button
                            onClick={() => onRestoreVersion(version)}
                            className="p-2 text-gray-400 hover:text-blue-600
                                     hover:bg-blue-50 rounded-lg"
                            title="Restore this version"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
