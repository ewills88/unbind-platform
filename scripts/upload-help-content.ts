/**
 * Upload help center markdown files to OpenAI vector store.
 *
 * Usage:
 *   npx tsx scripts/upload-help-content.ts
 *
 * Requires OPENAI_API_KEY in .env.local or environment.
 * Outputs the vector store ID to set as OPENAI_VECTOR_STORE_ID.
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import fs from 'fs'
import path from 'path'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is required. Set it in .env.local or environment.')
  process.exit(1)
}

const HELP_CONTENT_DIR = path.join(process.cwd(), 'help-content')
const VECTOR_STORE_NAME = 'unbind-help-center'

async function openaiRequest(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.openai.com/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v2',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${body}`)
  }
  return res.json()
}

async function main() {
  console.log('=== Unbind Help Center — Vector Store Upload ===\n')

  // 1. Read all markdown files
  const files = fs.readdirSync(HELP_CONTENT_DIR).filter(f => f.endsWith('.md'))
  if (files.length === 0) {
    console.error('No .md files found in help-content/')
    process.exit(1)
  }
  console.log(`Found ${files.length} files:`, files.join(', '))

  // 2. Upload each file to OpenAI Files API
  const fileIds: string[] = []
  for (const filename of files) {
    const filepath = path.join(HELP_CONTENT_DIR, filename)
    const content = fs.readFileSync(filepath)

    const formData = new FormData()
    formData.append('purpose', 'assistants')
    formData.append('file', new Blob([content], { type: 'text/markdown' }), filename)

    console.log(`  Uploading ${filename}...`)
    const fileResult = await openaiRequest('/files', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    })
    fileIds.push(fileResult.id)
    console.log(`    → ${fileResult.id}`)
  }

  // 3. Check for existing vector store
  console.log(`\nLooking for existing vector store "${VECTOR_STORE_NAME}"...`)
  const stores = await openaiRequest('/vector_stores?limit=100')
  const existing = stores.data?.find((s: { name: string }) => s.name === VECTOR_STORE_NAME)

  let vectorStoreId: string

  if (existing) {
    vectorStoreId = existing.id
    console.log(`  Found existing store: ${vectorStoreId}`)

    // Add new files to existing store
    for (const fileId of fileIds) {
      await openaiRequest(`/vector_stores/${vectorStoreId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
      })
    }
    console.log(`  Added ${fileIds.length} files to existing store`)
  } else {
    // Create new vector store with files
    console.log('  Creating new vector store...')
    const store = await openaiRequest('/vector_stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: VECTOR_STORE_NAME,
        file_ids: fileIds,
      }),
    })
    vectorStoreId = store.id
    console.log(`  Created store: ${vectorStoreId}`)
  }

  // 4. Wait for processing
  console.log('\nWaiting for file processing...')
  let ready = false
  for (let i = 0; i < 30; i++) {
    const status = await openaiRequest(`/vector_stores/${vectorStoreId}`)
    if (status.file_counts?.completed === fileIds.length || status.status === 'completed') {
      ready = true
      break
    }
    console.log(`  Processing... (${status.file_counts?.completed || 0}/${fileIds.length} complete)`)
    await new Promise(r => setTimeout(r, 2000))
  }

  if (!ready) {
    console.log('  Files still processing — they should be ready shortly.')
  }

  // 5. Output result
  console.log('\n=== DONE ===')
  console.log(`\nVector Store ID: ${vectorStoreId}`)
  console.log(`\nAdd this to your .env.local:`)
  console.log(`  OPENAI_VECTOR_STORE_ID=${vectorStoreId}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
