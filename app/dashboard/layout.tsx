'use client'

import dynamic from 'next/dynamic'

const AssistantBubble = dynamic(
  () => import('@/components/assistant/AssistantBubble'),
  { ssr: false }
)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AssistantBubble />
    </>
  )
}
