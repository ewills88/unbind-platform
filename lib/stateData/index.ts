import { californiaData } from './california'
import { texasData } from './texas'
import { floridaData } from './florida'
import { StateLawData } from '@/types/stateLaw'
import { ALL_STATE_RULES, type StateRules } from '@/lib/data/stateRules'

// Detailed state data (manually curated with forms and counties)
const DETAILED_STATE_DATA: Record<string, StateLawData> = {
  CA: californiaData,
  TX: texasData,
  FL: floridaData,
}

/**
 * Generate a StateLawData entry from the simpler StateRules data.
 * Used for states that don't have full detailed data files yet.
 */
function rulestoStateLawData(rules: StateRules): StateLawData {
  // Parse residency months from string like "6 months", "90 days", "1 year"
  const parseMonths = (s: string): number => {
    const yearMatch = s.match(/(\d+)\s*year/i)
    if (yearMatch) return parseInt(yearMatch[1]) * 12
    const monthMatch = s.match(/(\d+)\s*month/i)
    if (monthMatch) return parseInt(monthMatch[1])
    const dayMatch = s.match(/(\d+)\s*day/i)
    if (dayMatch) return Math.round(parseInt(dayMatch[1]) / 30)
    const weekMatch = s.match(/(\d+)\s*week/i)
    if (weekMatch) return Math.round(parseInt(weekMatch[1]) * 7 / 30)
    return 0
  }

  const stateMonths = parseMonths(rules.stateResidency)
  const countyMonths = parseMonths(rules.countyResidency)

  return {
    code: rules.code,
    name: rules.name,
    residency: {
      state_months: stateMonths,
      county_months: countyMonths,
      statute: '',
      proof_documents: [],
      alternative_proof: [],
      minimum_proof: '',
      military_exception: false,
      student_exception: '',
    },
    waiting_period: {
      duration_days: rules.waitingPeriod,
      start_event: rules.waitingPeriodStart,
      earliest_judgment: `${rules.waitingPeriod} days from ${rules.waitingPeriodStart}`,
      statute: '',
      exceptions: [],
      can_waive: false,
    },
    property_division: {
      system: rules.propertyDivision === 'community' ? 'community_property' : 'equitable_distribution',
      default_split: rules.defaultSplit,
      statute: '',
      community_property_definition: rules.propertyDivision === 'community'
        ? 'Property acquired during marriage is presumed community property'
        : 'N/A — equitable distribution state',
      separate_property_definition: 'Property owned before marriage, acquired by gift or inheritance during marriage',
      date_of_separation_significant: true,
      commingling_rules: '',
    },
    grounds: {
      no_fault: rules.noFaultAvailable,
      grounds_options: [rules.noFaultGrounds],
      statute: '',
      legal_separation_available: true,
    },
    child_custody: {
      standard: rules.custodyStandard.toLowerCase().replace(/ /g, '_'),
      joint_custody_preference: rules.jointCustodyPreference,
      factors: [],
      statute: '',
      geographic_restrictions: null,
    },
    child_support: {
      guideline_type: rules.childSupportGuideline.toLowerCase().replace(/ /g, '_'),
      statute: '',
      factors: [],
      cap: null,
    },
    spousal_support: {
      temporary_support_formula: false,
      permanent_support_factors: '',
      long_term_marriage_years: 10,
      modification_standard: 'Material change in circumstances',
      termination_events: ['Death of either party', 'Remarriage of supported spouse'],
      duration_limits: null,
    },
    forms: [],
    counties: [],
  }
}

// Build the complete STATE_DATA map: detailed data takes priority, fill gaps from rules
const generatedData: Record<string, StateLawData> = {}
for (const rules of ALL_STATE_RULES) {
  if (DETAILED_STATE_DATA[rules.code]) {
    generatedData[rules.code] = DETAILED_STATE_DATA[rules.code]
  } else {
    generatedData[rules.code] = rulestoStateLawData(rules)
  }
}

export const STATE_DATA: Record<string, StateLawData> = generatedData

export function getStateData(stateCode: string): StateLawData | null {
  return STATE_DATA[stateCode.toUpperCase()] || null
}

export function getSupportedStates(): { code: string; name: string }[] {
  return Object.values(STATE_DATA)
    .map((s) => ({ code: s.code, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** States with full detailed data (forms, counties, etc.) */
export function getDetailedStates(): string[] {
  return Object.keys(DETAILED_STATE_DATA)
}

export { californiaData, texasData, floridaData }
