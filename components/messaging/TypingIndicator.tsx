'use client'

import { TypingIndicator as TypingType } from '@/types/messages'

interface TypingIndicatorProps {
  users: TypingType[]
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null

  const names = users
    .map(u => u.user?.full_name || 'Someone')
    .slice(0, 3)

  let text = ''
  if (names.length === 1) {
    text = `${names[0]} is typing`
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing`
  } else {
    text = `${names[0]} and ${users.length - 1} others are typing`
  }

  return (
    <div className="flex items-center gap-3 text-gray-500 text-sm py-2 px-1 animate-in fade-in duration-200">
      {/* Typing bubble indicator */}
      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2">
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '600ms' }}
          />
          <span
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms', animationDuration: '600ms' }}
          />
          <span
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms', animationDuration: '600ms' }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-500">{text}...</span>
    </div>
  )
}
