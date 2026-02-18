// Session 25: Help Center Service
// Manages help categories, articles, FAQs, and article feedback

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================================
// Categories
// ============================================================

export async function getCategories() {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('help_categories')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getCategoryBySlug(slug: string) {
  const supabase = getServiceClient()
  const { data: category, error } = await supabase
    .from('help_categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error) throw error

  const { count } = await supabase
    .from('help_articles')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', category.id)
    .eq('is_published', true)

  return { ...category, article_count: count || 0 }
}

// ============================================================
// Articles
// ============================================================

export async function getArticlesByCategory(categoryId: string) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('help_articles')
    .select('id, title, slug, summary, tags, view_count, helpful_count, created_at')
    .eq('category_id', categoryId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getArticleBySlug(slug: string) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('help_articles')
    .select('*, category:category_id(id, name, slug)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error) throw error

  // Increment view count
  await supabase
    .from('help_articles')
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq('id', data.id)

  return data
}

export async function searchArticles(query: string) {
  const supabase = getServiceClient()
  const searchTerm = `%${query}%`

  const { data, error } = await supabase
    .from('help_articles')
    .select('id, title, slug, summary, tags, category:category_id(id, name, slug)')
    .eq('is_published', true)
    .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
    .order('view_count', { ascending: false })
    .limit(20)

  if (error) throw error
  return data || []
}

export async function getPopularArticles(limit: number = 5) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('help_articles')
    .select('id, title, slug, summary, view_count, category:category_id(id, name, slug)')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// ============================================================
// Feedback
// ============================================================

export async function submitFeedback(
  articleId: string,
  userId: string,
  isHelpful: boolean,
  comment?: string
) {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('article_feedback')
    .insert({
      article_id: articleId,
      user_id: userId,
      is_helpful: isHelpful,
      comment: comment || null,
    })
    .select()
    .single()

  if (error) throw error

  // Update article counters
  const { data: article } = await supabase
    .from('help_articles')
    .select('helpful_count, not_helpful_count')
    .eq('id', articleId)
    .single()

  if (article) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = article as any
    if (isHelpful) {
      await supabase
        .from('help_articles')
        .update({ helpful_count: (rec.helpful_count || 0) + 1 })
        .eq('id', articleId)
    } else {
      await supabase
        .from('help_articles')
        .update({ not_helpful_count: (rec.not_helpful_count || 0) + 1 })
        .eq('id', articleId)
    }
  }

  return data
}

// ============================================================
// FAQs
// ============================================================

export async function getFaqs(category?: string) {
  const supabase = getServiceClient()
  let query = supabase
    .from('faqs')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}
