import { getStateData } from './stateData'
import { ResidencyResult } from '@/types/stateLaw'

interface ResidencyInput {
  stateCode: string
  stateMoveInDate: string | null
  countyMoveInDate: string | null
  filingDate?: string // defaults to today
}

export function verifyResidency(input: ResidencyInput): ResidencyResult {
  const stateData = getStateData(input.stateCode)
  if (!stateData) {
    return {
      meets_state_requirement: false,
      meets_county_requirement: false,
      can_file_on: null,
      state_residency_days: 0,
      county_residency_days: 0,
      state_required_days: 0,
      county_required_days: 0,
      missing_documents: [],
      recommendations: [`State "${input.stateCode}" is not yet supported. Currently supported: CA, TX, FL.`],
    }
  }

  const today = input.filingDate ? new Date(input.filingDate) : new Date()
  const rules = stateData.residency

  // Calculate days
  const stateRequiredDays = Math.ceil(rules.state_months * 30.44)
  const countyRequiredDays = Math.ceil(rules.county_months * 30.44)

  const stateResidencyDays = input.stateMoveInDate
    ? Math.floor((today.getTime() - new Date(input.stateMoveInDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const countyResidencyDays = input.countyMoveInDate
    ? Math.floor((today.getTime() - new Date(input.countyMoveInDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const meetsState = stateResidencyDays >= stateRequiredDays
  const meetsCounty = countyRequiredDays === 0 || countyResidencyDays >= countyRequiredDays

  // Calculate earliest filing date
  let canFileOn: string | null = null
  if (!meetsState || !meetsCounty) {
    const dates: Date[] = []

    if (!meetsState && input.stateMoveInDate) {
      const d = new Date(input.stateMoveInDate)
      d.setMonth(d.getMonth() + rules.state_months)
      dates.push(d)
    }

    if (!meetsCounty && input.countyMoveInDate && rules.county_months > 0) {
      const d = new Date(input.countyMoveInDate)
      d.setMonth(d.getMonth() + rules.county_months)
      dates.push(d)
    }

    if (dates.length > 0) {
      const latest = dates.reduce((a, b) => (a > b ? a : b))
      canFileOn = latest.toISOString().split('T')[0]
    }
  }

  // Recommendations
  const recommendations: string[] = []

  if (!input.stateMoveInDate) {
    recommendations.push('State move-in date is not set. Please update the client\'s address history to verify residency.')
  } else if (!meetsState) {
    const remaining = stateRequiredDays - stateResidencyDays
    recommendations.push(
      `Client needs ${remaining} more day${remaining !== 1 ? 's' : ''} of state residency in ${stateData.name}. ` +
      `Eligible on ${canFileOn ? new Date(canFileOn).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'unknown'}.`
    )
  }

  if (rules.county_months > 0) {
    if (!input.countyMoveInDate) {
      recommendations.push('County move-in date is not set. Please update the client\'s address history.')
    } else if (!meetsCounty) {
      const remaining = countyRequiredDays - countyResidencyDays
      recommendations.push(
        `Client needs ${remaining} more day${remaining !== 1 ? 's' : ''} of county residency. ` +
        `Eligible on ${canFileOn ? new Date(canFileOn).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'unknown'}.`
      )
    }
  }

  if (meetsState && meetsCounty) {
    recommendations.push(`Client meets all residency requirements for ${stateData.name} and can file immediately.`)
  }

  if (rules.military_exception) {
    recommendations.push(`Military exception: Active duty service members stationed in ${stateData.name} may file regardless of domicile state.`)
  }

  return {
    meets_state_requirement: meetsState,
    meets_county_requirement: meetsCounty,
    can_file_on: canFileOn,
    state_residency_days: stateResidencyDays,
    county_residency_days: countyResidencyDays,
    state_required_days: stateRequiredDays,
    county_required_days: countyRequiredDays,
    missing_documents: stateData.residency.proof_documents,
    recommendations,
  }
}
