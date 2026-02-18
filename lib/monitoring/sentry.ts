// Sentry error monitoring integration
// Requires @sentry/nextjs to be installed for full functionality.
// When Sentry is not installed, all functions gracefully no-op.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any = null

try {
  // Dynamic require to avoid build errors when @sentry/nextjs is not installed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require('@sentry/nextjs')
} catch {
  // Sentry not installed - all functions will no-op
}

export function initSentry() {
  if (!Sentry || !process.env.SENTRY_DSN) return

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Ignore certain errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],

    // Sanitize sensitive data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    beforeSend(event: any) {
      if (event.breadcrumbs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb: any) => {
          if (breadcrumb.data) {
            delete breadcrumb.data.password
            delete breadcrumb.data.token
            delete breadcrumb.data.authorization
          }
          return breadcrumb
        })
      }
      return event
    },

    // Filter noisy breadcrumbs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    beforeBreadcrumb(breadcrumb: any) {
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null
      }
      return breadcrumb
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function captureException(error: Error, context?: Record<string, any>) {
  if (!Sentry) {
    console.error('Sentry not available:', error.message)
    return
  }
  Sentry.captureException(error, { extra: context })
}

export function captureMessage(message: string, level: string = 'info') {
  if (!Sentry) {
    console.log(`[${level}] ${message}`)
    return
  }
  Sentry.captureMessage(message, level)
}

export function setUser(user: { id: string; email?: string; firmId?: string }) {
  if (!Sentry) return
  Sentry.setUser({
    id: user.id,
    email: user.email,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

export function clearUser() {
  if (!Sentry) return
  Sentry.setUser(null)
}
