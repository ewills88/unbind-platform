/**
 * Convert posts.json to posts.csv for easy copy-paste.
 * Output: public/social/posts.csv
 *
 * Usage: npx tsx scripts/posts-to-csv.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const inPath = path.join(process.cwd(), 'public', 'social', 'posts.json')
const outPath = path.join(process.cwd(), 'public', 'social', 'posts.csv')

const posts = JSON.parse(fs.readFileSync(inPath, 'utf-8'))

const escape = (s: string) => `"${s.replace(/"/g, '""')}"`

const header = 'Date,Time,Content'
const rows = posts.map((p: { date: string; time: string; content: string }) =>
  `${p.date},${p.time},${escape(p.content)}`
)

fs.writeFileSync(outPath, [header, ...rows].join('\n'))
console.log(`Exported ${posts.length} posts → ${outPath}`)
