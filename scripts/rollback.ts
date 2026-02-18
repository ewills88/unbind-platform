#!/usr/bin/env npx tsx

import { exec } from 'child_process'
import { promisify } from 'util'
import readline from 'readline'

const execAsync = promisify(exec)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendSlackNotification(data: any) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Rollback performed on ${data.environment} to deployment ${data.deployment}`,
      }),
    })
  } catch {
    console.warn('Failed to send Slack notification')
  }
}

async function rollback(environment: string, steps: number = 1) {
  console.log(`\nRolling back ${environment} by ${steps} deployment(s)\n`)

  // Confirm rollback
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const confirm = await new Promise<string>((resolve) => {
    rl.question('Are you sure you want to rollback? (yes/no): ', resolve)
  })

  rl.close()

  if (confirm.toLowerCase() !== 'yes') {
    console.log('Rollback cancelled')
    return
  }

  try {
    // List recent deployments
    console.log('Fetching deployment history...')
    const { stdout: deployments } = await execAsync('vercel ls --limit 10')
    console.log(deployments)

    // Get deployment to rollback to
    const lines = deployments.split('\n').filter(l => l.includes(environment))
    const targetDeployment = lines[steps]

    if (!targetDeployment) {
      throw new Error(`No deployment found at position ${steps}`)
    }

    const deploymentId = targetDeployment.split(/\s+/)[0]

    console.log(`Rolling back to deployment: ${deploymentId}`)

    // Promote the old deployment
    await execAsync(`vercel promote ${deploymentId}`)

    console.log('\nRollback completed successfully')

    await sendSlackNotification({
      type: 'rollback',
      environment,
      deployment: deploymentId,
    })
  } catch (error) {
    console.error('Rollback failed:', error)
    process.exit(1)
  }
}

// CLI
const environment = process.argv[2] || 'staging'
const steps = parseInt(process.argv[3] || '1')

rollback(environment, steps)
