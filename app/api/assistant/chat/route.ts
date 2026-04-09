import { NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server'
import { getAssistantContext } from '@/lib/assistant/getAssistantContext'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  message: string
  audience: 'attorney' | 'client'
  caseId?: string
  threadHistory?: ChatMessage[]
}

const ATTORNEY_PROMPT = `You are an expert assistant built into Unbind, an AI-powered divorce practice management platform. You have access to this attorney's live firm data shown below. Answer questions about their cases, deadlines, documents, billing, and how to use Unbind features. Be direct and specific — use the actual case names, dates, and numbers from their data. Never guess. If data isn't in the context, say so. For billing or legal strategy questions outside of Unbind, recommend they consult their accountant or bar resources.

LIVE FIRM DATA:
`

const CLIENT_PROMPT = `You are a friendly assistant inside the Unbind client portal. You help clients understand their case status, how to use the portal, and what their attorney needs from them. You have access to their case data shown below. Be warm and simple — avoid legal jargon. Never give legal advice. If they ask legal questions, tell them to message their attorney directly through the portal.

LIVE CASE DATA:
`

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Authenticate
  const { client: supabase, user } = await getAuthenticatedClient(request)
  if (!user || !supabase) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let body: ChatRequest
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { message, audience, caseId, threadHistory = [] } = body

  if (!message?.trim()) {
    return new Response(
      JSON.stringify({ error: 'Message is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (audience !== 'attorney' && audience !== 'client') {
    return new Response(
      JSON.stringify({ error: 'Audience must be "attorney" or "client"' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Build live context
  let context = ''
  try {
    context = await getAssistantContext({
      supabase,
      userId: user.id,
      audience,
      caseId: caseId || undefined,
    })
  } catch (err) {
    console.error('Error building assistant context:', err)
    context = '(Unable to load live data — answer based on general knowledge)'
  }

  const systemPrompt = (audience === 'attorney' ? ATTORNEY_PROMPT : CLIENT_PROMPT) + context

  // Log the query (fire and forget)
  supabase
    .from('assistant_logs')
    .insert({
      user_id: user.id,
      audience,
      case_id: caseId || null,
      message: message.trim(),
    })
    .then(() => {})
    .catch(() => {})

  // Build input with conversation history
  const input: Array<{ role: string; content: string }> = []
  const recentHistory = threadHistory.slice(-10)
  for (const msg of recentHistory) {
    input.push({ role: msg.role, content: msg.content })
  }
  input.push({ role: 'user', content: message })

  const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      instructions: systemPrompt,
      input,
      stream: true,
    }),
  })

  if (!openaiResponse.ok) {
    const errText = await openaiResponse.text()
    console.error('OpenAI Responses API error:', errText)
    return new Response(
      JSON.stringify({ error: 'Failed to get AI response' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Stream the response
  const encoder = new TextEncoder()
  const reader = openaiResponse.body?.getReader()

  if (!reader) {
    return new Response(
      JSON.stringify({ error: 'No response stream' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
            try {
              const event = JSON.parse(line.slice(6))
              if (event.type === 'response.output_text.delta' && event.delta) {
                controller.enqueue(encoder.encode(event.delta))
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      } catch (err) {
        console.error('Stream error:', err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  })
}
