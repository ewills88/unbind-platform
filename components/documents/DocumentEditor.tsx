'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo,
  Redo,
  Save,
  FileText,
  Eye,
  Sparkles,
  History,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react'
import AIAssistant from './AIAssistant'
import { GeneratedDocument, DocumentTemplateType, DOCUMENT_TYPE_INFO } from '@/types/document-templates'

interface DocumentEditorProps {
  generatedDoc: GeneratedDocument
  caseId: string
  onSave?: (content: string, customContent: Record<string, string>) => Promise<void>
  onClose?: () => void
  readOnly?: boolean
}

// Simple markdown-like editor (in production, use Tiptap or similar)
export default function DocumentEditor({
  generatedDoc,
  caseId,
  onSave,
  onClose: _onClose,
  readOnly = false
}: DocumentEditorProps) {
  void _onClose // Reserved for modal close functionality
  const editorRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState(
    generatedDoc.custom_content?.narratives?.main || ''
  )
  const [showAI, setShowAI] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])

  // Track content changes for undo/redo
  const handleContentChange = useCallback((newContent: string) => {
    setUndoStack(prev => [...prev, content].slice(-50)) // Keep last 50 states
    setRedoStack([])
    setContent(newContent)
    setSaved(false)
  }, [content])

  const handleUndo = () => {
    if (undoStack.length === 0) return
    const previousContent = undoStack[undoStack.length - 1]
    setUndoStack(prev => prev.slice(0, -1))
    setRedoStack(prev => [...prev, content])
    setContent(previousContent)
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const nextContent = redoStack[redoStack.length - 1]
    setRedoStack(prev => prev.slice(0, -1))
    setUndoStack(prev => [...prev, content])
    setContent(nextContent)
  }

  // Text formatting (simplified - in production use proper editor)
  const applyFormatting = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      handleContentChange(editorRef.current.innerHTML)
    }
  }

  // Insert AI-generated text at cursor
  const handleInsertAIText = (text: string) => {
    if (editorRef.current) {
      // Get selection
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)

        // Insert the text
        const textNode = document.createTextNode('\n\n' + text + '\n\n')
        range.insertNode(textNode)

        // Move cursor after inserted text
        range.setStartAfter(textNode)
        range.setEndAfter(textNode)
        selection.removeAllRanges()
        selection.addRange(range)
      } else {
        // Append to end if no selection
        setContent(prev => prev + '\n\n' + text)
      }

      handleContentChange(editorRef.current.innerHTML || content + '\n\n' + text)
    } else {
      setContent(prev => prev + '\n\n' + text)
      setSaved(false)
    }
  }

  const handleSave = async () => {
    if (!onSave) return

    try {
      setSaving(true)
      setError(null)

      await onSave(content, { main: content })

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const docType = generatedDoc.document_type as DocumentTemplateType
  const docTypeInfo = DOCUMENT_TYPE_INFO[docType]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          {/* Document info */}
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <div>
              <h3 className="font-medium text-gray-900 text-sm">
                {generatedDoc.document_title}
              </h3>
              <p className="text-xs text-gray-500">
                {docTypeInfo?.label || docType} • v{generatedDoc.version}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Assistant toggle */}
          <button
            onClick={() => setShowAI(!showAI)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
              showAI
                ? 'bg-purple-100 text-purple-700'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Assistant
          </button>

          {/* Version history */}
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            title="Version History"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Preview */}
          <button
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Save */}
          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium ${
                saved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Formatting toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-1 px-4 py-2 border-b bg-white">
          {/* Undo/Redo */}
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-30"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-30"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-200 mx-2" />

          {/* Text formatting */}
          <button
            onClick={() => applyFormatting('bold')}
            className="p-2 hover:bg-gray-100 rounded"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyFormatting('italic')}
            className="p-2 hover:bg-gray-100 rounded"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyFormatting('underline')}
            className="p-2 hover:bg-gray-100 rounded"
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-200 mx-2" />

          {/* Alignment */}
          <button
            onClick={() => applyFormatting('justifyLeft')}
            className="p-2 hover:bg-gray-100 rounded"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyFormatting('justifyCenter')}
            className="p-2 hover:bg-gray-100 rounded"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyFormatting('justifyRight')}
            className="p-2 hover:bg-gray-100 rounded"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-200 mx-2" />

          {/* Lists */}
          <button
            onClick={() => applyFormatting('insertUnorderedList')}
            className="p-2 hover:bg-gray-100 rounded"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyFormatting('insertOrderedList')}
            className="p-2 hover:bg-gray-100 rounded"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Editor content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main editor area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl mx-auto">
            {/* Document header simulation */}
            <div className="mb-8 pb-4 border-b text-center">
              <p className="text-sm text-gray-500 uppercase tracking-wide">
                {generatedDoc.filled_data?.case?.court_name || 'Superior Court'}
              </p>
              <p className="text-sm text-gray-500">
                {generatedDoc.filled_data?.case?.county || 'County'}, {generatedDoc.filled_data?.case?.state_code || 'CA'}
              </p>
              <h1 className="text-xl font-bold mt-4 uppercase">
                {generatedDoc.document_title}
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                Case No: {generatedDoc.filled_data?.case?.case_number || '[To be assigned]'}
              </p>
            </div>

            {/* Party information */}
            <div className="mb-6 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Petitioner:</p>
                  <p>{generatedDoc.filled_data?.client?.full_name || '[Client Name]'}</p>
                </div>
                <div>
                  <p className="font-medium">Respondent:</p>
                  <p>{generatedDoc.filled_data?.spouse?.full_name || '[Spouse Name]'}</p>
                </div>
              </div>
            </div>

            {/* Editable content area */}
            {readOnly ? (
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => {
                  const target = e.target as HTMLDivElement
                  handleContentChange(target.innerHTML)
                }}
                className="prose max-w-none min-h-[400px] focus:outline-none p-4 border rounded-lg"
                style={{ whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: content }}
              />
            )}

            {/* Signature block */}
            <div className="mt-12 pt-8 border-t">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="border-b border-black w-48 mb-2" />
                  <p className="text-sm">Date</p>
                </div>
                <div>
                  <div className="border-b border-black w-48 mb-2" />
                  <p className="text-sm">{generatedDoc.filled_data?.client?.full_name || 'Signature'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Version History Sidebar */}
        {showVersionHistory && (
          <div className="w-80 border-l bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Version History</h3>
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-lg border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">Version {generatedDoc.version}</span>
                    <span className="text-xs text-green-600">Current</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(generatedDoc.updated_at).toLocaleString()}
                  </p>
                </div>
                {/* Additional versions would be loaded from history API */}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Assistant (floating) */}
      {showAI && (
        <AIAssistant
          caseId={caseId}
          documentType={docType}
          onInsertText={handleInsertAIText}
          context={`Document: ${generatedDoc.document_title}`}
          isOpen={showAI}
          onToggle={() => setShowAI(false)}
        />
      )}
    </div>
  )
}
