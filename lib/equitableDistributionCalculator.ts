import Decimal from 'decimal.js'
import {
  Asset,
  ClassifiedAsset,
  EquitableDistributionFactors,
  EquitableDistributionResult,
} from '@/types/calculators'

/**
 * Equitable Distribution Calculator for FL.
 * Considers statutory factors to recommend a fair (not necessarily equal) split.
 */
export function calculateEquitableDistribution(
  maritalAssets: Asset[],
  factors: EquitableDistributionFactors
): EquitableDistributionResult {
  const totalMaritalProperty = maritalAssets.reduce(
    (sum, a) => sum.plus(new Decimal(a.current_value)),
    new Decimal(0)
  )

  const split = calculateFloridaSplit(factors)

  const wifeShare = totalMaritalProperty.times(split.wife_percentage).dividedBy(100)
  const husbandShare = totalMaritalProperty.times(split.husband_percentage).dividedBy(100)

  return {
    total_marital_property: totalMaritalProperty.toNumber(),
    recommended_wife_percentage: split.wife_percentage,
    recommended_husband_percentage: split.husband_percentage,
    wife_share_amount: wifeShare.toNumber(),
    husband_share_amount: husbandShare.toNumber(),
    justification: split.justification,
    factors_considered: split.factors_applied,
  }
}

interface SplitResult {
  wife_percentage: number
  husband_percentage: number
  justification: string
  factors_applied: string[]
}

function calculateFloridaSplit(factors: EquitableDistributionFactors): SplitResult {
  let wifeP = 50
  let husbandP = 50
  const justifications: string[] = []
  const factorsApplied: string[] = []

  // Factor 1: Financial contributions
  const financialDiff =
    factors.wife_contributions_financial - factors.husband_contributions_financial
  if (Math.abs(financialDiff) >= 2) {
    const adj = financialDiff * 2
    wifeP += adj
    husbandP -= adj
    justifications.push(
      `Adjusted ${Math.abs(adj)}% based on financial contributions disparity.`
    )
    factorsApplied.push('Financial contributions to marriage')
  }

  // Factor 2: Homemaking contributions
  const homemakingDiff =
    factors.wife_contributions_homemaking - factors.husband_contributions_homemaking
  if (Math.abs(homemakingDiff) >= 2) {
    const adj = homemakingDiff * 1.5
    wifeP += adj
    husbandP -= adj
    justifications.push(
      `Adjusted ${Math.abs(adj).toFixed(1)}% for homemaking and childcare contributions.`
    )
    factorsApplied.push('Contributions to homemaking and childcare')
  }

  // Factor 3: Career sacrifices
  if (factors.wife_career_sacrifices && !factors.husband_career_sacrifices) {
    wifeP += 5
    husbandP -= 5
    justifications.push(
      'Wife sacrificed career opportunities for family. Adjusted 5% in her favor.'
    )
    factorsApplied.push('Interruption of personal careers or educational opportunities')
  } else if (factors.husband_career_sacrifices && !factors.wife_career_sacrifices) {
    husbandP += 5
    wifeP -= 5
    justifications.push(
      'Husband sacrificed career opportunities for family. Adjusted 5% in his favor.'
    )
    factorsApplied.push('Interruption of personal careers or educational opportunities')
  }

  // Factor 4: Future earning capacity disparity
  if (factors.husband_future_earning_capacity > 0) {
    const earningRatio =
      factors.wife_future_earning_capacity / factors.husband_future_earning_capacity
    if (earningRatio < 0.6) {
      const adj = Math.min(8, (0.6 - earningRatio) * 20)
      wifeP += adj
      husbandP -= adj
      justifications.push(
        `Wife's future earning capacity is ${Math.round(earningRatio * 100)}% of husband's. Adjusted ${adj.toFixed(1)}% for economic circumstances.`
      )
      factorsApplied.push('Economic circumstances of each party')
    } else if (earningRatio > 1.67) {
      const adj = Math.min(8, (earningRatio - 1.67) * 10)
      husbandP += adj
      wifeP -= adj
      justifications.push(
        `Husband's future earning capacity is ${Math.round((1 / earningRatio) * 100)}% of wife's. Adjusted ${adj.toFixed(1)}% for economic circumstances.`
      )
      factorsApplied.push('Economic circumstances of each party')
    }
  }

  // Factor 5: Duration of marriage
  if (factors.marriage_duration_years < 3) {
    const adj = (50 - wifeP) * 0.5
    wifeP += adj
    husbandP -= adj
    justifications.push(
      `Short marriage (${factors.marriage_duration_years} years) — adjusted toward equal distribution.`
    )
    factorsApplied.push('Duration of marriage')
  } else if (factors.marriage_duration_years > 20) {
    justifications.push(
      `Long marriage (${factors.marriage_duration_years} years) — both parties contributed significantly over time.`
    )
    factorsApplied.push('Duration of marriage')
  }

  // Factor 6: Health and age
  const healthDiff = factors.wife_health_age - factors.husband_health_age
  if (healthDiff < -3) {
    wifeP += 3
    husbandP -= 3
    justifications.push(
      'Wife has health or age disadvantages. Adjusted 3% in her favor.'
    )
    factorsApplied.push('Age, health, and station in life of each party')
  } else if (healthDiff > 3) {
    husbandP += 3
    wifeP -= 3
    justifications.push(
      'Husband has health or age disadvantages. Adjusted 3% in his favor.'
    )
    factorsApplied.push('Age, health, and station in life of each party')
  }

  // Normalize to sum to 100
  const total = wifeP + husbandP
  wifeP = (wifeP / total) * 100
  husbandP = (husbandP / total) * 100

  // Cap at 70/30
  if (wifeP > 70) {
    wifeP = 70
    husbandP = 30
    justifications.push('Capped at 70/30 split (extreme unequal distribution).')
  } else if (husbandP > 70) {
    husbandP = 70
    wifeP = 30
    justifications.push('Capped at 70/30 split (extreme unequal distribution).')
  }

  return {
    wife_percentage: Math.round(wifeP * 10) / 10,
    husband_percentage: Math.round(husbandP * 10) / 10,
    justification: justifications.join(' '),
    factors_applied: factorsApplied,
  }
}
