// Secrets management vault
// In production, secrets can be fetched from AWS Secrets Manager or similar.
// In development, secrets come from .env.local.
// Requires @aws-sdk/client-secrets-manager for AWS integration.

interface SecretCache {
  value: string
  expiresAt: number
}

const cache: Map<string, SecretCache> = new Map()
const CACHE_TTL = 300000 // 5 minutes

export async function getSecret(secretName: string): Promise<string> {
  // Check cache first
  const cached = cache.get(secretName)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  // In non-production or without AWS SDK, fall back to env vars
  const envValue = process.env[secretName]
  if (envValue) {
    cache.set(secretName, {
      value: envValue,
      expiresAt: Date.now() + CACHE_TTL,
    })
    return envValue
  }

  // Try AWS Secrets Manager if available
  try {
    // Dynamic import to avoid requiring AWS SDK in all environments
    const { SecretsManagerClient, GetSecretValueCommand } = await import(
      '@aws-sdk/client-secrets-manager'
    )

    const client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })

    const command = new GetSecretValueCommand({ SecretId: secretName })
    const response = await client.send(command)
    const secretValue = response.SecretString!

    cache.set(secretName, {
      value: secretValue,
      expiresAt: Date.now() + CACHE_TTL,
    })

    return secretValue
  } catch {
    throw new Error(`Secret not found: ${secretName}`)
  }
}

export async function getSecretJSON<T>(secretName: string): Promise<T> {
  const secret = await getSecret(secretName)
  return JSON.parse(secret) as T
}

export function clearSecretCache(): void {
  cache.clear()
}

// Helper for loading all secrets at startup
export async function loadSecrets(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    return // Use .env in development
  }

  try {
    const secrets = await getSecretJSON<Record<string, string>>(
      'unbind/production'
    )

    Object.entries(secrets).forEach(([key, value]) => {
      process.env[key] = value
    })

    console.log('Secrets loaded successfully')
  } catch {
    console.warn('AWS Secrets Manager not available, using environment variables')
  }
}
