'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square } from 'lucide-react'

interface VoiceRecordButtonProps {
  onRecordingComplete: (blob: Blob) => void
}

export default function VoiceRecordButton({ onRecordingComplete }: VoiceRecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecordingComplete(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)

      setRecordingTime(0)
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch {
      console.error('Could not access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isRecording) {
    return (
      <button
        onClick={startRecording}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        title="Record voice message"
      >
        <Mic className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-red-50 rounded-full px-3 py-1">
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      <span className="text-sm font-mono text-red-700">{formatTime(recordingTime)}</span>
      <button
        onClick={stopRecording}
        className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
        title="Stop and send"
      >
        <Square className="w-3 h-3" />
      </button>
    </div>
  )
}
