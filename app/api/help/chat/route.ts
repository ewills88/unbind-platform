import { NextRequest } from 'next/server'

const ATTORNEY_SYSTEM_PROMPT = `You are a helpful assistant for Unbind, an AI-powered divorce practice management platform for family law attorneys. Answer questions about features, pricing, setup, and how to use the platform. Be concise and direct. If asked about pricing, the standard rate is $179/month with a limited beta rate of $89/month locked for life. Do not make up features — if unsure, say you'll connect them with the Unbind team at support@unbind.law.`

const CLIENT_SYSTEM_PROMPT = `You are a helpful assistant for clients using the Unbind client portal. Unbind is a secure portal your divorce attorney uses to share case updates, documents, invoices, and messages with you. Answer questions about how to use the portal. Be warm, simple, and non-legal — never give legal advice. If you can't answer, direct them to message their attorney through the portal.`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  message: string
  audience: 'attorney' | 'client'
  threadHistory?: ChatMessage[]
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID

  let body: ChatRequest
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { message, audience, threadHistory = [] } = body

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

  const systemPrompt = audience === 'attorney' ? ATTORNEY_SYSTEM_PROMPT : CLIENT_SYSTEM_PROMPT

  // Build input array with conversation history
  const input: Array<{ role: string; content: string }> = []

  // Add conversation history (last 10 messages to stay within limits)
  const recentHistory = threadHistory.slice(-10)
  for (const msg of recentHistory) {
    input.push({ role: msg.role, content: msg.content })
  }

  // Add the new user message
  input.push({ role: 'user', content: message })

  // Build the Responses API request
  const requestBody: Record<string, unknown> = {
    model: 'gpt-4o',
    instructions: systemPrompt,
    input,
    stream: true,
  }

  // Add file_search tool if vector store is configured
  if (vectorStoreId) {
    requestBody.tools = [
      {
        type: 'file_search',
        vector_store_ids: [vectorStoreId],
      },
    ]
  }

  const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!openaiResponse.ok) {
    const errText = await openaiResponse.text()
    console.error('OpenAI Responses API error:', errText)
    return new Response(
      JSON.stringify({ error: 'Failed to get AI response' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Stream the response back to the client
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

          // Process complete SSE lines
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') continue

            try {
              const event = JSON.parse(line.slice(6))

              // Extract text delta from Responses API stream events
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
