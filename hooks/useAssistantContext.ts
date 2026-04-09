'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

interface AssistantContext {
  audience: 'attorney' | 'client'
  caseId: string | null
}

export function useAssistantContext(): AssistantContext {
  const pathname = usePathname()

  return useMemo(() => {
    // Client portal
    if (pathname.startsWith('/portal')) {
      return { audience: 'client' as const, caseId: null }
    }

    // Attorney dashboard — check for case-specific route
    const caseMatch = pathname.match(/\/dashboard\/cases\/([a-f0-9-]+)/)
    const caseId = caseMatch ? caseMatch[1] : null

    return { audience: 'attorney' as const, caseId }
  }, [pathname])
}
