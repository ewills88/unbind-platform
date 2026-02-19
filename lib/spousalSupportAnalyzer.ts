import Decimal from 'decimal.js'
import {
  SpousalSupportInput,
  SpousalSupportResult,
  SupportFactor,
} from '@/types/calculators'

/**
 * Dispatches to the correct state analyzer.
 */
export function analyzeSpousalSupport(
  stateCode: string,
  input: SpousalSupportInput
): SpousalSupportResult {
  switch (stateCode) {
    case 'CA':
      return analyzeCASupport(input)
    case 'TX':
      return analyzeTXSupport(input)
    case 'FL':
      return analyzeFLSupport(input)
    default:
      throw new Error(`Spousal support analyzer not available for state: ${stateCode}`)
  }
}

function getMarriageDuration(marriageDate: string, separationDate?: string) {
  const start = new Date(marriageDate)
  const end = separationDate ? new Date(separationDate) : new Date()
  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth()
  if (months < 0) {
    years--
    months += 12
  }
  return { years, months }
}

// ─── CALIFORNIA ─────────────────────────────────────────────────

function analyzeCASupport(input: SpousalSupportInput): SpousalSupportResult {
  const wifeIncome = new Decimal(input.wife_net_monthly_income)
  const husbandIncome = new Decimal(input.husband_net_monthly_income)

  const duration = input.marriage_duration_years
    ? { years: input.marriage_duration_years, months: 0 }
    : getMarriageDuration(input.marriage_date, input.separation_date)

  const isWifeHighEarner = wifeIncome.greaterThan(husbandIncome)
  const highIncome = isWifeHighEarner ? wifeIncome : husbandIncome
  const lowIncome = isWifeHighEarner ? husbandIncome : wifeIncome

  // Santa Clara guideline approximation for temporary support:
  // Support = 40% of high earner − 50% of low earner (floor at $0)
  const temporarySupport = Decimal.max(
    highIncome.times(0.40).minus(lowIncome.times(0.50)),
    new Decimal(0)
  )

  // Permanent support is typically lower
  const permanentEstimate = temporarySupport.times(0.8)

  // Duration
  const totalMonths = duration.years * 12 + duration.months
  let durationMonths: number | 'indefinite'
  if (duration.years >= 10) {
    durationMonths = 'indefinite'
  } else {
    durationMonths = Math.round(totalMonths / 2)
  }

  const factors = getCA4320Factors(duration, wifeIncome, husbandIncome)
  const recommendations = generateCARecommendations(duration, isWifeHighEarner)

  return {
    state: 'CA',
    eligible: true,
    marriage_duration: duration,
    is_long_term_marriage: duration.years >= 10,
    temporary_support_estimate: temporarySupport.toDecimalPlaces(2).toNumber(),
    permanent_support_estimate: permanentEstimate.toDecimalPlaces(2).toNumber(),
    estimated_duration_months: durationMonths,
    payor: isWifeHighEarner ? 'wife' : 'husband',
    recipient: isWifeHighEarner ? 'husband' : 'wife',
    monthly_support: temporarySupport.toDecimalPlaces(2).toNumber(),
    factors_analysis: factors,
    recommendations,
  }
}

function getCA4320Factors(
  duration: { years: number; months: number },
  wifeIncome: Decimal,
  husbandIncome: Decimal
): SupportFactor[] {
  return [
    {
      factor: "Extent to which supported party's earning capacity maintains marital standard of living",
      analysis: 'Analyze income disparity and ability to become self-supporting.',
      weight: 'High',
    },
    {
      factor: 'Marketable skills and time/expense for education or training',
      analysis: 'Consider if supported spouse needs retraining for workforce.',
      weight: 'Medium',
    },
    {
      factor: 'Duration of marriage',
      analysis: `${duration.years} years, ${duration.months} months. ${duration.years >= 10 ? 'Long-term marriage — indefinite support possible.' : 'Short-term marriage — support limited to half the length of marriage.'}`,
      weight: 'High',
    },
    {
      factor: 'Standard of living established during marriage',
      analysis: 'Court will attempt to maintain marital standard of living for both parties.',
      weight: 'High',
    },
    {
      factor: 'Obligations and assets of each party',
      analysis: `Wife income: $${wifeIncome.toFixed(0)}/mo, Husband income: $${husbandIncome.toFixed(0)}/mo.`,
      weight: 'High',
    },
    {
      factor: 'Age and health of parties',
      analysis: 'Health limitations may affect ability to become self-supporting.',
      weight: 'Medium',
    },
    {
      factor: 'History of domestic violence',
      analysis: 'Documented domestic violence is a relevant factor under FC § 4320.',
      weight: 'High',
    },
    {
      factor: 'Tax consequences to each party',
      analysis: 'Post-2018: spousal support is no longer tax-deductible for payor or taxable to recipient.',
      weight: 'Low',
    },
    {
      factor: 'Balance of hardships to each party',
      analysis: 'Court weighs relative hardship of awarding or denying support.',
      weight: 'Medium',
    },
    {
      factor: 'Goal of self-sufficiency within reasonable time',
      analysis: 'Supported spouse is expected to work toward becoming self-supporting.',
      weight: 'Medium',
    },
  ]
}

function generateCARecommendations(
  duration: { years: number; months: number },
  _isWifeHighEarner: boolean
): string[] {
  const recs: string[] = []
  if (duration.years >= 10) {
    recs.push(
      'Long-term marriage (10+ years). Court retains indefinite jurisdiction over spousal support.'
    )
    recs.push(
      'Consider Gavron warning: supported party has duty to become self-supporting.'
    )
  } else {
    recs.push(
      `Short-term marriage. Support typically limited to ${Math.round((duration.years * 12 + duration.months) / 2)} months (half the marriage duration).`
    )
  }
  recs.push(
    'Temporary support calculated using Santa Clara County guideline approximation. Actual temporary support may vary by county.'
  )
  recs.push(
    'Permanent support is determined by the court considering all Family Code § 4320 factors.'
  )
  return recs
}

// ─── TEXAS ──────────────────────────────────────────────────────

function analyzeTXSupport(input: SpousalSupportInput): SpousalSupportResult {
  const duration = input.marriage_duration_years
    ? { years: input.marriage_duration_years, months: 0 }
    : getMarriageDuration(input.marriage_date, input.separation_date)

  const wifeIncome = new Decimal(input.wife_net_monthly_income)
  const husbandIncome = new Decimal(input.husband_net_monthly_income)
  const isWifeHighEarner = wifeIncome.greaterThan(husbandIncome)

  // TX eligibility check
  const eligible = duration.years >= 10 || !!input.family_violence_within_2_years
  const eligibilityBasis = duration.years >= 10
    ? 'Marriage duration 10+ years'
    : input.family_violence_within_2_years
    ? 'Family violence within 2 years of filing'
    : null

  if (!eligible) {
    return {
      state: 'TX',
      eligible: false,
      marriage_duration: duration,
      is_long_term_marriage: duration.years >= 10,
      estimated_duration_months: 0,
      payor: isWifeHighEarner ? 'wife' : 'husband',
      recipient: isWifeHighEarner ? 'husband' : 'wife',
      monthly_support: 0,
      factors_analysis: [],
      recommendations: [
        'Texas disfavors spousal support (maintenance).',
        'Marriage under 10 years and no qualifying circumstances (family violence, disability, care of disabled child).',
        'Consider property division to address economic disparity instead.',
      ],
    }
  }

  // If eligible: lesser of $5,000/mo or 20% of payor gross income
  const payorGross = new Decimal(
    isWifeHighEarner
      ? (input.wife_gross_monthly_income ?? input.wife_net_monthly_income * 1.3)
      : (input.husband_gross_monthly_income ?? input.husband_net_monthly_income * 1.3)
  )
  const supportAmount = Decimal.min(new Decimal(5000), payorGross.times(0.20))

  // Duration limits
  let maxDuration: number | 'indefinite'
  if (duration.years >= 30) maxDuration = 'indefinite'
  else if (duration.years >= 20) maxDuration = 120
  else if (duration.years >= 10) maxDuration = 84
  else maxDuration = 60

  return {
    state: 'TX',
    eligible: true,
    marriage_duration: duration,
    is_long_term_marriage: duration.years >= 10,
    temporary_support_estimate: supportAmount.toDecimalPlaces(2).toNumber(),
    estimated_duration_months: maxDuration,
    payor: isWifeHighEarner ? 'wife' : 'husband',
    recipient: isWifeHighEarner ? 'husband' : 'wife',
    monthly_support: supportAmount.toDecimalPlaces(2).toNumber(),
    factors_analysis: [
      {
        factor: 'Eligibility basis',
        analysis: eligibilityBasis || 'N/A',
        weight: 'High',
      },
      {
        factor: 'Statutory cap',
        analysis: 'TX limits maintenance to the lesser of $5,000/month or 20% of payor gross income.',
        weight: 'High',
      },
      {
        factor: 'Duration limit',
        analysis: `Based on ${duration.years}-year marriage: max ${maxDuration === 'indefinite' ? 'indefinite' : maxDuration + ' months'} of maintenance.`,
        weight: 'High',
      },
    ],
    recommendations: [
      'TX maintenance is limited. Consider lump-sum property settlement as alternative.',
      `Maximum duration: ${maxDuration === 'indefinite' ? 'indefinite' : maxDuration + ' months'}.`,
      'Support terminates upon remarriage of recipient or cohabitation.',
    ],
  }
}

// ─── FLORIDA ────────────────────────────────────────────────────

function analyzeFLSupport(input: SpousalSupportInput): SpousalSupportResult {
  const duration = input.marriage_duration_years
    ? { years: input.marriage_duration_years, months: 0 }
    : getMarriageDuration(input.marriage_date, input.separation_date)

  const wifeIncome = new Decimal(input.wife_net_monthly_income)
  const husbandIncome = new Decimal(input.husband_net_monthly_income)
  const isWifeHighEarner = wifeIncome.greaterThan(husbandIncome)
  const highIncome = isWifeHighEarner ? wifeIncome : husbandIncome
  const lowIncome = isWifeHighEarner ? husbandIncome : wifeIncome

  const marriageLength = duration.years + duration.months / 12

  let durationType: string
  let recommendedType: string
  let maxMonths: number | 'indefinite'

  if (marriageLength < 7) {
    durationType = 'short-term'
    recommendedType = 'Bridge-the-gap (max 2 years) or rehabilitative'
    maxMonths = 24
  } else if (marriageLength < 17) {
    durationType = 'moderate-term'
    recommendedType = 'Rehabilitative or durational alimony'
    maxMonths = Math.round(marriageLength * 12 * 0.75)
  } else {
    durationType = 'long-term'
    recommendedType = 'Durational or potentially permanent alimony'
    maxMonths = 'indefinite'
  }

  // Estimate: need vs ability to pay
  const need = Decimal.max(highIncome.times(0.30).minus(lowIncome), new Decimal(0))
  const abilityToPay = highIncome.times(0.30)
  const estimatedSupport = Decimal.min(need, abilityToPay)

  const factors = getFLFactors(duration, durationType)

  return {
    state: 'FL',
    eligible: true,
    marriage_duration: duration,
    is_long_term_marriage: marriageLength >= 17,
    temporary_support_estimate: estimatedSupport.toDecimalPlaces(2).toNumber(),
    estimated_duration_months: maxMonths,
    payor: isWifeHighEarner ? 'wife' : 'husband',
    recipient: isWifeHighEarner ? 'husband' : 'wife',
    monthly_support: estimatedSupport.toDecimalPlaces(2).toNumber(),
    factors_analysis: factors,
    recommendations: [
      `Marriage classified as ${durationType} (${duration.years} years).`,
      `Recommended alimony type: ${recommendedType}.`,
      'FL 2023 alimony reforms eliminated permanent alimony for new filings.',
      'Durational alimony cannot exceed the length of the marriage.',
      estimatedSupport.isZero()
        ? 'Lower-earning spouse income may cover reasonable needs. Support may not be warranted.'
        : `Estimated monthly amount based on need/ability analysis: $${estimatedSupport.toFixed(2)}.`,
    ],
  }
}

function getFLFactors(
  duration: { years: number; months: number },
  durationType: string
): SupportFactor[] {
  return [
    {
      factor: 'Standard of living established during the marriage',
      analysis: 'Court considers the lifestyle maintained during marriage.',
      weight: 'High',
    },
    {
      factor: 'Duration of the marriage',
      analysis: `${duration.years} years (${durationType}). Affects type and duration of alimony.`,
      weight: 'High',
    },
    {
      factor: 'Age and physical/emotional condition of each party',
      analysis: 'Health and age affect ability to become self-supporting.',
      weight: 'Medium',
    },
    {
      factor: 'Financial resources of each party',
      analysis: 'Includes income, assets, and marital/non-marital property distribution.',
      weight: 'High',
    },
    {
      factor: 'Earning capacity, education, and employability',
      analysis: 'Court considers time needed for education/training to become self-supporting.',
      weight: 'High',
    },
    {
      factor: 'Contribution to the marriage (including homemaking)',
      analysis: 'Both financial and non-financial contributions are considered.',
      weight: 'Medium',
    },
    {
      factor: 'Responsibilities to minor children',
      analysis: 'Custodial responsibilities may limit earning capacity.',
      weight: 'Medium',
    },
    {
      factor: 'Tax treatment and consequences',
      analysis: 'Post-2018: alimony not tax-deductible or taxable income.',
      weight: 'Low',
    },
    {
      factor: 'Sources of income available (including investment returns)',
      analysis: 'All income sources considered, not just employment.',
      weight: 'Medium',
    },
    {
      factor: 'Adultery and its economic impact',
      analysis: 'FL courts may consider adultery if it led to dissipation of marital assets.',
      weight: 'Low',
    },
  ]
}
