import { createClient } from '@supabase/supabase-js'
import { AIUsageLog } from '@/types/ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function logAIUsage(
  userId: string,
  caseId: string | null,
  documentId: string | null,
  log: AIUsageLog
): Promise<void> {
  try {
    const { error } = await supabase.from('ai_usage_logs').insert({
      user_id: userId,
      case_id: caseId,
      document_id: documentId,
      ...log,
    })
    
    if (error) throw error
  } catch (error) {
    console.error('Failed to log AI usage:', error)
    // Don't throw - logging failures shouldn't break the app
  }
}