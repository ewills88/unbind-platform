// Session 25: Onboarding Service
// Manages onboarding progress, checklists, and feature tours

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================================
// Onboarding Progress
// ============================================================

export async function getOnboardingProgress(userId: string) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code === 'PGRST116') {
    // No record found, create one
    const { data: newProgress, error: insertError } = await supabase
      .from('onboarding_progress')
      .insert({
        user_id: userId,
        current_step: 0,
        completed_steps: [],
        is_completed: false,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) throw insertError
    return newProgress
  }

  if (error) throw error
  return data
}

export async function completeStep(userId: string, stepKey: string) {
  const supabase = getServiceClient()
  const progress = await getOnboardingProgress(userId)

  const completedSteps = progress.completed_steps || []
  if (completedSteps.includes(stepKey)) {
    return progress
  }

  const updatedSteps = [...completedSteps, stepKey]
  const newStep = Math.max(progress.current_step, updatedSteps.length)

  const { data, error } = await supabase
    .from('onboarding_progress')
    .update({
      completed_steps: updatedSteps,
      current_step: newStep,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getChecklist(role: string) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('onboarding_checklists')
    .select('*')
    .eq('role', role)
    .order('step_number', { ascending: true })

  if (error) throw error
  return data || []
}

export async function isOnboardingComplete(userId: string) {
  const progress = await getOnboardingProgress(userId)
  return progress.is_completed === true
}

export async function resetOnboarding(userId: string) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('onboarding_progress')
    .update({
      current_step: 0,
      completed_steps: [],
      is_completed: false,
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// Feature Tours
// ============================================================

export async function getFeatureTour(featureKey: string) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('feature_tours')
    .select('*')
    .eq('feature_key', featureKey)
    .eq('is_active', true)
    .single()

  if (error) throw error
  return data
}

export async function completeTour(userId: string, tourId: string) {
  const supabase = getServiceClient()

  const { data: existing } = await supabase
    .from('user_tour_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('tour_id', tourId)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('user_tour_progress')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('user_tour_progress')
    .insert({
      user_id: userId,
      tour_id: tourId,
      is_completed: true,
      current_step: 0,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserTourProgress(userId: string) {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('user_tour_progress')
    .select('*, tour:tour_id(id, feature_key, title)')
    .eq('user_id', userId)

  if (error) throw error
  return data || []
}
