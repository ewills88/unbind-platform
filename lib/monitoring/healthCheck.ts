// Extended health check module for production monitoring
// The existing app/api/health/route.ts handles the basic health endpoint.
// This module provides deeper checks for infrastructure monitoring.

import { createClient } from '@supabase/supabase-js'
import { getRedisClient, isRedisAvailable } from '@/lib/cache/redis'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: Record<string, ComponentHealth>
}

interface ComponentHealth {
  status: 'healthy' | 'unhealthy'
  latency?: number
  message?: string
  lastCheck: string
}

const startTime = Date.now()

export async function getHealthStatus(): Promise<HealthStatus> {
  const checks: Record<string, ComponentHealth> = {}

  checks.database = await checkDatabase()
  checks.redis = await checkRedis()
  checks.storage = await checkStorage()
  checks.stripe = await checkStripe()
  checks.email = await checkEmail()

  const statuses = Object.values(checks).map(c => c.status)
  const unhealthyCount = statuses.filter(s => s === 'unhealthy').length

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  if (unhealthyCount === 0) {
    overallStatus = 'healthy'
  } else if (unhealthyCount < statuses.length / 2) {
    overallStatus = 'degraded'
  } else {
    overallStatus = 'unhealthy'
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  }
}

async function checkDatabase(): Promise<ComponentHealth> {
  const start = Date.now()
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase.from('firms').select('count').limit(1).single()

    return {
      status: 'healthy',
      latency: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database check failed',
      lastCheck: new Date().toISOString(),
    }
  }
}

async function checkRedis(): Promise<ComponentHealth> {
  const start = Date.now()
  try {
    if (!isRedisAvailable()) {
      return {
        status: 'healthy',
        message: 'Redis not configured (optional)',
        lastCheck: new Date().toISOString(),
      }
    }

    const client = getRedisClient()
    if (client) {
      await client.ping()
    }

    return {
      status: 'healthy',
      latency: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Redis check failed',
      lastCheck: new Date().toISOString(),
    }
  }
}

async function checkStorage(): Promise<ComponentHealth> {
  const start = Date.now()
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase.storage.from('case-documents').list('', { limit: 1 })

    return {
      status: 'healthy',
      latency: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Storage check failed',
      lastCheck: new Date().toISOString(),
    }
  }
}

async function checkStripe(): Promise<ComponentHealth> {
  const start = Date.now()
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        status: 'healthy',
        message: 'Stripe not configured',
        lastCheck: new Date().toISOString(),
      }
    }

    const response = await fetch('https://api.stripe.com/v1/balance', {
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    })

    if (!response.ok) throw new Error('Stripe API error')

    return {
      status: 'healthy',
      latency: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Stripe check failed',
      lastCheck: new Date().toISOString(),
    }
  }
}

async function checkEmail(): Promise<ComponentHealth> {
  const start = Date.now()
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        status: 'healthy',
        message: 'Email not configured',
        lastCheck: new Date().toISOString(),
      }
    }

    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
    })

    if (!response.ok) throw new Error('Email service error')

    return {
      status: 'healthy',
      latency: Date.now() - start,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Email check failed',
      lastCheck: new Date().toISOString(),
    }
  }
}
