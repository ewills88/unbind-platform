'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface CameraModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      startCamera()
    } else {
      stopCamera()
      setCapturedImage(null)
      setError(null)
    }

    return () => stopCamera()
  }, [isOpen])

  const startCamera = async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
    } catch {
      setError('Could not access camera. Please check your permissions.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(imageData)
    stopCamera()
  }

  const handleRetake = () => {
    setCapturedImage(null)
    startCamera()
  }

  const handleUsePhoto = async () => {
    if (!capturedImage) return

    try {
      const res = await fetch(capturedImage)
      const blob = await res.blob()
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
      onCapture(file)
      onClose()
    } catch {
      setError('Failed to process photo.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full w-full h-[100dvh] p-0 border-0 rounded-none sm:rounded-none">
        <div className="relative h-full bg-black flex flex-col">
          {error ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <p className="text-white mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white text-black rounded-lg font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          ) : !capturedImage ? (
            <>
              {/* Live camera feed */}
              <video
                ref={videoRef}
                className="flex-1 w-full object-cover"
                autoPlay
                playsInline
                muted
              />

              {/* Overlay guide */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-x-6 top-1/4 bottom-1/4 border-2 border-white/40 rounded-lg" />
                <div className="absolute top-4 left-4 right-4 bg-black/50 text-white p-3 rounded-lg">
                  <p className="text-sm text-center">
                    Position document within the frame
                  </p>
                </div>
              </div>

              {/* Capture button */}
              <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                <button
                  onClick={capturePhoto}
                  className="w-18 h-18 bg-white rounded-full border-4 border-gray-300 active:scale-95 transition p-8"
                  aria-label="Capture photo"
                />
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              {/* Captured photo preview */}
              <img
                src={capturedImage}
                alt="Captured document"
                className="flex-1 w-full object-contain"
              />

              {/* Actions */}
              <div className="absolute bottom-8 left-4 right-4 flex gap-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 py-3 px-4 bg-white/20 text-white rounded-lg font-medium backdrop-blur-sm border border-white/30 min-h-[44px]"
                >
                  Retake
                </button>
                <button
                  onClick={handleUsePhoto}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium min-h-[44px]"
                >
                  Use Photo
                </button>
              </div>
            </>
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
