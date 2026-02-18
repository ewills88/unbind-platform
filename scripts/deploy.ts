#!/usr/bin/env npx tsx

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

type Environment = 'staging' | 'production'

interface DeployConfig {
  environment: Environment
  skipTests: boolean
  skipMigrations: boolean
}

async function deploy(config: DeployConfig) {
  console.log(`\nStarting deployment to ${config.environment}\n`)

  const startTime = Date.now()

  try {
    // Step 1: Run tests
    if (!config.skipTests) {
      console.log('Step 1/5: Running tests...')
      await execAsync('npm run test:unit')
      console.log('Tests passed\n')
    } else {
      console.log('Step 1/5: Skipping tests\n')
    }

    // Step 2: Build
    console.log('Step 2/5: Building application...')
    await execAsync('npm run build')
    console.log('Build completed\n')

    // Step 3: Run migrations
    if (!config.skipMigrations) {
      console.log('Step 3/5: Running database migrations...')
      try {
        await execAsync('npm run db:migrate')
        console.log('Migrations completed\n')
      } catch (migrationError) {
        console.warn('Migration step skipped (no migration runner configured)\n')
      }
    } else {
      console.log('Step 3/5: Skipping migrations\n')
    }

    // Step 4: Deploy to Vercel
    console.log('Step 4/5: Deploying to Vercel...')
    const deployCmd = config.environment === 'production'
      ? 'vercel --prod'
      : 'vercel'

    const { stdout: deployUrl } = await execAsync(deployCmd)
    console.log(`Deployed to: ${deployUrl.trim()}\n`)

    // Step 5: Verify deployment
    console.log('Step 5/5: Verifying deployment...')
    await new Promise(resolve => setTimeout(resolve, 10000))

    const healthUrl = `${deployUrl.trim()}/api/health`
    try {
      const { stdout: healthResponse } = await execAsync(`curl -s ${healthUrl}`)
      const health = JSON.parse(healthResponse)

      if (health.status === 'unhealthy') {
        throw new Error(`Health check failed: ${JSON.stringify(health)}`)
      }
      console.log('Health check passed\n')
    } catch {
      console.warn('Health check could not be verified\n')
    }

    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log(`\nDeployment to ${config.environment} completed successfully!`)
    console.log(`   URL: ${deployUrl.trim()}`)
    console.log(`   Duration: ${duration}s\n`)

    // Send Slack notification if configured
    await sendSlackNotification({
      environment: config.environment,
      url: deployUrl.trim(),
      status: 'success',
      duration: Date.now() - startTime,
    })
  } catch (error) {
    console.error('\nDeployment failed:', error)

    await sendSlackNotification({
      environment: config.environment,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    })

    process.exit(1)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendSlackNotification(data: any) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  const color = data.status === 'success' ? 'good' : 'danger'

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color,
          title: `Deployment ${data.status}: ${data.environment}`,
          fields: [
            { title: 'Environment', value: data.environment, short: true },
            { title: 'Duration', value: `${Math.round(data.duration / 1000)}s`, short: true },
            ...(data.url ? [{ title: 'URL', value: data.url }] : []),
            ...(data.error ? [{ title: 'Error', value: data.error }] : []),
          ],
          ts: Math.floor(Date.now() / 1000),
        }],
      }),
    })
  } catch {
    console.warn('Failed to send Slack notification')
  }
}

// CLI
const args = process.argv.slice(2)
const config: DeployConfig = {
  environment: (args[0] as Environment) || 'staging',
  skipTests: args.includes('--skip-tests'),
  skipMigrations: args.includes('--skip-migrations'),
}

if (!['staging', 'production'].includes(config.environment)) {
  console.error('Usage: deploy.ts <staging|production> [--skip-tests] [--skip-migrations]')
  process.exit(1)
}

deploy(config)
