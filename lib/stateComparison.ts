import { getStateData, getSupportedStates } from '@/lib/stateData'
import { getStateRules } from '@/lib/data/stateRules'

export interface StateComparisonRow {
  category: string
  label: string
  values: Record<string, string>
}

/**
 * Compares two or more states across key divorce law dimensions.
 * Uses detailed StateLawData when available, falls back to StateRules.
 */
export function compareStates(stateCodes: string[]): StateComparisonRow[] {
  const rows: StateComparisonRow[] = []

  const states = stateCodes
    .map((code) => ({ code, data: getStateData(code), rules: getStateRules(code) }))
    .filter((s) => s.data || s.rules)

  if (states.length < 2) return rows

  const residencyState: Record<string, string> = {}
  const residencyCounty: Record<string, string> = {}
  const waitingPeriod: Record<string, string> = {}
  const waitingStarts: Record<string, string> = {}
  const propertySys: Record<string, string> = {}
  const defaultSplit: Record<string, string> = {}
  const noFault: Record<string, string> = {}
  const noFaultGrounds: Record<string, string> = {}
  const separationReq: Record<string, string> = {}
  const custodyStd: Record<string, string> = {}
  const jointPref: Record<string, string> = {}
  const childSupportType: Record<string, string> = {}
  const spousalFormula: Record<string, string> = {}
  const longTermMarriage: Record<string, string> = {}
  const filingFees: Record<string, string> = {}
  const eFiling: Record<string, string> = {}

  for (const { code, data, rules } of states) {
    if (data) {
      residencyState[code] = data.residency.state_months > 0 ? `${data.residency.state_months} months` : 'No minimum'
      residencyCounty[code] = data.residency.county_months > 0 ? `${data.residency.county_months} months` : 'None'
      waitingPeriod[code] = `${data.waiting_period.duration_days} days`
      waitingStarts[code] = data.waiting_period.start_event.replace(/_/g, ' ')
      propertySys[code] = data.property_division.system.replace(/_/g, ' ')
      defaultSplit[code] = data.property_division.default_split
      noFault[code] = data.grounds.no_fault ? 'Yes' : 'No'
      noFaultGrounds[code] = data.grounds.grounds_options[0] || '—'
      separationReq[code] = rules?.separationRequired ? (rules.separationPeriod ? `Yes (${rules.separationPeriod} days)` : 'Yes') : 'No'
      custodyStd[code] = data.child_custody.standard.replace(/_/g, ' ')
      jointPref[code] = data.child_custody.joint_custody_preference ? 'Yes' : 'No'
      childSupportType[code] = data.child_support.guideline_type.replace(/_/g, ' ')
      spousalFormula[code] = data.spousal_support.temporary_support_formula ? 'Yes' : 'No'
      longTermMarriage[code] = `${data.spousal_support.long_term_marriage_years}+ years`
    } else if (rules) {
      residencyState[code] = rules.stateResidency
      residencyCounty[code] = rules.countyResidency
      waitingPeriod[code] = `${rules.waitingPeriod} days`
      waitingStarts[code] = rules.waitingPeriodStart
      propertySys[code] = rules.propertyDivision === 'community' ? 'community property' : 'equitable distribution'
      defaultSplit[code] = rules.defaultSplit
      noFault[code] = rules.noFaultAvailable ? 'Yes' : 'No'
      noFaultGrounds[code] = rules.noFaultGrounds
      separationReq[code] = rules.separationRequired ? (rules.separationPeriod ? `Yes (${rules.separationPeriod} days)` : 'Yes') : 'No'
      custodyStd[code] = rules.custodyStandard
      jointPref[code] = rules.jointCustodyPreference ? 'Yes' : 'No'
      childSupportType[code] = rules.childSupportGuideline
      spousalFormula[code] = '—'
      longTermMarriage[code] = '—'
    }

    if (rules) {
      filingFees[code] = rules.filingFeeRange
      eFiling[code] = rules.eFilingAvailable ? (rules.eFilingSystem || 'Yes') : 'No'
    }
  }

  rows.push(
    { category: 'Residency', label: 'State Residency', values: residencyState },
    { category: 'Residency', label: 'County Residency', values: residencyCounty },
    { category: 'Timing', label: 'Waiting Period', values: waitingPeriod },
    { category: 'Timing', label: 'Waiting Starts', values: waitingStarts },
    { category: 'Timing', label: 'Separation Required', values: separationReq },
    { category: 'Property', label: 'Division System', values: propertySys },
    { category: 'Property', label: 'Default Split', values: defaultSplit },
    { category: 'Grounds', label: 'No-Fault Available', values: noFault },
    { category: 'Grounds', label: 'No-Fault Grounds', values: noFaultGrounds },
    { category: 'Custody', label: 'Standard', values: custodyStd },
    { category: 'Custody', label: 'Joint Custody Preference', values: jointPref },
    { category: 'Child Support', label: 'Guideline Type', values: childSupportType },
    { category: 'Spousal Support', label: 'Temporary Formula', values: spousalFormula },
    { category: 'Spousal Support', label: 'Long-Term Marriage', values: longTermMarriage },
    { category: 'Filing', label: 'Filing Fees', values: filingFees },
    { category: 'Filing', label: 'E-Filing', values: eFiling },
  )

  return rows
}

/**
 * Returns all 50 states available for comparison.
 */
export function getComparableStates(): { code: string; name: string }[] {
  return getSupportedStates()
}
