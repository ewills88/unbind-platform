import { NextRequest, NextResponse } from 'next/server'
import { PotentialConflict } from '@/types/intake-workflow'
import { IntakeData } from '@/types/intake'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// Calculate string similarity (Levenshtein-based)
function similarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 1

  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1

  if (longer.length === 0) return 1

  // Simple character-based similarity
  let matches = 0
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++
  }

  return matches / longer.length
}

// POST /api/intakes/[id]/conflict-check - Run conflict check
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: intakeId } = await params

    // Get intake data
    const { data: intake, error: intakeError } = await supabase
      .from('client_intakes')
      .select('*')
      .eq('id', intakeId)
      .single()

    if (intakeError || !intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    const intakeData = intake.intake_data as IntakeData
    const personal = intakeData.personal

    if (!personal) {
      return NextResponse.json({ error: 'No personal data in intake' }, { status: 400 })
    }

    const potentialConflicts: PotentialConflict[] = []

    // Get all existing cases to check against
    const { data: existingCases } = await supabase
      .from('cases')
      .select(`
        id,
        case_number,
        client_name,
        spouse_name,
        client_id,
        profiles!cases_client_id_fkey (
          email,
          phone
        )
      `)

    // Check each case for potential conflicts
    for (const existingCase of existingCases || []) {
      const caseId = existingCase.id
      const caseNumber = existingCase.case_number || 'Unknown'

      // Check client name match
      const clientName = `${personal.firstName} ${personal.lastName}`.toLowerCase()
      if (existingCase.client_name) {
        const caseName = existingCase.client_name.toLowerCase()
        const nameSimilarity = similarity(clientName, caseName)
        if (nameSimilarity > 0.8) {
          potentialConflicts.push({
            type: 'name_match',
            field: 'client_name',
            matched_value: existingCase.client_name,
            matched_case_id: caseId,
            matched_case_number: caseNumber,
            matched_party: 'client',
            similarity_score: nameSimilarity,
            description: `Client name "${personal.firstName} ${personal.lastName}" matches existing client in Case #${caseNumber}`,
          })
        }
      }

      // Check spouse name against client
      const spouseName = `${personal.spouseFirstName} ${personal.spouseLastName}`.toLowerCase()
      if (existingCase.client_name) {
        const caseName = existingCase.client_name.toLowerCase()
        const nameSimilarity = similarity(spouseName, caseName)
        if (nameSimilarity > 0.8) {
          potentialConflicts.push({
            type: 'name_match',
            field: 'spouse_name',
            matched_value: existingCase.client_name,
            matched_case_id: caseId,
            matched_case_number: caseNumber,
            matched_party: 'opposing',
            similarity_score: nameSimilarity,
            description: `Spouse name "${personal.spouseFirstName} ${personal.spouseLastName}" is a client in Case #${caseNumber} - potential conflict of interest`,
          })
        }
      }

      // Check spouse name against existing spouse
      if (existingCase.spouse_name) {
        const existingSpouse = existingCase.spouse_name.toLowerCase()

        // Client name matches existing spouse
        const clientSpouseSimilarity = similarity(clientName, existingSpouse)
        if (clientSpouseSimilarity > 0.8) {
          potentialConflicts.push({
            type: 'name_match',
            field: 'client_name',
            matched_value: existingCase.spouse_name,
            matched_case_id: caseId,
            matched_case_number: caseNumber,
            matched_party: 'opposing',
            similarity_score: clientSpouseSimilarity,
            description: `Client "${personal.firstName} ${personal.lastName}" is the opposing party in Case #${caseNumber}`,
          })
        }

        // Spouse matches existing spouse
        const spouseSpouseSimilarity = similarity(spouseName, existingSpouse)
        if (spouseSpouseSimilarity > 0.8) {
          potentialConflicts.push({
            type: 'name_match',
            field: 'spouse_name',
            matched_value: existingCase.spouse_name,
            matched_case_id: caseId,
            matched_case_number: caseNumber,
            matched_party: 'spouse',
            similarity_score: spouseSpouseSimilarity,
            description: `Spouse name matches opposing party in Case #${caseNumber}`,
          })
        }
      }

      // Check email
      const profile = existingCase.profiles as { email?: string; phone?: string } | null
      if (personal.email && profile?.email) {
        if (personal.email.toLowerCase() === profile.email.toLowerCase()) {
          potentialConflicts.push({
            type: 'email_match',
            field: 'email',
            matched_value: profile.email,
            matched_case_id: caseId,
            matched_case_number: caseNumber,
            matched_party: 'client',
            similarity_score: 1,
            description: `Email "${personal.email}" already associated with Case #${caseNumber}`,
          })
        }
      }

      // Check phone
      if (personal.phone && profile?.phone) {
        const normalizedIntakePhone = personal.phone.replace(/\D/g, '')
        const normalizedCasePhone = profile.phone.replace(/\D/g, '')
        if (normalizedIntakePhone === normalizedCasePhone) {
          potentialConflicts.push({
            type: 'phone_match',
            field: 'phone',
            matched_value: profile.phone,
            matched_case_id: caseId,
            matched_case_number: caseNumber,
            matched_party: 'client',
            similarity_score: 1,
            description: `Phone number matches client in Case #${caseNumber}`,
          })
        }
      }
    }

    // Store conflict check results
    const { data: conflictCheck, error: insertError } = await supabase
      .from('conflict_checks')
      .insert({
        intake_id: intakeId,
        checked_by: user.id,
        potential_conflicts: potentialConflicts,
        has_conflicts: potentialConflicts.length > 0,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error storing conflict check:', insertError)
      return NextResponse.json({ error: 'Failed to store conflict check' }, { status: 500 })
    }

    return NextResponse.json({
      conflict_check: conflictCheck,
      has_conflicts: potentialConflicts.length > 0,
      conflicts: potentialConflicts,
    })
  } catch (error) {
    console.error('Conflict check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/intakes/[id]/conflict-check - Clear conflicts
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: intakeId } = await params
    const { waiver_notes } = await request.json()

    // Update latest conflict check
    const { data: conflictCheck, error } = await supabase
      .from('conflict_checks')
      .update({
        conflict_cleared: true,
        conflict_waiver_notes: waiver_notes,
        cleared_at: new Date().toISOString(),
        cleared_by: user.id,
      })
      .eq('intake_id', intakeId)
      .order('checked_at', { ascending: false })
      .limit(1)
      .select()
      .single()

    if (error) {
      console.error('Error clearing conflict:', error)
      return NextResponse.json({ error: 'Failed to clear conflict' }, { status: 500 })
    }

    return NextResponse.json({ conflict_check: conflictCheck })
  } catch (error) {
    console.error('Conflict clear error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
