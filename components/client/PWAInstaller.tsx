'use client'

import { useState, useEffect } from 'react'
import { Smartphone, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope)
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error)
        })
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Don't show if user already dismissed
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        setShowInstallPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowInstallPrompt(false)
    }

    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (!showInstallPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-2xl p-4 border border-gray-200 z-50 animate-in slide-in-from-bottom-4">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 rounded"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex gap-3">
        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-gray-900 mb-1">Install Unbind</h3>
          <p className="text-sm text-gray-600 mb-3">
            Get quick access from your home screen
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
