import Decimal from 'decimal.js'
import { ChildSupportInput, ChildSupportResult } from '@/types/calculators'

/**
 * California Guideline Child Support Calculator.
 * Formula: CS = K[HN − (H%)(TN)]
 */
export function calculateCAChildSupport(input: ChildSupportInput): ChildSupportResult {
  const wifeIncome = new Decimal(input.wife_net_monthly_income)
  const husbandIncome = new Decimal(input.husband_net_monthly_income)
  const totalIncome = wifeIncome.plus(husbandIncome)
  const childrenCount = input.children_count

  const wifeTimeshare = input.wife_timeshare_percentage ?? 50
  const husbandTimeshare = 100 - wifeTimeshare

  // Determine high earner
  const isWifeHighEarner = wifeIncome.greaterThan(husbandIncome)
  const HN = isWifeHighEarner ? wifeIncome : husbandIncome
  const Hpercent = new Decimal(isWifeHighEarner ? wifeTimeshare : husbandTimeshare).dividedBy(100)
  const TN = totalIncome

  const K = getKFactor(childrenCount, TN)

  // CS = K[HN - (H%)(TN)]
  const childSupport = new Decimal(K).times(HN.minus(Hpercent.times(TN)))
  const supportAmount = Decimal.max(childSupport, new Decimal(0))

  return {
    state: 'CA',
    method: 'Guideline (algebraic formula)',
    monthly_support: supportAmount.toDecimalPlaces(2).toNumber(),
    payor: isWifeHighEarner ? 'wife' : 'husband',
    recipient: isWifeHighEarner ? 'husband' : 'wife',
    formula_explanation: `K[HN − (H%)(TN)] = ${K}[${HN.toFixed(2)} − (${Hpercent.toFixed(2)})(${TN.toFixed(2)})] = $${supportAmount.toFixed(2)}/mo`,
    details: {
      wife_net_income: wifeIncome.toNumber(),
      husband_net_income: husbandIncome.toNumber(),
      total_income: totalIncome.toNumber(),
      wife_timeshare: wifeTimeshare,
      husband_timeshare: husbandTimeshare,
      k_factor: K,
      children_count: childrenCount,
    },
  }
}

function getKFactor(children: number, totalIncome: Decimal): number {
  const income = totalIncome.toNumber()
  if (children === 1) return income < 6000 ? 0.20 : 0.18
  if (children === 2) return income < 6000 ? 0.25 : 0.23
  if (children === 3) return 0.30
  return 0.35
}

/**
 * Texas Child Support Calculator.
 * Percentage-of-net-resources model.
 */
export function calculateTXChildSupport(input: ChildSupportInput): ChildSupportResult {
  const custodyParent = input.primary_custody_parent ?? 'wife'
  const obligorIsHusband = custodyParent === 'wife'

  const obligorIncome = new Decimal(
    obligorIsHusband ? input.husband_net_monthly_income : input.wife_net_monthly_income
  )
  const childrenCount = input.children_count

  const percentages: Record<number, number> = {
    1: 0.20, 2: 0.25, 3: 0.30, 4: 0.35, 5: 0.40, 6: 0.40,
  }
  const pct = percentages[Math.min(childrenCount, 6)]

  // 2024 net resources cap: $9,200/mo
  const NET_RESOURCES_CAP = 9200
  const cappedIncome = Decimal.min(obligorIncome, new Decimal(NET_RESOURCES_CAP))
  const childSupport = cappedIncome.times(pct)

  return {
    state: 'TX',
    method: 'Percentage of net resources',
    monthly_support: childSupport.toDecimalPlaces(2).toNumber(),
    payor: obligorIsHusband ? 'husband' : 'wife',
    recipient: obligorIsHusband ? 'wife' : 'husband',
    formula_explanation: `${(pct * 100).toFixed(0)}% of net resources (capped at $${NET_RESOURCES_CAP.toLocaleString()}) = ${(pct * 100).toFixed(0)}% × $${cappedIncome.toFixed(2)} = $${childSupport.toFixed(2)}/mo`,
    details: {
      obligor_net_income: obligorIncome.toNumber(),
      capped_income: cappedIncome.toNumber(),
      guideline_percentage: pct * 100,
      children_count: childrenCount,
      net_resources_cap: NET_RESOURCES_CAP,
    },
  }
}

/**
 * Florida Child Support Calculator.
 * Income shares model with overnight adjustment.
 */
export function calculateFLChildSupport(input: ChildSupportInput): ChildSupportResult {
  const wifeIncome = new Decimal(input.wife_net_monthly_income)
  const husbandIncome = new Decimal(input.husband_net_monthly_income)
  const combinedIncome = wifeIncome.plus(husbandIncome)
  const childrenCount = input.children_count

  // Look up basic obligation from FL schedule
  const basicObligation = lookupFLSchedule(combinedIncome, childrenCount)

  // Prorate based on income percentages
  if (combinedIncome.isZero()) {
    return {
      state: 'FL',
      method: 'Income shares',
      monthly_support: 0,
      payor: 'husband',
      recipient: 'wife',
      formula_explanation: 'Combined income is $0 — no guideline amount.',
      details: {},
    }
  }

  const wifeRatio = wifeIncome.dividedBy(combinedIncome)
  const husbandRatio = husbandIncome.dividedBy(combinedIncome)
  const wifeShare = basicObligation.times(wifeRatio)
  const husbandShare = basicObligation.times(husbandRatio)

  // Overnight adjustment
  const wifeOvernights = input.wife_annual_overnights ?? 255
  const husbandOvernights = 365 - wifeOvernights

  let adjWife = wifeShare
  let adjHusband = husbandShare

  // If non-custodial parent has 73+ overnights, apply substantial time-sharing adjustment
  if (husbandOvernights >= 73 && wifeOvernights >= 73) {
    const husbandTimePct = new Decimal(husbandOvernights).dividedBy(365)
    const wifeTimePct = new Decimal(wifeOvernights).dividedBy(365)
    // Each parent's obligation is multiplied by the OTHER parent's time percentage × 1.5
    adjHusband = husbandShare.times(wifeTimePct).times(1.5)
    adjWife = wifeShare.times(husbandTimePct).times(1.5)
  }

  const netSupport = adjHusband.minus(adjWife)
  const supportAmount = netSupport.abs()

  return {
    state: 'FL',
    method: 'Income shares',
    monthly_support: supportAmount.toDecimalPlaces(2).toNumber(),
    payor: netSupport.greaterThanOrEqualTo(0) ? 'husband' : 'wife',
    recipient: netSupport.greaterThanOrEqualTo(0) ? 'wife' : 'husband',
    formula_explanation: `Combined income $${combinedIncome.toFixed(2)} → basic obligation $${basicObligation.toFixed(2)} → prorated by income share → adjusted for ${husbandOvernights} overnights = $${supportAmount.toFixed(2)}/mo`,
    details: {
      wife_net_income: wifeIncome.toNumber(),
      husband_net_income: husbandIncome.toNumber(),
      combined_income: combinedIncome.toNumber(),
      basic_obligation: basicObligation.toNumber(),
      wife_share: wifeShare.toNumber(),
      husband_share: husbandShare.toNumber(),
      wife_overnights: wifeOvernights,
      husband_overnights: husbandOvernights,
      children_count: childrenCount,
    },
  }
}

/**
 * Simplified FL child support guidelines schedule.
 * Uses linear interpolation between known income levels.
 */
function lookupFLSchedule(combinedIncome: Decimal, childrenCount: number): Decimal {
  const income = combinedIncome.toNumber()

  // Schedules per child count (monthly combined net income → basic obligation)
  const schedules: Record<number, Record<number, number>> = {
    1: {
      800: 190, 1000: 213, 1500: 289, 2000: 365, 2500: 434,
      3000: 503, 3500: 567, 4000: 630, 4500: 690, 5000: 750,
      5500: 807, 6000: 863, 6500: 917, 7000: 970, 7500: 1021,
      8000: 1072, 8500: 1121, 9000: 1170, 9500: 1217, 10000: 1264,
      12000: 1449, 15000: 1710,
    },
    2: {
      800: 271, 1000: 304, 1500: 426, 2000: 548, 2500: 662,
      3000: 775, 3500: 880, 4000: 984, 4500: 1082, 5000: 1180,
      5500: 1273, 6000: 1366, 6500: 1455, 7000: 1543, 7500: 1628,
      8000: 1712, 8500: 1794, 9000: 1875, 9500: 1954, 10000: 2032,
      12000: 2342, 15000: 2781,
    },
    3: {
      800: 326, 1000: 365, 1500: 511, 2000: 658, 2500: 794,
      3000: 930, 3500: 1056, 4000: 1181, 4500: 1299, 5000: 1416,
      5500: 1527, 6000: 1639, 6500: 1746, 7000: 1852, 7500: 1953,
      8000: 2054, 8500: 2153, 9000: 2250, 9500: 2345, 10000: 2438,
      12000: 2810, 15000: 3337,
    },
  }

  const schedule = schedules[Math.min(childrenCount, 3)] ?? schedules[3]
  // Apply multiplier for 4+ children
  const multiplier = childrenCount > 3 ? 1 + (childrenCount - 3) * 0.15 : 1

  const levels = Object.keys(schedule).map(Number).sort((a, b) => a - b)

  // Below minimum
  if (income <= levels[0]) return new Decimal(schedule[levels[0]] * multiplier)
  // Above maximum
  if (income >= levels[levels.length - 1]) {
    return new Decimal(schedule[levels[levels.length - 1]] * multiplier)
  }

  // Linear interpolation
  for (let i = 0; i < levels.length - 1; i++) {
    if (income >= levels[i] && income <= levels[i + 1]) {
      const lower = schedule[levels[i]]
      const upper = schedule[levels[i + 1]]
      const ratio = (income - levels[i]) / (levels[i + 1] - levels[i])
      const interpolated = lower + ratio * (upper - lower)
      return new Decimal(interpolated * multiplier)
    }
  }

  return new Decimal(schedule[levels[0]] * multiplier)
}

/**
 * Dispatches to the correct state calculator.
 */
export function calculateChildSupport(
  stateCode: string,
  input: ChildSupportInput
): ChildSupportResult {
  switch (stateCode) {
    case 'CA':
      return calculateCAChildSupport(input)
    case 'TX':
      return calculateTXChildSupport(input)
    case 'FL':
      return calculateFLChildSupport(input)
    default:
      throw new Error(`Child support calculator not available for state: ${stateCode}`)
  }
}
