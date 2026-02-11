import { getStateData } from './stateData'
import { CaseFacts, StateFormSeed, FormRequirement } from '@/types/stateLaw'

export function selectRequiredForms(
  stateCode: string,
  caseFacts: CaseFacts
): StateFormSeed[] {
  const stateData = getStateData(stateCode)
  if (!stateData) return []

  return stateData.forms
    .filter((form) => evaluateRequirement(form.required_when, caseFacts))
    .sort((a, b) => a.order_in_process - b.order_in_process)
}

export function calculateTotalFees(forms: StateFormSeed[]): number {
  return forms.reduce((sum, form) => sum + (form.court_fee || 0), 0)
}

function evaluateRequirement(
  requirement: FormRequirement,
  facts: CaseFacts
): boolean {
  // Always required
  if (requirement.always === true) {
    return true
  }

  // OR condition
  if (requirement.or && Array.isArray(requirement.or)) {
    return requirement.or.some((cond) => evaluateRequirement(cond, facts))
  }

  // AND condition
  if (requirement.and && Array.isArray(requirement.and)) {
    return requirement.and.every((cond) => evaluateRequirement(cond, facts))
  }

  // Simple field matching
  const checks: boolean[] = []

  if (requirement.has_children !== undefined) {
    checks.push(facts.has_children === requirement.has_children)
  }
  if (requirement.has_property !== undefined) {
    checks.push(facts.has_property === requirement.has_property)
  }
  if (requirement.case_type !== undefined) {
    checks.push(facts.case_type === requirement.case_type)
  }
  if (requirement.spousal_support_requested !== undefined) {
    checks.push(facts.spousal_support_requested === requirement.spousal_support_requested)
  }
  if (requirement.military_member !== undefined) {
    checks.push(facts.military_member === requirement.military_member)
  }

  // If no checks matched any fields, treat as not required
  if (checks.length === 0) return false

  // All simple checks must pass (implicit AND)
  return checks.every((c) => c)
}
