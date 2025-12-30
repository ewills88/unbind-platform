import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = 'https://rpbjravqgflidnwjkgvc.supabase.co'
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYmpyYXZxZ2ZsaWRud2prZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDM2MzEsImV4cCI6MjA4MjYxOTYzMX0.kNKpXSGNVAQDReTFA0qcLMS9eKOzFaA8UPkGTYqG75Y'

  const supabase = createClient(supabaseUrl, supabaseKey)
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
  
  if (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    })
  }
  
  return NextResponse.json({ 
    success: true, 
    message: 'Connected to Supabase!',
    profileCount: data?.length || 0
  })
}
