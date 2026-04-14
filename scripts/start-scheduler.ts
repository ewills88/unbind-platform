/**
 * Cron scheduler for Unbind outreach emails.
 * Runs email-scheduler.ts daily at 9:00 AM.
 *
 * Usage: npm run scheduler
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import cron from 'node-cron'
import { execSync } from 'child_process'

console.log('=== Unbind Email Scheduler Started ===')
console.log(`Time: ${new Date().toISOString()}`)
console.log('Schedule: Every day at 9:00 AM\n')

// Run immediately on start
console.log('Running initial check...\n')
try {
  execSync('npx tsx scripts/email-scheduler.ts', { stdio: 'inherit' })
} catch {
  console.error('Initial run failed')
}

// Schedule daily at 9:00 AM
cron.schedule('0 9 * * *', () => {
  console.log(`\n[${new Date().toISOString()}] Cron triggered — running email scheduler\n`)
  try {
    execSync('npx tsx scripts/email-scheduler.ts', { stdio: 'inherit' })
  } catch {
    console.error('Scheduled run failed')
  }
})

console.log('\nScheduler running. Press Ctrl+C to stop.')
