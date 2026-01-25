import OpenAI from 'openai'

// Check for API key at runtime, not module load time
export function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY
}

export function isAIEnabled(): boolean {
  return !!getOpenAIKey()
}

// Lazy initialization of OpenAI client
let _openai: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = getOpenAIKey()
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set - AI features will use fallback')
    }
    _openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    })
  }
  return _openai
}

// Export for backwards compatibility
export const openai = new Proxy({} as OpenAI, {
  get(_, prop) {
    return getOpenAI()[prop as keyof OpenAI]
  }
})

export const AI_ENABLED = typeof process !== 'undefined' && !!process.env?.OPENAI_API_KEY

// GPT-4 pricing (Jan 2025)
export function calculateCost(promptTokens: number, completionTokens: number): number {
  const PROMPT_COST_PER_1K = 0.01
  const COMPLETION_COST_PER_1K = 0.03

  return ((promptTokens / 1000) * PROMPT_COST_PER_1K) +
         ((completionTokens / 1000) * COMPLETION_COST_PER_1K)
}
