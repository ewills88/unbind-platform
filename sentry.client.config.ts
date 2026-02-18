// Sentry client-side configuration
// Install @sentry/nextjs to enable: npm install @sentry/nextjs

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/nextjs')

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  })
} catch {
  // @sentry/nextjs not installed - skip initialization
}
