/**
 * Codemod: sweep dark-mode Tailwind utilities across dashboard pages.
 *
 * Usage:
 *   npx tsx scripts/apply-dark-classes.ts           # apply
 *   npx tsx scripts/apply-dark-classes.ts --dry-run # preview
 *
 * Only touches files under app/dashboard/ and a short allowlist of
 * shared components. For each light-mode Tailwind class, adds the
 * corresponding `dark:` class if it isn't already present.
 *
 * Idempotent: safe to run multiple times.
 */

import * as fs from 'fs'
import * as path from 'path'

const ROOT = process.cwd()
const DRY_RUN = process.argv.includes('--dry-run')

// Map: [light class, dark class to add]
// Keys are literal Tailwind class tokens (matched on word boundaries inside
// className strings). A token is replaced with "<token> <dark>" unless the
// dark class is already somewhere in the same className string.
const PAIRS: Array<[string, string]> = [
  // Backgrounds
  ['bg-gray-50',   'dark:bg-[#0d1526]'],
  ['bg-white',     'dark:bg-[#111827]'],
  ['bg-gray-100',  'dark:bg-[#1f2937]'],

  // Borders
  ['border-gray-200', 'dark:border-[#1f2937]'],
  ['border-gray-100', 'dark:border-[#1f2937]'],
  ['border-gray-300', 'dark:border-[#374151]'],

  // Divide
  ['divide-gray-200', 'dark:divide-[#1f2937]'],
  ['divide-gray-100', 'dark:divide-[#1f2937]'],

  // Text
  ['text-gray-900', 'dark:text-white'],
  ['text-gray-800', 'dark:text-gray-100'],
  ['text-gray-700', 'dark:text-gray-200'],
  ['text-gray-600', 'dark:text-gray-300'],
  ['text-gray-500', 'dark:text-gray-400'],
  ['text-gray-400', 'dark:text-gray-500'],

  // Hover states
  ['hover:bg-gray-50',  'dark:hover:bg-[#1f2937]'],
  ['hover:bg-gray-100', 'dark:hover:bg-[#1f2937]'],
  ['hover:bg-gray-200', 'dark:hover:bg-[#374151]'],
]

// Directories + files to sweep (relative to repo root)
const TARGETS: string[] = []

function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      walk(full)
    } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
      TARGETS.push(full)
    }
  }
}

walk(path.join(ROOT, 'app', 'dashboard'))
// Shared layout pieces that dashboard pages import
const SHARED = [
  'components/ui/card.tsx',
  'components/ui/tabs.tsx',
  'components/ui/dialog.tsx',
  'components/ui/button.tsx',
  'components/ui/input.tsx',
  'components/ui/label.tsx',
  'components/ui/badge.tsx',
  'components/ui/select.tsx',
  'components/ui/dropdown-menu.tsx',
  'components/ui/table.tsx',
  'components/ui/sheet.tsx',
  'components/ui/switch.tsx',
  'components/ui/textarea.tsx',
  'components/ui/alert.tsx',
  'components/cases/CaseCard.tsx',
  'components/cases/NewCaseModal.tsx',
  'components/documents/DocumentsList.tsx',
  'components/messages/MessageThread.tsx',
  'components/dashboard/StatsCard.tsx',
  'components/dashboard/OnboardingChecklist.tsx',
  'components/assistant/AssistantBubble.tsx',
  'components/navigation/MobileBottomNav.tsx',
]
for (const rel of SHARED) {
  const p = path.join(ROOT, rel)
  if (fs.existsSync(p)) TARGETS.push(p)
}

// Match className="..." and className={`...`} and className={clsx(...)}.
// To stay conservative, we only rewrite within className string literals,
// not template literals with interpolations. Template strings w/o ${} are ok.
const CLASSNAME_REGEX = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`$]*)`\})/g

function addDarkVariants(classes: string): string {
  let out = classes
  for (const [light, dark] of PAIRS) {
    // Already has this dark class? Skip.
    if (new RegExp(`(?:^|\\s)${escapeRe(dark)}(?:\\s|$)`).test(out)) continue
    // Replace every occurrence of the light token (on word boundaries) with
    // "<light> <dark>" — but only the first occurrence per line gets the dark
    // companion to avoid repetitive insertions when the token appears twice.
    const lightRe = new RegExp(`(^|\\s)(${escapeRe(light)})(?=\\s|$)`)
    if (lightRe.test(out)) {
      out = out.replace(lightRe, `$1$2 ${dark}`)
    }
  }
  return out
}

function escapeRe(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}

let totalFilesChanged = 0
let totalInsertions = 0

for (const file of TARGETS) {
  const original = fs.readFileSync(file, 'utf8')
  let changed = false
  let insertionsInFile = 0

  const updated = original.replace(CLASSNAME_REGEX, (match, dq, sq, bt) => {
    const body = dq ?? sq ?? bt ?? ''
    const rewritten = addDarkVariants(body)
    if (rewritten === body) return match
    changed = true
    // Count how many dark: tokens we added
    insertionsInFile += (rewritten.match(/dark:/g) || []).length - (body.match(/dark:/g) || []).length
    if (dq != null) return `className="${rewritten}"`
    if (sq != null) return `className='${rewritten}'`
    return 'className={`' + rewritten + '`}'
  })

  if (changed) {
    totalFilesChanged++
    totalInsertions += insertionsInFile
    const rel = path.relative(ROOT, file)
    console.log(`  ${rel}  (+${insertionsInFile} dark tokens)`)
    if (!DRY_RUN) fs.writeFileSync(file, updated)
  }
}

console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}Files changed: ${totalFilesChanged}`)
console.log(`${DRY_RUN ? '[dry-run] ' : ''}Dark tokens added: ${totalInsertions}`)
