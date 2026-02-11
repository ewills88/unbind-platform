import Decimal from 'decimal.js'
import {
  Asset,
  ClassifiedAsset,
  PropertyDivisionInput,
  PropertyDivisionResult,
} from '@/types/calculators'

/**
 * Community Property Calculator for CA and TX.
 * Pure function — takes assets + dates, returns classified & divided results.
 */
export function calculateCommunityPropertyDivision(
  input: PropertyDivisionInput
): PropertyDivisionResult {
  const { assets, marriage_date, separation_date, state_code } = input
  const marriageDate = new Date(marriage_date)
  const separationDate = separation_date ? new Date(separation_date) : new Date()

  const communityAssets: ClassifiedAsset[] = []
  const separateWifeAssets: ClassifiedAsset[] = []
  const separateHusbandAssets: ClassifiedAsset[] = []
  const classificationNotes: Record<string, string> = {}

  for (const asset of assets) {
    const classification = classifyAsset(asset, marriageDate, separationDate, state_code)
    const classified: ClassifiedAsset = { ...asset, ...classification }
    classificationNotes[asset.id] = classification.reasoning

    switch (classification.classification) {
      case 'community':
        communityAssets.push(classified)
        break
      case 'separate_wife':
        separateWifeAssets.push(classified)
        break
      case 'separate_husband':
        separateHusbandAssets.push(classified)
        break
      case 'mixed':
        // Split: community portion goes to community, separate portions to owners
        communityAssets.push(classified)
        break
    }
  }

  const communityTotal = sumAssets(communityAssets)
  const separateWifeTotal = sumAssets(separateWifeAssets)
  const separateHusbandTotal = sumAssets(separateHusbandAssets)

  // Community property: 50/50 split
  const halfCommunity = communityTotal.dividedBy(2)
  const division = proposeCommunityDivision(communityAssets, halfCommunity, halfCommunity)

  return {
    community_assets: communityAssets,
    separate_wife_assets: separateWifeAssets,
    separate_husband_assets: separateHusbandAssets,
    community_total: communityTotal.toNumber(),
    separate_wife_total: separateWifeTotal.toNumber(),
    separate_husband_total: separateHusbandTotal.toNumber(),
    recommended_division: division,
    classification_notes: classificationNotes,
  }
}

function classifyAsset(
  asset: Asset,
  marriageDate: Date,
  separationDate: Date,
  stateCode: string
): { classification: ClassifiedAsset['classification']; reasoning: string } {
  const acquisitionDate = new Date(asset.acquisition_date)

  // Before marriage = separate property
  if (acquisitionDate < marriageDate) {
    const owner = determineOwner(asset)
    return {
      classification: owner === 'wife' ? 'separate_wife' : 'separate_husband',
      reasoning: `Acquired ${fmtDate(acquisitionDate)}, before marriage (${fmtDate(marriageDate)}). Separate property.`,
    }
  }

  // After separation (CA recognizes date of separation; TX does not)
  if (stateCode === 'CA' && acquisitionDate > separationDate) {
    const owner = determineOwner(asset)
    return {
      classification: owner === 'wife' ? 'separate_wife' : 'separate_husband',
      reasoning: `Acquired ${fmtDate(acquisitionDate)}, after separation (${fmtDate(separationDate)}). Under CA law, property acquired after separation is separate property.`,
    }
  }

  // Gifts and inheritances are separate even during marriage
  if (asset.source_of_funds === 'gift' || asset.source_of_funds === 'inheritance') {
    const owner = determineOwner(asset)
    const sourceLabel = asset.source_of_funds === 'gift' ? 'Gift' : 'Inheritance'
    return {
      classification: owner === 'wife' ? 'separate_wife' : 'separate_husband',
      reasoning: `${sourceLabel} received during marriage. ${sourceLabel}s are separate property even when received during marriage.`,
    }
  }

  // Mixed funds
  if (asset.source_of_funds === 'mixed') {
    return {
      classification: 'mixed',
      reasoning: `Acquired during marriage with mixed community and separate funds. Requires tracing analysis to determine proportions.`,
    }
  }

  // Default: community property
  return {
    classification: 'community',
    reasoning: `Acquired ${fmtDate(acquisitionDate)}, during marriage (${fmtDate(marriageDate)} – ${fmtDate(separationDate)}). Presumed community property.`,
  }
}

function determineOwner(asset: Asset): 'wife' | 'husband' {
  if (asset.owner === 'wife') return 'wife'
  if (asset.owner === 'husband') return 'husband'
  // Default to husband if unspecified (attorney should correct)
  return 'husband'
}

function proposeCommunityDivision(
  assets: ClassifiedAsset[],
  wifeTarget: Decimal,
  husbandTarget: Decimal
): PropertyDivisionResult['recommended_division'] {
  const wifeAssets: ClassifiedAsset[] = []
  const husbandAssets: ClassifiedAsset[] = []

  let wifeRunning = new Decimal(0)
  let husbandRunning = new Decimal(0)

  // Sort by value descending for better packing
  const sorted = [...assets].sort((a, b) => b.current_value - a.current_value)

  for (const asset of sorted) {
    const val = new Decimal(asset.current_value)
    const wifeDeficit = wifeTarget.minus(wifeRunning)
    const husbandDeficit = husbandTarget.minus(husbandRunning)

    if (wifeDeficit.greaterThanOrEqualTo(husbandDeficit)) {
      wifeAssets.push({ ...asset, assigned_to: 'wife', wife_percentage: 100, husband_percentage: 0 })
      wifeRunning = wifeRunning.plus(val)
    } else {
      husbandAssets.push({ ...asset, assigned_to: 'husband', wife_percentage: 0, husband_percentage: 100 })
      husbandRunning = husbandRunning.plus(val)
    }
  }

  const diff = wifeRunning.minus(husbandRunning).abs()
  const equalizingPayment = diff.dividedBy(2)

  let paymentDirection: 'wife_to_husband' | 'husband_to_wife' | 'none' = 'none'
  if (wifeRunning.greaterThan(husbandRunning)) {
    paymentDirection = 'wife_to_husband'
  } else if (husbandRunning.greaterThan(wifeRunning)) {
    paymentDirection = 'husband_to_wife'
  }

  return {
    wife_receives: wifeAssets,
    husband_receives: husbandAssets,
    wife_total: wifeRunning.toNumber(),
    husband_total: husbandRunning.toNumber(),
    equalizing_payment: equalizingPayment.toNumber(),
    payment_direction: paymentDirection,
  }
}

function sumAssets(assets: Asset[]): Decimal {
  return assets.reduce((sum, a) => sum.plus(new Decimal(a.current_value)), new Decimal(0))
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
