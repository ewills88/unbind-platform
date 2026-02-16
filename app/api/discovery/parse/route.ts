import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getOpenAI, isAIEnabled } from '@/lib/ai/openai-client'

async function getAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { client: null, user: null }

  const cookieStore = await cookies()
  const supabase = createClient(url, key, {
    global: { headers: { cookie: cookieStore.toString() } }
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { client: null, user: null }
  return { client: supabase, user }
}

function getItemTypeName(type: string): string {
  const names: Record<string, string> = {
    interrogatory_form: 'form interrogatories',
    interrogatory_special: 'special interrogatories',
    rfp: 'requests for production of documents',
    rfa: 'requests for admission',
    subpoena: 'subpoena requests',
    deposition_notice: 'deposition notices',
  }
  return names[type] || 'discovery requests'
}

// POST /api/discovery/parse - AI-parse a discovery document into items
export async function POST(request: NextRequest) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient()
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAIEnabled()) {
      return NextResponse.json({ error: 'AI features are not enabled' }, { status: 503 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const discoveryId = formData.get('discovery_id') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Extract text from the file
    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''

    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      text = buffer.toString('utf-8')
    } else {
      // For PDF/DOCX, extract as plain text (basic approach)
      // Try to decode as UTF-8 text; for binary formats this gives a rough extraction
      text = buffer.toString('utf-8')
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    if (!text || text.length < 20) {
      return NextResponse.json({
        error: 'Could not extract sufficient text from the document. Try uploading a plain text file.',
      }, { status: 400 })
    }

    // Get discovery type if we have a discovery_id
    let discoveryType = 'discovery requests'
    if (discoveryId) {
      const { data: discovery } = await supabase
        .from('discovery_requests')
        .select('discovery_type')
        .eq('id', discoveryId)
        .single()
      if (discovery) {
        discoveryType = getItemTypeName(discovery.discovery_type)
      }
    }

    // Truncate text if too long (stay within token limits)
    const maxChars = 30000
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) + '\n[TRUNCATED]' : text

    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{
        role: 'user',
        content: `You are a legal document parser. Extract all individual ${discoveryType} from the following document.

For each item, extract:
1. The item number (integer)
2. The full text of the request/interrogatory

Return a JSON object with an "items" array. Each item should have:
- "item_number" (integer)
- "request_text" (string, the full text of the request)

If you cannot identify numbered items, try to split by logical requests and number them sequentially.

Document text:
${truncatedText}

Return ONLY valid JSON.`,
      }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'AI returned no content' }, { status: 500 })
    }

    const result = JSON.parse(content)
    const items = result.items || result.data || []

    return NextResponse.json({
      data: { items },
      parsed_count: items.length,
    })
  } catch (error) {
    console.error('Discovery parse error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
