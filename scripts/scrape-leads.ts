/**
 * Scrape divorce attorney leads from Avvo.
 *
 * Usage: npm run scrape
 * Requires: SCRAPERAPI_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SCRAPERAPI_KEY = process.env.SCRAPERAPI_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SCRAPERAPI_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required env vars: SCRAPERAPI_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const MARKETS = [
  { city: 'Los Angeles', state: 'CA' },
  { city: 'Houston', state: 'TX' },
  { city: 'Miami', state: 'FL' },
  { city: 'San Diego', state: 'CA' },
  { city: 'Dallas', state: 'TX' },
  { city: 'Austin', state: 'TX' },
  { city: 'Tampa', state: 'FL' },
  { city: 'San Jose', state: 'CA' },
  { city: 'Orlando', state: 'FL' },
  { city: 'Fort Worth', state: 'TX' },
]

const TARGET_LEADS = 200
const LEADS_PER_MARKET = Math.ceil(TARGET_LEADS / MARKETS.length)

interface Lead {
  name: string
  email: string | null
  firm_name: string | null
  city: string
  state: string
  phone: string | null
  avvo_url: string | null
  source: string
}

function createSupabaseClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(SUPABASE_URL!, SUPABASE_KEY!)
}

// ─── Validation ────────────────────────────────────────────────────────────
// Prevents bad data (image URLs, Google review blurbs, quoted strings, etc.)
// from being inserted into outreach_leads.

function isValidEmail(email: string | null | undefined): email is string {
  if (!email) return false
  const trimmed = email.trim().toLowerCase()
  if (trimmed.length === 0 || trimmed.length > 254) return false
  if (trimmed === 'no email') return false
  // Reject image/asset extensions that the scraper sometimes picks up
  if (/\.(png|jpe?g|gif|svg|webp|ico|pdf|css|js)(\?|$)/i.test(trimmed)) return false
  // Reject common garbage tokens
  if (/(noreply|no-reply|example\.com|sentry|cloudflare|wixpress|godaddy|wordpress)/i.test(trimmed)) return false
  // Strict RFC-ish check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

function isValidName(name: string | null | undefined): name is string {
  if (!name) return false
  const trimmed = name.trim()
  if (trimmed.length < 3 || trimmed.length > 100) return false
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) return false
  // Reject obvious review/firm-blurb text
  const lower = trimmed.toLowerCase()
  if (/^the\s+.*law\s+firm/i.test(trimmed)) return false
  if (/\b(review|rating|stars?|client|customer|great|excellent|recommend)\b/.test(lower)) return false
  // Must contain at least one space (first + last) and only sensible chars
  if (!/\s/.test(trimmed)) return false
  if (!/^[a-zA-Z][a-zA-Z .,'\-]+$/.test(trimmed)) return false
  return true
}

function isValidFirm(firm: string | null | undefined): boolean {
  if (!firm) return false
  const trimmed = firm.trim()
  return trimmed.length > 0 && trimmed.length < 200 && trimmed !== '—'
}

function isValidLead(lead: Lead): boolean {
  if (!isValidName(lead.name)) return false
  if (!isValidFirm(lead.firm_name)) return false
  // Email is optional at scrape time, but if present must be valid
  if (lead.email !== null && !isValidEmail(lead.email)) return false
  return true
}

async function fetchWithProxy(url: string): Promise<string> {
  const proxyUrl = `http://api.scraperapi.com?api_key=${SCRAPERAPI_KEY}&url=${encodeURIComponent(url)}&render=false`

  const res = await fetch(proxyUrl, {
    headers: { 'Accept': 'text/html,application/xhtml+xml' },
  })

  if (!res.ok) {
    throw new Error(`ScraperAPI returned ${res.status} for ${url}`)
  }

  return res.text()
}

function extractLeadsFromAvvoHTML(html: string, city: string, state: string): Lead[] {
  const leads: Lead[] = []

  // Match attorney listing blocks — Avvo uses structured patterns
  // Extract name from <a> tags with lawyer profile URLs
  const profilePattern = /href="(https?:\/\/www\.avvo\.com\/attorneys\/[^"]+)"[^>]*>([^<]+)<\/a>/gi
  const namePattern = /class="[^"]*lawyer-name[^"]*"[^>]*>([^<]+)</gi
  const phonePattern = /(\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4})/g

  // Strategy 1: Look for structured attorney cards
  const cardPattern = /<div[^>]*class="[^"]*serp-result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi
  let cardMatch

  while ((cardMatch = cardPattern.exec(html)) !== null) {
    const card = cardMatch[1]

    // Extract name
    const nameMatch = card.match(/class="[^"]*lawyer[_-]?name[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i)
      || card.match(/<a[^>]*href="\/attorneys\/[^"]*"[^>]*>([^<]+)<\/a>/i)
      || card.match(/<h[23][^>]*>\s*<a[^>]*>([^<]+)<\/a>/i)

    if (!nameMatch) continue

    const name = nameMatch[1].trim()
    if (!name || name.length < 3) continue

    // Extract profile URL
    const urlMatch = card.match(/href="(https?:\/\/www\.avvo\.com\/attorneys\/[^"]+)"/i)
      || card.match(/href="(\/attorneys\/[^"]+)"/i)
    const avvoUrl = urlMatch
      ? (urlMatch[1].startsWith('http') ? urlMatch[1] : `https://www.avvo.com${urlMatch[1]}`)
      : null

    // Extract phone
    const phoneMatch = card.match(phonePattern)
    const phone = phoneMatch ? phoneMatch[0] : null

    // Extract firm name
    const firmMatch = card.match(/class="[^"]*firm[_-]?name[^"]*"[^>]*>([^<]+)</i)
      || card.match(/class="[^"]*law[_-]?firm[^"]*"[^>]*>([^<]+)</i)
    const firmName = firmMatch ? firmMatch[1].trim() : null

    leads.push({
      name,
      email: null,
      firm_name: firmName,
      city,
      state,
      phone,
      avvo_url: avvoUrl,
      source: 'avvo',
    })
  }

  // Strategy 2: Fallback — scan for profile links directly
  if (leads.length === 0) {
    let match
    const seen = new Set<string>()

    while ((match = profilePattern.exec(html)) !== null) {
      const url = match[1]
      const name = match[2].trim()

      if (seen.has(name) || name.length < 3) continue
      if (name.toLowerCase().includes('find') || name.toLowerCase().includes('search')) continue

      seen.add(name)

      leads.push({
        name,
        email: null,
        firm_name: null,
        city,
        state,
        phone: null,
        avvo_url: url,
        source: 'avvo',
      })
    }
  }

  return leads
}

async function tryExtractEmail(avvoUrl: string): Promise<string | null> {
  try {
    const html = await fetchWithProxy(avvoUrl)

    // Look for website link on Avvo profile
    const websiteMatch = html.match(/href="(https?:\/\/(?!www\.avvo\.com)[^"]+)"[^>]*>\s*(?:Website|Visit\s+(?:my\s+)?website)/i)
      || html.match(/class="[^"]*website[^"]*"[^>]*href="([^"]+)"/i)

    if (!websiteMatch) return null

    const websiteUrl = websiteMatch[1]
    const siteHtml = await fetchWithProxy(websiteUrl)

    // Extract all candidate emails from website, return first valid one
    const emailMatches = siteHtml.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi)
    for (const m of emailMatches) {
      const candidate = m[1].toLowerCase()
      if (isValidEmail(candidate)) {
        return candidate
      }
    }
  } catch {
    // Email extraction is best-effort
  }
  return null
}

async function getExistingLeadKeys(supabase: ReturnType<typeof createSupabaseClient>): Promise<Set<string>> {
  const { data } = await supabase
    .from('outreach_leads')
    .select('name, city, state')

  const keys = new Set<string>()
  if (data) {
    for (const row of data) {
      keys.add(`${row.name}|${row.city}|${row.state}`.toLowerCase())
    }
  }
  return keys
}

async function scrapeMarket(city: string, state: string, limit: number): Promise<Lead[]> {
  const slug = city.toLowerCase().replace(/\s+/g, '-')
  const stateSlug = state.toLowerCase()

  // Avvo search URL pattern
  const urls = [
    `https://www.avvo.com/all-lawyers/divorce--${slug}-${stateSlug}.html`,
    `https://www.avvo.com/search/lawyer_search?q=divorce+attorney&loc=${encodeURIComponent(city + ', ' + state)}`,
  ]

  const allLeads: Lead[] = []

  for (const url of urls) {
    if (allLeads.length >= limit) break

    console.log(`  Fetching: ${url}`)
    try {
      const html = await fetchWithProxy(url)
      const leads = extractLeadsFromAvvoHTML(html, city, state)
      console.log(`  Found ${leads.length} leads from this page`)
      allLeads.push(...leads)

      // Rate limit — be respectful
      await new Promise(r => setTimeout(r, 2000))

      // Try page 2 if we need more
      if (allLeads.length < limit) {
        const page2Url = url.includes('?') ? `${url}&page=2` : `${url}?page=2`
        try {
          const html2 = await fetchWithProxy(page2Url)
          const leads2 = extractLeadsFromAvvoHTML(html2, city, state)
          console.log(`  Found ${leads2.length} leads from page 2`)
          allLeads.push(...leads2)
          await new Promise(r => setTimeout(r, 2000))
        } catch {
          // Page 2 may not exist
        }
      }
    } catch (err) {
      console.error(`  Error scraping ${url}:`, err instanceof Error ? err.message : err)
    }
  }

  return allLeads.slice(0, limit)
}

async function main() {
  console.log('=== Unbind Lead Scraper ===\n')
  console.log(`Target: ${TARGET_LEADS} leads across ${MARKETS.length} markets\n`)

  const supabase = createSupabaseClient()
  const existingKeys = await getExistingLeadKeys(supabase)
  console.log(`Existing leads in database: ${existingKeys.size}\n`)

  let totalNew = 0
  let totalSkipped = 0

  for (const market of MARKETS) {
    console.log(`\n--- ${market.city}, ${market.state} ---`)

    const leads = await scrapeMarket(market.city, market.state, LEADS_PER_MARKET)
    console.log(`  Scraped ${leads.length} raw leads`)

    // Step 1: filter out invalid records (bad names, missing firms, etc.)
    const validLeads = leads.filter(lead => {
      const valid = isValidLead(lead)
      if (!valid) console.log(`  Rejected invalid lead: "${lead.name}" (firm: ${lead.firm_name || 'null'})`)
      return valid
    })
    const invalidCount = leads.length - validLeads.length
    if (invalidCount > 0) console.log(`  Filtered ${invalidCount} invalid leads`)

    // Step 2: deduplicate
    const newLeads = validLeads.filter(lead => {
      const key = `${lead.name}|${lead.city}|${lead.state}`.toLowerCase()
      return !existingKeys.has(key)
    })

    const skipped = validLeads.length - newLeads.length
    totalSkipped += skipped
    if (skipped > 0) console.log(`  Skipped ${skipped} duplicates`)

    // Step 3: try to extract emails for top leads (limit API calls)
    const emailLimit = Math.min(newLeads.length, 5)
    for (let i = 0; i < emailLimit; i++) {
      if (newLeads[i].avvo_url) {
        console.log(`  Extracting email for ${newLeads[i].name}...`)
        const extracted = await tryExtractEmail(newLeads[i].avvo_url!)
        // Only assign if extraction returned a valid email
        if (extracted && isValidEmail(extracted)) {
          newLeads[i].email = extracted
          console.log(`    Found: ${extracted}`)
        } else if (extracted) {
          console.log(`    Rejected invalid email: ${extracted}`)
        }
        await new Promise(r => setTimeout(r, 1500))
      }
    }

    // Step 4: final validation pass before insert (belt-and-suspenders)
    const insertableLeads = newLeads.filter(isValidLead)

    // Step 5: insert into Supabase
    if (insertableLeads.length > 0) {
      const { error } = await supabase
        .from('outreach_leads')
        .insert(insertableLeads)

      if (error) {
        console.error(`  Insert error:`, error.message)
      } else {
        console.log(`  Inserted ${insertableLeads.length} new leads`)
        totalNew += insertableLeads.length

        // Track in existing keys set
        for (const lead of insertableLeads) {
          existingKeys.add(`${lead.name}|${lead.city}|${lead.state}`.toLowerCase())
        }
      }
    }

    // Rate limit between markets
    await new Promise(r => setTimeout(r, 3000))
  }

  console.log(`\n=== DONE ===`)
  console.log(`New leads inserted: ${totalNew}`)
  console.log(`Duplicates skipped: ${totalSkipped}`)
  console.log(`Total leads in database: ${existingKeys.size}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
