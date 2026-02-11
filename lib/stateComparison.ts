import { getStateData } from '@/lib/stateData'
import { STATE_NAMES } from '@/types/stateLaw'

export interface StateComparisonRow {
  category: string
  label: string
  values: Record<string, string>
}

/**
 * Compares two or more states across key divorce law dimensions.
 */
export function compareStates(stateCodes: string[]): StateComparisonRow[] {
  const rows: StateComparisonRow[] = []

  const states = stateCodes
    .map((code) => ({ code, data: getStateData(code) }))
    .filter((s) => s.data)

  if (states.length < 2) return rows

  // Residency
  const residencyState: Record<string, string> = {}
  const residencyCounty: Record<string, string> = {}
  const waitingPeriod: Record<string, string> = {}
  const waitingStarts: Record<string, string> = {}
  const propertySys: Record<string, string> = {}
  const defaultSplit: Record<string, string> = {}
  const noFault: Record<string, string> = {}
  const custodyStd: Record<string, string> = {}
  const jointPref: Record<string, string> = {}
  const childSupportType: Record<string, string> = {}
  const spousalFormula: Record<string, string> = {}
  const longTermMarriage: Record<string, string> = {}

  for (const { code, data } of states) {
    if (!data) continue
    residencyState[code] = `${data.residency.state_months} months`
    residencyCounty[code] = data.residency.county_months > 0 ? `${data.residency.county_months} months` : 'None'
    waitingPeriod[code] = `${data.waiting_period.duration_days} days`
    waitingStarts[code] = data.waiting_period.start_event.replace(/_/g, ' ')
    propertySys[code] = data.property_division.system.replace(/_/g, ' ')
    defaultSplit[code] = data.property_division.default_split
    noFault[code] = data.grounds.no_fault ? 'Yes' : 'No'
    custodyStd[code] = data.child_custody.standard.replace(/_/g, ' ')
    jointPref[code] = data.child_custody.joint_custody_preference ? 'Yes' : 'No'
    childSupportType[code] = data.child_support.guideline_type.replace(/_/g, ' ')
    spousalFormula[code] = data.spousal_support.temporary_support_formula ? 'Yes' : 'No'
    longTermMarriage[code] = `${data.spousal_support.long_term_marriage_years}+ years`
  }

  rows.push(
    { category: 'Residency', label: 'State Residency', values: residencyState },
    { category: 'Residency', label: 'County Residency', values: residencyCounty },
    { category: 'Timing', label: 'Waiting Period', values: waitingPeriod },
    { category: 'Timing', label: 'Waiting Starts', values: waitingStarts },
    { category: 'Property', label: 'Division System', values: propertySys },
    { category: 'Property', label: 'Default Split', values: defaultSplit },
    { category: 'Grounds', label: 'No-Fault Available', values: noFault },
    { category: 'Custody', label: 'Standard', values: custodyStd },
    { category: 'Custody', label: 'Joint Custody Preference', values: jointPref },
    { category: 'Child Support', label: 'Guideline Type', values: childSupportType },
    { category: 'Spousal Support', label: 'Temporary Formula', values: spousalFormula },
    { category: 'Spousal Support', label: 'Long-Term Marriage', values: longTermMarriage },
  )

  return rows
}

/**
 * Returns the list of states available for comparison.
 */
export function getComparableStates(): { code: string; name: string }[] {
  return ['CA', 'TX', 'FL']
    .filter((code) => getStateData(code))
    .map((code) => ({ code, name: STATE_NAMES[code] || code }))
}
