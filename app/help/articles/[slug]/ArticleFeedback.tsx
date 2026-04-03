'use client'

// Session 25: Article Feedback Component
// Allows users to rate articles as helpful or not helpful

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import { authFetch } from '@/lib/supabase/auth-fetch'

interface ArticleFeedbackProps {
  articleId: string
}

export default function ArticleFeedback({ articleId }: ArticleFeedbackProps) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')

  const handleFeedback = async (isHelpful: boolean) => {
    setLoading(true)
    try {
      const response = await authFetch(`/api/help/articles/${articleId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_helpful: isHelpful, comment: comment || undefined }),
      })

      if (response.ok) {
        setSubmitted(true)
      } else if (!isHelpful && !showComment) {
        setShowComment(true)
        setLoading(false)
        return
      }
    } catch {
      // Feedback submission failed silently
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-green-700">
          <Check className="w-5 h-5" />
          <span className="font-medium">Thank you for your feedback!</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
      <p className="text-gray-700 font-medium mb-4">Was this article helpful?</p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => handleFeedback(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          <ThumbsUp className="w-4 h-4" />
          Yes, helpful
        </button>
        <button
          onClick={() => handleFeedback(false)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <ThumbsDown className="w-4 h-4" />
          Not helpful
        </button>
      </div>
      {showComment && (
        <div className="mt-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How can we improve this article?"
            className="w-full max-w-md mx-auto border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            rows={3}
          />
          <div className="mt-2">
            <button
              onClick={() => handleFeedback(false)}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
            >
              Submit Feedback
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
