'use client'

// Session 25: Help Tooltip Component
// Shows a ? icon button, on click displays a positioned tooltip with help text

import { useState, useRef, useEffect } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface HelpTooltipProps {
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function HelpTooltip({ title, content, position = 'bottom' }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50"
        aria-label={`Help: ${title}`}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`absolute z-50 w-64 bg-white rounded-lg shadow-lg border border-gray-200 transition-all duration-200 ${
          positionClasses[position]
        } ${
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-3">
          <p className="text-sm text-gray-600 leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  )
}
