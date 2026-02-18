// Session 25: Help Article Detail Page
// Rendered markdown content, feedback buttons, related articles

import Link from 'next/link'
import { getArticleBySlug, getArticlesByCategory } from '@/lib/help/helpService'
import { marked } from 'marked'
import { ChevronRight, ArrowLeft, Eye, ThumbsUp, Clock } from 'lucide-react'
import { notFound } from 'next/navigation'
import ArticleFeedback from './ArticleFeedback'

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let article: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let relatedArticles: any[] = []

  try {
    article = await getArticleBySlug(slug)
    if (article.category_id) {
      const allInCategory = await getArticlesByCategory(article.category_id)
      relatedArticles = allInCategory
        .filter((a) => a.id !== article.id)
        .slice(0, 3)
    }
  } catch {
    notFound()
  }

  const htmlContent = marked(article.content || '')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/help" className="hover:text-blue-600 transition-colors">
            Help Center
          </Link>
          <ChevronRight className="w-4 h-4" />
          {article.category && (
            <>
              <Link
                href={`/help/${article.category.slug}`}
                className="hover:text-blue-600 transition-colors"
              >
                {article.category.name}
              </Link>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
          <span className="text-gray-900 font-medium truncate">{article.title}</span>
        </nav>

        {/* Back link */}
        <Link
          href={article.category ? `/help/${article.category.slug}` : '/help'}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {article.category?.name || 'Help Center'}
        </Link>

        {/* Article */}
        <article className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>

          <div className="flex items-center gap-4 text-sm text-gray-400 mb-8 pb-6 border-b border-gray-100">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {article.view_count} views
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5" />
              {article.helpful_count} found helpful
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Updated {new Date(article.updated_at).toLocaleDateString()}
            </span>
          </div>

          {/* Rendered markdown */}
          <div
            className="prose prose-blue max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-blue-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-gray-100">
              {article.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* Feedback */}
        <ArticleFeedback articleId={article.id} />

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Related Articles</h2>
            <div className="space-y-3">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/help/articles/${related.slug}`}
                  className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <h3 className="font-medium text-gray-900 hover:text-blue-600">
                    {related.title}
                  </h3>
                  {related.summary && (
                    <p className="text-sm text-gray-500 mt-1">{related.summary}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
