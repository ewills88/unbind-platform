/**
 * Clean out bad outreach_leads rows that the scraper imported.
 *
 * Usage: npx tsx scripts/clean-bad-leads.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Deletes rows where:
 *   - email is null, empty, "no email", or doesn't contain "@"
 *   - email ends with an image/asset extension (.png, .jpg, etc.)
 *   - name starts with a quote, is "The ... law firm", or is > 100 chars
 *   - firm_name is null/empty
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface Lead {
  id: string
  name: string | null
  email: string | null
  firm_name: string | null
}

function emailIsBad(email: string | null): boolean {
  if (!email) return true
  const e = email.trim().toLowerCase()
  if (e.length === 0) return true
  if (e === 'no email') return true
  if (!e.includes('@')) return true
  if (/\.(png|jpe?g|gif|svg|webp|ico|pdf|css|js)(\?|$)/i.test(e)) return true
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return true
  return false
}

function nameIsBad(name: string | null): boolean {
  if (!name) return true
  const n = name.trim()
  if (n.length === 0) return true
  if (n.length > 100) return true
  if (n.startsWith('"') || n.startsWith("'")) return true
  if (/^the\s+.*law\s+firm/i.test(n)) return true
  return false
}

function firmIsBad(firm: string | null): boolean {
  if (!firm) return true
  const f = firm.trim()
  return f.length === 0 || f === '—'
}

async function main() {
  console.log('=== Clean Bad Outreach Leads ===\n')

  const { data: allLeads, error: fetchErr } = await supabase
    .from('outreach_leads')
    .select('id, name, email, firm_name')

  if (fetchErr) {
    console.error('Fetch error:', fetchErr.message)
    process.exit(1)
  }

  const leads = (allLeads || []) as Lead[]
  console.log(`Total leads in DB: ${leads.length}\n`)

  const badIds: string[] = []
  const reasons: Record<string, number> = { email: 0, name: 0, firm: 0 }

  for (const lead of leads) {
    const reasonList: string[] = []
    if (emailIsBad(lead.email)) { reasonList.push('email'); reasons.email++ }
    if (nameIsBad(lead.name)) { reasonList.push('name'); reasons.name++ }
    if (firmIsBad(lead.firm_name)) { reasonList.push('firm'); reasons.firm++ }

    if (reasonList.length > 0) {
      badIds.push(lead.id)
      console.log(`  DELETE ${lead.id} [${reasonList.join(',')}]  name="${lead.name}"  email="${lead.email}"  firm="${lead.firm_name}"`)
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`Bad leads found: ${badIds.length}`)
  console.log(`  bad email: ${reasons.email}`)
  console.log(`  bad name:  ${reasons.name}`)
  console.log(`  bad firm:  ${reasons.firm}`)

  if (badIds.length === 0) {
    console.log('\nNothing to delete. Done.')
    return
  }

  // Supports --dry-run to preview without deleting
  if (process.argv.includes('--dry-run')) {
    console.log('\n[dry-run] No rows deleted.')
    return
  }

  // Delete in batches of 100 to keep URL short
  let deleted = 0
  for (let i = 0; i < badIds.length; i += 100) {
    const batch = badIds.slice(i, i + 100)
    const { error } = await supabase
      .from('outreach_leads')
      .delete()
      .in('id', batch)

    if (error) {
      console.error(`Delete error on batch ${i}:`, error.message)
    } else {
      deleted += batch.length
    }
  }

  console.log(`\nDeleted ${deleted} bad leads.`)
  console.log(`Remaining leads: ${leads.length - deleted}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
