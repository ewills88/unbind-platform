#!/usr/bin/env npx tsx

import fs from 'fs'
import path from 'path'
import { MigrationRunner } from '../lib/db/migrations'

async function main() {
  const runner = new MigrationRunner()
  const command = process.argv[2]

  switch (command) {
    case 'up':
      await runner.runAllPending()
      break
    case 'down': {
      const steps = parseInt(process.argv[3] || '1')
      await runner.rollback(steps)
      break
    }
    case 'status':
      await runner.status()
      break
    case 'create': {
      const name = process.argv[3]
      if (!name) {
        console.error('Usage: migrate create <migration_name>')
        process.exit(1)
      }
      createMigration(name)
      break
    }
    default:
      console.log('Usage: migrate <up|down|status|create> [args]')
  }
}

function createMigration(name: string) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14)
  const filename = `${timestamp}_${name}.sql`
  const downFilename = `${timestamp}_${name}.down.sql`

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

  fs.writeFileSync(
    path.join(migrationsDir, filename),
    `-- Migration: ${name}\n-- Created: ${new Date().toISOString()}\n\n`
  )

  fs.writeFileSync(
    path.join(migrationsDir, downFilename),
    `-- Rollback: ${name}\n-- Created: ${new Date().toISOString()}\n\n`
  )

  console.log(`Created migration: ${filename}`)
  console.log(`Created rollback: ${downFilename}`)
}

main().catch(console.error)
