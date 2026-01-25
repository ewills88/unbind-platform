// Password Reset Script
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rpbjravqgflidnwjkgvc.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYmpyYXZxZ2ZsaWRud2prZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDM2MzEsImV4cCI6MjA4MjYxOTYzMX0.kNKpXSGNVAQDReTFA0qcLMS9eKOzFaA8UPkGTYqG75Y'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const email = process.argv[2]

if (!email) {
  console.log('Usage: node scripts/reset-password.mjs <email>')
  process.exit(1)
}

console.log(`Sending password reset email to: ${email}`)

const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'http://localhost:3001/reset-password',
})

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

console.log('✅ Password reset email sent!')
console.log('Check your inbox and click the link to reset your password.')
