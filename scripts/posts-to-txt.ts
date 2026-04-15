/**
 * Convert posts.json to Buffer-ready posts.txt
 * Output: public/social/posts.txt
 *
 * Usage: npx tsx scripts/posts-to-txt.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const inPath = path.join(process.cwd(), 'public', 'social', 'posts.json')
const outPath = path.join(process.cwd(), 'public', 'social', 'posts.txt')

const posts = JSON.parse(fs.readFileSync(inPath, 'utf-8'))

const lines: string[] = []

for (const post of posts) {
  const [y, m, day] = post.date.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1, day))
  const dayName = DAYS[d.getUTCDay()]
  const monthName = MONTHS[d.getUTCMonth()]
  const dayNum = d.getUTCDate()

  lines.push(`=== POST ${post.day} — ${dayName} ${monthName} ${dayNum} ${post.time} ===`)
  lines.push(post.content)
  lines.push('')
  lines.push('')
}

fs.writeFileSync(outPath, lines.join('\n'))
console.log(`Exported ${posts.length} posts → ${outPath}`)
