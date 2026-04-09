'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // Register after page load to avoid blocking initial render
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Check for updates every 60 minutes
          setInterval(() => registration.update(), 60 * 60 * 1000)

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (!newWorker) return

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                // New SW activated — could show "update available" toast here
                console.log('[SW] New version available')
              }
            })
          })
        })
        .catch((err) => {
          console.error('[SW] Registration failed:', err)
        })
    })
  }, [])

  return null
}
