// Session 25: Help Center Home Page
// Search bar, category grid, popular articles, FAQ accordion

import Link from 'next/link'
import { getCategories, getPopularArticles, getFaqs } from '@/lib/help/helpService'
import {
  BookOpen, FileText, CreditCard, FolderOpen,
  Users, Settings, Search, ChevronRight, Eye
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'getting-started': <BookOpen className="w-6 h-6" />,
  'case-management': <FolderOpen className="w-6 h-6" />,
  'billing': <CreditCard className="w-6 h-6" />,
  'documents': <FileText className="w-6 h-6" />,
  'client-portal': <Users className="w-6 h-6" />,
  'account-settings': <Settings className="w-6 h-6" />,
}

export default async function HelpCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const params = await searchParams
  const query = params.q || ''

  let categories: Awaited<ReturnType<typeof getCategories>> = []
  let popularArticles: Awaited<ReturnType<typeof getPopularArticles>> = []
  let faqs: Awaited<ReturnType<typeof getFaqs>> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let searchResults: any[] = []

  try {
    categories = await getCategories()
    popularArticles = await getPopularArticles(6)
    faqs = await getFaqs()
  } catch {
    // Graceful fallback if tables don't exist yet
  }

  if (query) {
    try {
      const { searchArticles } = await import('@/lib/help/helpService')
      searchResults = await searchArticles(query)
    } catch {
      // Search failed gracefully
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero / Search Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
          <p className="text-blue-100 mb-8 text-lg">
            Search our knowledge base or browse categories below
          </p>
          <form action="/help" method="GET" className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search for articles, guides, and FAQs..."
              className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Search Results */}
        {query && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Search results for &ldquo;{query}&rdquo;
            </h2>
            {searchResults.length === 0 ? (
              <p className="text-gray-500">No articles found matching your search.</p>
            ) : (
              <div className="space-y-4">
                {searchResults.map((article) => (
                  <Link
                    key={article.id}
                    href={`/help/articles/${article.slug}`}
                    className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {article.title}
                    </h3>
                    {article.summary && (
                      <p className="text-gray-600 mb-2">{article.summary}</p>
                    )}
                    {article.category && (
                      <span className="text-sm text-blue-600">
                        {article.category.name}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories Grid */}
        {!query && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/help/${category.slug}`}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                      {CATEGORY_ICONS[category.slug] || <BookOpen className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-sm text-gray-500">{category.description}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors mt-1" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Popular Articles */}
            {popularArticles.length > 0 && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Articles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {popularArticles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/help/articles/${article.slug}`}
                      className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900 mb-1">{article.title}</h3>
                        {article.summary && (
                          <p className="text-sm text-gray-500 line-clamp-1">{article.summary}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 ml-4 shrink-0">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{article.view_count}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* FAQ Accordion */}
            {faqs.length > 0 && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                  {faqs.map((faq) => (
                    <details key={faq.id} className="group">
                      <summary className="flex items-center justify-between cursor-pointer p-5 hover:bg-gray-50 transition-colors list-none">
                        <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                        <ChevronRight className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-90 shrink-0" />
                      </summary>
                      <div className="px-5 pb-5 text-gray-600 leading-relaxed">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Contact Support */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Still need help?</h2>
          <p className="text-gray-500 mb-4">
            Our support team is here to assist you with any questions.
          </p>
          <a
            href="mailto:support@unbind.law"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}
