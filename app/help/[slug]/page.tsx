// Session 25: Help Category Page
// Lists articles for a specific help category

import Link from 'next/link'
import { getCategoryBySlug, getArticlesByCategory } from '@/lib/help/helpService'
import { ChevronRight, ArrowLeft, Eye, ThumbsUp, Clock } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let category: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let articles: any[] = []

  try {
    category = await getCategoryBySlug(slug)
    articles = await getArticlesByCategory(category.id)
  } catch {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/help" className="hover:text-blue-600 transition-colors">
            Help Center
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">{category.name}</span>
        </nav>

        {/* Category Header */}
        <div className="mb-8">
          <Link
            href="/help"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Help Center
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-gray-500 text-lg">{category.description}</p>
          )}
          <p className="text-sm text-gray-400 mt-2">
            {category.article_count} {category.article_count === 1 ? 'article' : 'articles'}
          </p>
        </div>

        {/* Articles List */}
        {articles.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No articles in this category yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/help/articles/${article.slug}`}
                className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h2>
                    {article.summary && (
                      <p className="text-gray-600 mb-3">{article.summary}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-400">
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
                        {new Date(article.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {article.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors mt-1 ml-4 shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
