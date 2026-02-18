import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export class MigrationRunner {
  private supabase: SupabaseClient
  private migrationsDir: string

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    this.migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  }

  async initialize(): Promise<void> {
    await this.supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })
  }

  async getAppliedMigrations(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('_migrations')
      .select('name')
      .order('id', { ascending: true })

    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data?.map((m: any) => m.name) || []
  }

  async getPendingMigrations(): Promise<string[]> {
    const applied = await this.getAppliedMigrations()
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.includes('.down.'))
      .sort()

    return files.filter(f => !applied.includes(f))
  }

  async runMigration(filename: string): Promise<void> {
    const filePath = path.join(this.migrationsDir, filename)
    const sql = fs.readFileSync(filePath, 'utf-8')

    console.log(`Running migration: ${filename}`)

    const { error } = await this.supabase.rpc('exec_sql', { sql })

    if (error) {
      console.error(`Migration failed: ${filename}`, error)
      throw error
    }

    await this.supabase
      .from('_migrations')
      .insert({ name: filename })

    console.log(`Migration completed: ${filename}`)
  }

  async runAllPending(): Promise<void> {
    await this.initialize()

    const pending = await this.getPendingMigrations()

    if (pending.length === 0) {
      console.log('No pending migrations')
      return
    }

    console.log(`Found ${pending.length} pending migrations`)

    for (const migration of pending) {
      await this.runMigration(migration)
    }

    console.log('All migrations completed')
  }

  async rollback(steps: number = 1): Promise<void> {
    const applied = await this.getAppliedMigrations()
    const toRollback = applied.slice(-steps)

    for (const migration of toRollback.reverse()) {
      const downFile = migration.replace('.sql', '.down.sql')
      const downPath = path.join(this.migrationsDir, downFile)

      if (fs.existsSync(downPath)) {
        const sql = fs.readFileSync(downPath, 'utf-8')

        console.log(`Rolling back: ${migration}`)

        await this.supabase.rpc('exec_sql', { sql })

        await this.supabase
          .from('_migrations')
          .delete()
          .eq('name', migration)

        console.log(`Rolled back: ${migration}`)
      } else {
        console.warn(`No rollback file for: ${migration}`)
      }
    }
  }

  async status(): Promise<void> {
    await this.initialize()

    const applied = await this.getAppliedMigrations()
    const pending = await this.getPendingMigrations()

    console.log('\n=== Migration Status ===\n')
    console.log('Applied migrations:')
    applied.forEach(m => console.log(`  + ${m}`))

    console.log('\nPending migrations:')
    pending.forEach(m => console.log(`  o ${m}`))

    console.log(`\nTotal: ${applied.length} applied, ${pending.length} pending\n`)
  }
}
