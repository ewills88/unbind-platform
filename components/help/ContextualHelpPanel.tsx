'use client'

// Session 25: Contextual Help Panel
// Slide-out panel that fetches relevant help articles based on context

import { useState, useEffect, useCallback } from 'react'
import { HelpCircle, X, ChevronRight, ExternalLink } from 'lucide-react'
import { marked } from 'marked'

interface Article {
  id: string
  title: string
  slug: string
  summary: string
  content?: string
}

interface ContextualHelpPanelProps {
  contextKey: string
  buttonClassName?: string
}

export default function ContextualHelpPanel({
  contextKey,
  buttonClassName,
}: ContextualHelpPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/help/articles?q=${encodeURIComponent(contextKey)}`)
      if (res.ok) {
        const data = await res.json()
        setArticles(data.slice(0, 5))
      }
    } catch {
      // Fetch failed silently
    }
    setLoading(false)
  }, [contextKey])

  useEffect(() => {
    if (isOpen && articles.length === 0) {
      fetchArticles()
    }
  }, [isOpen, articles.length, fetchArticles])

  const handleSelectArticle = async (article: Article) => {
    if (article.content) {
      setSelectedArticle(article)
      return
    }

    try {
      const res = await fetch(`/api/help/articles/${article.slug}`)
      if (res.ok) {
        const full = await res.json()
        setSelectedArticle(full)
      }
    } catch {
      // Article fetch failed silently
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={
          buttonClassName ||
          'p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
        }
        aria-label="Open help panel"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-[9998] transition-opacity duration-200"
          onClick={() => {
            setIsOpen(false)
            setSelectedArticle(null)
          }}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-[9999] transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">
            {selectedArticle ? 'Article' : 'Help'}
          </h2>
          <button
            onClick={() => {
              if (selectedArticle) {
                setSelectedArticle(null)
              } else {
                setIsOpen(false)
              }
            }}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel content */}
        <div className="overflow-y-auto h-[calc(100%-60px)]">
          {selectedArticle ? (
            /* Article detail view */
            <div className="p-4">
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center gap-1"
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                Back to articles
              </button>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedArticle.title}
              </h3>
              {selectedArticle.content && (
                <div
                  className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-blue-600"
                  dangerouslySetInnerHTML={{
                    __html: marked(selectedArticle.content),
                  }}
                />
              )}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <a
                  href={`/help/articles/${selectedArticle.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  View full article
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : loading ? (
            /* Loading state */
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            /* Empty state */
            <div className="p-8 text-center">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No help articles found for this section.
              </p>
              <a
                href="/help"
                className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block"
              >
                Browse all help articles
              </a>
            </div>
          ) : (
            /* Articles list */
            <div className="divide-y divide-gray-100">
              {articles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => handleSelectArticle(article)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">{article.title}</h3>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 ml-2" />
                  </div>
                  {article.summary && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {article.summary}
                    </p>
                  )}
                </button>
              ))}
              <div className="p-4">
                <a
                  href="/help"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Browse all help articles
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
