#!/usr/bin/env npx tsx

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { gunzip } from 'zlib'
import readline from 'readline'

const execAsync = promisify(exec)
const gunzipAsync = promisify(gunzip)

async function restoreBackup(backupPath: string) {
  // Confirm restoration
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const confirm = await new Promise<string>((resolve) => {
    rl.question(
      `WARNING: This will restore from ${backupPath}. Continue? (yes/no): `,
      resolve
    )
  })

  rl.close()

  if (confirm.toLowerCase() !== 'yes') {
    console.log('Restoration cancelled')
    return
  }

  console.log('Starting restoration...')

  // Read manifest
  const manifestPath = path.join(backupPath, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.error('No manifest.json found in backup directory')
    process.exit(1)
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

  console.log(`Restoring backup: ${manifest.name}`)
  console.log(`Created: ${manifest.timestamp}`)
  console.log(`Version: ${manifest.version}`)

  // Restore database
  const dbBackupPath = path.join(backupPath, 'database.sql.gz')
  if (fs.existsSync(dbBackupPath)) {
    console.log('Restoring database...')

    const compressed = fs.readFileSync(dbBackupPath)
    const decompressed = await gunzipAsync(compressed)

    const tempSqlFile = path.join(process.env.TEMP || '/tmp', 'restore.sql')
    fs.writeFileSync(tempSqlFile, decompressed)

    // Drop and recreate
    await execAsync(
      `psql "${process.env.SUPABASE_DB_URL}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`
    )

    // Restore
    await execAsync(
      `psql "${process.env.SUPABASE_DB_URL}" < "${tempSqlFile}"`
    )

    fs.unlinkSync(tempSqlFile)

    console.log('Database restored')
  }

  console.log('Restoration completed')
  console.log('\nPlease verify the restoration and run any necessary migrations')
}

// CLI
const backupPath = process.argv[2]

if (!backupPath) {
  console.error('Usage: restore.ts <backup-path>')
  process.exit(1)
}

restoreBackup(backupPath)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Restoration failed:', error)
    process.exit(1)
  })
