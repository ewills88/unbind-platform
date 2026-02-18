import { z } from 'zod'

const booleanString = z.string().transform(v => v === 'true').default('true')

// In production, most variables are required.
// In development/test, most are optional to allow partial setup.
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Unbind'),
  APP_VERSION: z.string().default('1.0.0'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().default(''),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(''),
  SUPABASE_DB_URL: z.string().optional(),

  // Authentication
  JWT_SECRET: z.string().default('dev-jwt-secret-not-for-production-use'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORTAL_JWT_SECRET: z.string().default('dev-portal-jwt-secret-not-for-prod'),
  MAGIC_LINK_SECRET: z.string().default('dev-magic-link-secret-not-for-prod'),

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_TLS_URL: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@localhost'),

  // Monitoring
  SENTRY_DSN: z.string().optional(),

  // Feature Flags
  NEXT_PUBLIC_FEATURE_CLIENT_PORTAL: booleanString,
  NEXT_PUBLIC_FEATURE_E_FILING: booleanString,
  NEXT_PUBLIC_FEATURE_AI_DOCUMENTS: booleanString,

  // Rate Limiting
  RATE_LIMIT_REQUESTS: z.string().transform(Number).default('100'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('60'),

  // Cron / Metrics secrets
  CRON_SECRET: z.string().optional(),
  METRICS_SECRET: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null

function validateEnv(): Env {
  if (cachedEnv) return cachedEnv

  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment variables')
  }

  // Production-only strict checks
  if (parsed.data.NODE_ENV === 'production') {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ] as const

    for (const key of required) {
      if (!parsed.data[key]) {
        throw new Error(`Missing required production env var: ${key}`)
      }
    }

    if (parsed.data.JWT_SECRET.includes('not-for-production')) {
      throw new Error('JWT_SECRET must be changed for production')
    }
  }

  cachedEnv = parsed.data
  return cachedEnv
}

export const env = validateEnv()

// Helper functions
export const isProduction = () => env.NODE_ENV === 'production'
export const isStaging = () => env.NODE_ENV === 'staging'
export const isDevelopment = () => env.NODE_ENV === 'development'
export const isTest = () => env.NODE_ENV === 'test'

export const getBaseUrl = () => {
  if (typeof window !== 'undefined') return ''
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL
  return `http://localhost:${process.env.PORT || 3000}`
}
