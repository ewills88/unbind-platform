#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { gzip } from 'zlib'

const execAsync = promisify(exec)
const gzipAsync = promisify(gzip)

interface BackupConfig {
  type: 'full' | 'incremental'
  destination: 's3' | 'local'
  retention: number // days
}

interface BackupManifest {
  name: string
  type: string
  timestamp: string
  files: string[]
  size: number
  version: string
}

async function createBackup(config: BackupConfig) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupName = `backup-${config.type}-${timestamp}`

  console.log(`Starting ${config.type} backup: ${backupName}`)

  const tempDir = path.join(process.env.TEMP || '/tmp', backupName)
  fs.mkdirSync(tempDir, { recursive: true })

  try {
    // Backup database
    console.log('Backing up database...')
    const dbBackupFile = path.join(tempDir, 'database.sql')

    await execAsync(
      `pg_dump "${process.env.SUPABASE_DB_URL}" --no-owner --no-acl > "${dbBackupFile}"`
    )

    // Compress database backup
    const dbContent = fs.readFileSync(dbBackupFile)
    const compressedDb = await gzipAsync(dbContent)
    fs.writeFileSync(`${dbBackupFile}.gz`, compressedDb)
    fs.unlinkSync(dbBackupFile)

    console.log('Database backup completed')

    // Backup storage metadata
    console.log('Backing up storage metadata...')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: files } = await supabase.storage
      .from('case-documents')
      .list('', { limit: 10000 })

    fs.writeFileSync(
      path.join(tempDir, 'storage-manifest.json'),
      JSON.stringify(files, null, 2)
    )

    console.log('Storage metadata backup completed')

    // Create backup manifest
    const manifest: BackupManifest = {
      name: backupName,
      type: config.type,
      timestamp: new Date().toISOString(),
      files: fs.readdirSync(tempDir),
      size: getTotalSize(tempDir),
      version: process.env.APP_VERSION || '1.0.0',
    }

    fs.writeFileSync(
      path.join(tempDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    )

    // Save to destination
    if (config.destination === 's3') {
      console.log('S3 upload requires @aws-sdk/client-s3. Install it and configure AWS credentials.')
      console.log('Falling back to local backup.')
      const localBackupDir = path.join(process.cwd(), 'backups', backupName)
      fs.cpSync(tempDir, localBackupDir, { recursive: true })
    } else {
      const localBackupDir = path.join(process.cwd(), 'backups', backupName)
      fs.mkdirSync(path.dirname(localBackupDir), { recursive: true })
      fs.cpSync(tempDir, localBackupDir, { recursive: true })
    }

    console.log(`Backup completed: ${backupName}`)

    // Cleanup old backups
    cleanupOldBackups(config.retention)

    return manifest
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

function cleanupOldBackups(retentionDays: number) {
  const backupsDir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(backupsDir)) return

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)

  const backups = fs.readdirSync(backupsDir)

  for (const backup of backups) {
    const manifestPath = path.join(backupsDir, backup, 'manifest.json')
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      if (new Date(manifest.timestamp) < cutoff) {
        fs.rmSync(path.join(backupsDir, backup), { recursive: true })
        console.log(`Deleted old backup: ${backup}`)
      }
    }
  }
}

function getTotalSize(directory: string): number {
  let total = 0
  const files = fs.readdirSync(directory)

  for (const file of files) {
    const stats = fs.statSync(path.join(directory, file))
    total += stats.size
  }

  return total
}

// CLI
const args = process.argv.slice(2)
const config: BackupConfig = {
  type: (args[0] as 'full' | 'incremental') || 'full',
  destination: (args[1] as 's3' | 'local') || 'local',
  retention: parseInt(args[2] || '30'),
}

createBackup(config)
  .then(manifest => {
    console.log('Backup manifest:', manifest)
    process.exit(0)
  })
  .catch(error => {
    console.error('Backup failed:', error)
    process.exit(1)
  })
