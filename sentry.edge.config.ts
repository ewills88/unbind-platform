// Sentry edge runtime configuration
// Install @sentry/nextjs to enable: npm install @sentry/nextjs

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/nextjs')

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  })
} catch {
  // @sentry/nextjs not installed - skip initialization
}
