'use client'

interface UnreadBadgeProps {
  count: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function UnreadBadge({
  count,
  size = 'md',
  className = ''
}: UnreadBadgeProps) {
  if (count <= 0) return null

  const sizeClasses = {
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm'
  }

  const displayCount = count > 99 ? '99+' : count.toString()

  return (
    <span
      className={`
        inline-flex items-center justify-center
        bg-red-500 text-white font-medium rounded-full
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {displayCount}
    </span>
  )
}
