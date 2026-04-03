import { NextRequest, NextResponse } from 'next/server'
import { CreateTagRequest, Tag, TagColor } from '@/types/tags'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// Valid tag colors
const VALID_COLORS: TagColor[] = [
  'gray', 'red', 'orange', 'yellow', 'green',
  'blue', 'indigo', 'purple', 'pink', 'cyan'
]

/**
 * GET /api/tags
 * List all tags with usage counts
 * Query params:
 *   - search: filter by name (optional)
 *   - limit: max results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    let query = supabase
      .from('tags')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(limit)

    // Add search filter if provided
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: tags, error } = await query

    if (error) {
      console.error('Error fetching tags:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tags', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ tags: tags as Tag[] })

  } catch (error) {
    console.error('Tags API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tags
 * Create a new tag
 * Body: { name: string, color?: TagColor }
 */
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: CreateTagRequest = await request.json()

    // Validate name
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Tag name is required' },
        { status: 400 }
      )
    }

    // Normalize tag name (lowercase, trim, replace spaces with hyphens)
    const normalizedName = body.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50)

    if (!normalizedName) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Tag name must contain valid characters' },
        { status: 400 }
      )
    }

    // Validate color
    const color: TagColor = body.color && VALID_COLORS.includes(body.color)
      ? body.color
      : 'gray'

    // Check if tag already exists
    const { data: existing } = await supabase
      .from('tags')
      .select('id, name')
      .eq('name', normalizedName)
      .single()

    if (existing) {
      // Return existing tag instead of error
      return NextResponse.json({ tag: existing, existed: true })
    }

    // Create new tag
    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        name: normalizedName,
        color,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating tag:', error)
      return NextResponse.json(
        { error: 'Failed to create tag', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ tag: tag as Tag, created: true }, { status: 201 })

  } catch (error) {
    console.error('Tags API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
