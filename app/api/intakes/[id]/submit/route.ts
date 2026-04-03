import { NextRequest, NextResponse } from 'next/server'
import { SubmitIntakeRequest, IntakeData, TOTAL_INTAKE_STEPS } from '@/types/intake'
import { getAuthenticatedClient } from '@/lib/supabase/server'

// Validate required fields for submission
function validateIntakeData(data: IntakeData): { isValid: boolean; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {}

  // Personal Information validation
  if (!data.personal?.firstName) {
    errors.personal = errors.personal || []
    errors.personal.push('First name is required')
  }
  if (!data.personal?.lastName) {
    errors.personal = errors.personal || []
    errors.personal.push('Last name is required')
  }
  if (!data.personal?.email) {
    errors.personal = errors.personal || []
    errors.personal.push('Email is required')
  }
  if (!data.personal?.phone) {
    errors.personal = errors.personal || []
    errors.personal.push('Phone is required')
  }
  if (!data.personal?.spouseFirstName) {
    errors.personal = errors.personal || []
    errors.personal.push('Spouse first name is required')
  }
  if (!data.personal?.spouseLastName) {
    errors.personal = errors.personal || []
    errors.personal.push('Spouse last name is required')
  }

  // Marriage Details validation
  if (!data.marriage?.dateOfMarriage) {
    errors.marriage = errors.marriage || []
    errors.marriage.push('Date of marriage is required')
  }

  // Children validation (if applicable)
  if (data.children?.hasMinorChildren && (!data.children.children || data.children.children.length === 0)) {
    errors.children = errors.children || []
    errors.children.push('Please add details for minor children')
  }

  // Financial Overview validation
  if (!data.financial?.clientEmploymentStatus) {
    errors.financial = errors.financial || []
    errors.financial.push('Employment status is required')
  }

  // Legal Goals validation
  if (!data.legalGoals?.primaryGoals || data.legalGoals.primaryGoals.length === 0) {
    errors.legalGoals = errors.legalGoals || []
    errors.legalGoals.push('Please select at least one primary goal')
  }
  if (!data.legalGoals?.preferredApproach) {
    errors.legalGoals = errors.legalGoals || []
    errors.legalGoals.push('Please select your preferred divorce approach')
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// POST /api/intakes/[id]/submit - Submit completed intake
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client: supabase, user } = await getAuthenticatedClient(request)

    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body: SubmitIntakeRequest = await request.json()

    // Verify intake exists and user has access
    const { data: existingIntake, error: fetchError } = await supabase
      .from('client_intakes')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingIntake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    if (existingIntake.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only allow submission of draft/in_progress intakes
    if (!['draft', 'in_progress'].includes(existingIntake.status)) {
      return NextResponse.json({
        error: 'Intake has already been submitted'
      }, { status: 400 })
    }

    // Merge final data with existing
    const finalData: IntakeData = {
      ...existingIntake.intake_data,
      ...body.intake_data
    }

    // Validate the complete intake
    const validation = validateIntakeData(finalData)

    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Validation failed',
        validation_errors: validation.errors
      }, { status: 400 })
    }

    // Update intake as submitted
    const { data: intake, error } = await supabase
      .from('client_intakes')
      .update({
        intake_data: finalData,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        completed_steps: [1, 2, 3, 4, 5],
        progress_percentage: 100,
        validation_errors: {},
        last_saved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error submitting intake:', error)
      return NextResponse.json({ error: 'Failed to submit intake' }, { status: 500 })
    }

    // TODO: Send notification to attorney if invited_by is set
    // TODO: Create notification for case dashboard

    return NextResponse.json({
      intake,
      message: 'Intake submitted successfully',
      totalSteps: TOTAL_INTAKE_STEPS
    })
  } catch (error) {
    console.error('Intake submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
