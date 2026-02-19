'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Pen, Send, Check, X, Clock, AlertCircle,
  Download, RefreshCw, User
} from 'lucide-react'
import { DocumentSignature } from '@/types/document-collaboration'

interface SignaturePanelProps {
  caseId: string
  documentId: string
  isAttorney: boolean
  currentUserId: string
  documentStatus: string
  onSignatureComplete?: () => void
}

export default function SignaturePanel({
  caseId,
  documentId,
  isAttorney,
  currentUserId,
  documentStatus: _documentStatus,
  onSignatureComplete
}: SignaturePanelProps) {
  const [signatures, setSignatures] = useState<DocumentSignature[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showSignModal, setShowSignModal] = useState<DocumentSignature | null>(null)

  useEffect(() => {
    fetchSignatures()
  }, [caseId, documentId])

  async function fetchSignatures() {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}/signatures`
      )

      if (response.ok) {
        const data = await response.json()
        setSignatures(data.signatures || [])
      }
    } catch (err) {
      console.error('Failed to fetch signatures:', err)
    } finally {
      setLoading(false)
    }
  }

  const pendingSignatures = signatures.filter(s => s.status === 'pending')
  const completedSignatures = signatures.filter(s => s.status === 'signed')
  const myPendingSignature = pendingSignatures.find(
    s => s.signer_id === currentUserId || !s.signer_id
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pen className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-900">Signatures</span>
          </div>
          {isAttorney && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
              Request Signature
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="py-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Loading signatures...</p>
          </div>
        ) : signatures.length === 0 ? (
          <div className="py-8 text-center">
            <Pen className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">No signatures requested yet</p>
            {isAttorney && (
              <button
                onClick={() => setShowRequestModal(true)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700"
              >
                Request a signature
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending Signatures */}
            {pendingSignatures.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Pending ({pendingSignatures.length})
                </p>
                <div className="space-y-2">
                  {pendingSignatures.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex items-center justify-between p-3 bg-yellow-50
                               border border-yellow-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {sig.signer_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {sig.signer_email || 'No email'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 px-2 py-1 text-xs
                                       bg-yellow-100 text-yellow-700 rounded-full">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                        {(sig.signer_id === currentUserId || !sig.signer_id) && (
                          <button
                            onClick={() => setShowSignModal(sig)}
                            className="px-3 py-1.5 text-sm font-medium text-white
                                     bg-blue-600 rounded-lg hover:bg-blue-700"
                          >
                            Sign Now
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Signatures */}
            {completedSignatures.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Signed ({completedSignatures.length})
                </p>
                <div className="space-y-2">
                  {completedSignatures.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex items-center justify-between p-3 bg-green-50
                               border border-green-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {sig.signer_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Signed on {new Date(sig.signed_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {sig.signature_image_path && (
                        <button className="text-sm text-gray-500 hover:text-gray-700">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My signature action */}
            {myPendingSignature && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Your signature is requested
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Please review the document and sign to complete this step.
                </p>
                <button
                  onClick={() => setShowSignModal(myPendingSignature)}
                  className="mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600
                           rounded-lg hover:bg-blue-700"
                >
                  Sign Document
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Request Signature Modal */}
      {showRequestModal && (
        <RequestSignatureModal
          caseId={caseId}
          documentId={documentId}
          onClose={() => setShowRequestModal(false)}
          onRequested={() => {
            setShowRequestModal(false)
            fetchSignatures()
          }}
        />
      )}

      {/* Sign Modal */}
      {showSignModal && (
        <SignModal
          caseId={caseId}
          documentId={documentId}
          signature={showSignModal}
          onClose={() => setShowSignModal(null)}
          onSigned={() => {
            setShowSignModal(null)
            fetchSignatures()
            onSignatureComplete?.()
          }}
        />
      )}
    </div>
  )
}

interface RequestSignatureModalProps {
  caseId: string
  documentId: string
  onClose: () => void
  onRequested: () => void
}

function RequestSignatureModal({ caseId, documentId, onClose, onRequested }: RequestSignatureModalProps) {
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [signerId, setSignerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!signerName) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}/signatures`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signer_name: signerName,
            signer_email: signerEmail || undefined,
            signer_id: signerId || undefined,
            service: 'native'
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to request signature')
      }

      onRequested()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request signature')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Request Signature</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Signer Name *
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Enter signer's name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2
                       focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Signer Email
            </label>
            <input
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="Enter signer's email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2
                       focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User ID (Optional)
            </label>
            <input
              type="text"
              value={signerId}
              onChange={(e) => setSignerId(e.target.value)}
              placeholder="Link to existing user"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2
                       focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              If the signer is an existing user, enter their ID
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !signerName}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Request Signature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface SignModalProps {
  caseId: string
  documentId: string
  signature: DocumentSignature
  onClose: () => void
  onSigned: () => void
}

function SignModal({ caseId, documentId, signature, onClose, onSigned }: SignModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1e40af'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getCoords(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    setIsDrawing(true)
    const { x, y } = getCoords(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return
    const { x, y } = getCoords(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
      setHasSignature(true)
    }
  }

  function stopDrawing() {
    setIsDrawing(false)
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      setHasSignature(false)
    }
  }

  async function handleSign() {
    if (!hasSignature) return

    try {
      setLoading(true)
      setError(null)

      const canvas = canvasRef.current
      const signatureData = canvas?.toDataURL('image/png')

      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}/signatures`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signature_id: signature.id,
            action: 'sign',
            signature_data: signatureData
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to sign document')
      }

      onSigned()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign document')
    } finally {
      setLoading(false)
    }
  }

  async function handleDecline() {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/cases/${caseId}/documents/generated/${documentId}/signatures`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signature_id: signature.id,
            action: 'decline'
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to decline signature')
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Sign Document</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              I, <strong>{signature.signer_name}</strong>, acknowledge that by signing below,
              I am electronically signing this document and agree to be bound by its terms.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Draw your signature below
            </label>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <button
              onClick={clearCanvas}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear signature
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDecline}
              disabled={loading}
              className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100
                       disabled:opacity-50"
            >
              Decline
            </button>
            <button
              onClick={handleSign}
              disabled={loading || !hasSignature}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Pen className="w-4 h-4" />
              )}
              {loading ? 'Signing...' : 'Sign Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
