// Session 17 CP3: Settlement Agreement Document Generator
// Generates DOCX settlement agreements from proposals + templates

import {
  Document, Paragraph, TextRun, AlignmentType, PageBreak,
  Packer, HeadingLevel, TabStopPosition, TabStopType,
} from 'docx'
import type {
  SettlementProposal,
  ProposalPropertyItem,
  ProposalSpousalSupport,
  ProposalChildSupport,
  ProposalCustody,
  ProposalOtherTerm,
  SettlementTemplateSection,
} from '@/types/settlement'
import { formatCurrency } from '@/types/settlement'

// ============================================================================
// Template Variable Rendering
// ============================================================================

/**
 * Replace {{variable}} placeholders in template text.
 * Also handles {{#if var}}...{{/if}} and {{#if var}}...{{else}}...{{/if}} blocks.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template

  // Handle {{#if var}}...{{else}}...{{/if}} blocks
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, varName, ifBlock, elseBlock) => {
      const val = variables[varName]
      return (val && val !== 'false' && val !== '') ? ifBlock.trim() : elseBlock.trim()
    }
  )

  // Handle {{#if var}}...{{/if}} blocks (no else)
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, varName, block) => {
      const val = variables[varName]
      return (val && val !== 'false' && val !== '') ? block.trim() : ''
    }
  )

  // Replace {{variable}} placeholders
  result = result.replace(/\{\{(\w+)\}\}/g, (_match, varName) => {
    return variables[varName] || `[${varName}]`
  })

  // Clean up multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n')

  return result.trim()
}

// ============================================================================
// Variable Extraction from Proposal
// ============================================================================

interface CaseInfo {
  case_number: string
  state_code: string
  county: string
  court_name: string
  client_name: string
  spouse_name: string
  marriage_date?: string
  separation_date?: string
  marriage_location?: string
}

/**
 * Build template variables from proposal data and case info
 */
export function buildVariables(
  proposal: SettlementProposal,
  caseInfo: CaseInfo
): Record<string, string> {
  const vars: Record<string, string> = {
    petitioner_name: caseInfo.client_name || '[Petitioner Name]',
    respondent_name: caseInfo.spouse_name || '[Respondent Name]',
    case_number: caseInfo.case_number || '[Case Number]',
    county: caseInfo.county || '[County]',
    state_code: caseInfo.state_code || 'CA',
    court_name: caseInfo.court_name || '',
    marriage_date: caseInfo.marriage_date || '[Date of Marriage]',
    separation_date: caseInfo.separation_date || '[Date of Separation]',
    marriage_location: caseInfo.marriage_location || '[Location]',
    current_tax_year: new Date().getFullYear().toString(),
  }

  // Property division
  if (proposal.property_items && proposal.property_items.length > 0) {
    vars.property_division_table = buildPropertyTable(proposal.property_items)
    vars.has_property = 'true'

    // Separate property
    const petitionerSeparate = proposal.property_items
      .filter(i => i.characterization === 'separate_h')
      .map(i => `${i.description}: ${formatCurrency(i.net_value)}`)
      .join('\n')
    const respondentSeparate = proposal.property_items
      .filter(i => i.characterization === 'separate_w')
      .map(i => `${i.description}: ${formatCurrency(i.net_value)}`)
      .join('\n')
    vars.petitioner_separate_property = petitionerSeparate || 'None identified'
    vars.respondent_separate_property = respondentSeparate || 'None identified'
    if (petitionerSeparate || respondentSeparate) vars.has_separate_property = 'true'

    // Debts
    const debts = proposal.property_items.filter(i => i.item_type === 'debt')
    if (debts.length > 0) {
      vars.debt_division_table = buildDebtTable(debts)
      vars.has_debts = 'true'
    }
  }

  // Equalization
  if (proposal.equalization_payment > 0) {
    vars.equalization_payment = 'true'
    vars.equalization_amount = formatCurrency(proposal.equalization_payment)
    vars.equalization_payor = proposal.equalization_payor === 'husband'
      ? caseInfo.client_name : caseInfo.spouse_name
    vars.equalization_payee = proposal.equalization_payor === 'husband'
      ? caseInfo.spouse_name : caseInfo.client_name
    vars.equalization_deadline = '60'
    vars.equalization_payment_text = `${vars.equalization_payor} shall pay ${vars.equalization_payee} ${vars.equalization_amount} as an equalizing payment.`
  }

  // Spousal support
  const support = proposal.spousal_support?.[0]
  if (support) {
    buildSpousalSupportVars(vars, support, caseInfo)
  } else {
    vars.support_type_none = 'true'
    vars.spousal_support_plain_text = 'Each party waives spousal support.'
  }

  // Child custody
  const custody = proposal.custody?.[0]
  if (custody) {
    buildCustodyVars(vars, custody)
    vars.has_children = 'true'
  }

  // Child support
  const childSupport = proposal.child_support?.[0]
  if (childSupport) {
    buildChildSupportVars(vars, childSupport, caseInfo)
  }

  // Other terms
  if (proposal.other_terms && proposal.other_terms.length > 0) {
    buildOtherTermVars(vars, proposal.other_terms)
  }

  // Attorney fees defaults
  vars.attorney_fees_each_own = 'true'
  vars.attorney_fees_plain_text = 'Each party bears their own attorney fees and costs.'

  // Insurance defaults
  vars.insurance_provisions = 'Each Party shall be responsible for their own health insurance following the entry of Judgment.'
  vars.insurance_plain_text = 'Each party responsible for own health insurance after judgment.'
  if (support && support.security_type === 'life_insurance') {
    vars.life_insurance_required = 'true'
    vars.life_insurance_payor = support.payor === 'husband' ? caseInfo.client_name : caseInfo.spouse_name
    vars.life_insurance_amount = formatCurrency(support.security_amount || 0)
    vars.life_insurance_beneficiary = support.security_beneficiary || 'the supported party'
  }

  // General provisions
  vars.independent_counsel = 'true'

  return vars
}

function buildPropertyTable(items: ProposalPropertyItem[]): string {
  const assets = items.filter(i => i.item_type === 'asset')
  const lines: string[] = []

  for (const item of assets) {
    const allocation = item.allocated_to === 'husband' ? 'Petitioner'
      : item.allocated_to === 'wife' ? 'Respondent'
      : item.allocated_to === 'sell' ? 'Sell & Split'
      : `Split ${item.allocation_percentage}/${100 - item.allocation_percentage}`

    lines.push(
      `${item.description} (${item.category || 'General'})\n` +
      `  Net Value: ${formatCurrency(item.net_value)} | Awarded to: ${allocation}\n` +
      `  Petitioner receives: ${formatCurrency(item.husband_receives)} | ` +
      `Respondent receives: ${formatCurrency(item.wife_receives)}`
    )
  }

  return lines.join('\n\n') || 'No community property to divide.'
}

function buildDebtTable(debts: ProposalPropertyItem[]): string {
  const lines: string[] = []
  for (const debt of debts) {
    const allocation = debt.allocated_to === 'husband' ? 'Petitioner'
      : debt.allocated_to === 'wife' ? 'Respondent'
      : 'Split equally'

    lines.push(
      `${debt.description}\n` +
      `  Balance: ${formatCurrency(Math.abs(debt.net_value))} | Responsibility: ${allocation}`
    )
  }
  return lines.join('\n\n') || 'No community debts to divide.'
}

function buildSpousalSupportVars(
  vars: Record<string, string>,
  support: ProposalSpousalSupport,
  caseInfo: CaseInfo
): void {
  if (support.support_type === 'none') {
    vars.support_type_none = 'true'
    vars.spousal_support_plain_text = 'Each party permanently waives spousal support.'
    return
  }

  vars.support_payor = support.payor === 'husband' ? caseInfo.client_name : caseInfo.spouse_name
  vars.support_payee = support.payor === 'husband' ? caseInfo.spouse_name : caseInfo.client_name
  vars.support_monthly_amount = formatCurrency(support.monthly_amount)
  vars.support_start_date = support.start_date || 'the first of the month following execution'

  if (support.duration_months) {
    vars.support_duration = 'true'
    vars.support_duration_months = support.duration_months.toString()
    vars.support_end_date = support.end_date || `${support.duration_months} months from commencement`
  }

  if (support.step_down_schedule && support.step_down_schedule.length > 0) {
    vars.support_step_down = 'true'
    vars.support_step_down_schedule = support.step_down_schedule
      .map(s => `Month ${s.month}: ${formatCurrency(s.amount)}/month`)
      .join('\n')
  }

  const events = support.termination_events || []
  const eventLabels: Record<string, string> = {
    payee_remarriage: 'Remarriage of the supported Party',
    payee_cohabitation: 'Cohabitation of the supported Party with a new partner',
    death_either: 'Death of either Party',
    payee_employment: 'Supported Party obtains substantially gainful employment',
    payor_retirement: 'Retirement of the paying Party',
  }
  vars.termination_events = events
    .map(e => `- ${eventLabels[e] || e}`)
    .join('\n') || '- Death of either Party\n- Remarriage of the supported Party'

  vars.support_modifiable = support.modifiable ? 'true' : ''

  vars.spousal_support_plain_text = `${vars.support_payor} pays ${vars.support_monthly_amount}/month to ${vars.support_payee}` +
    (support.duration_months ? ` for ${support.duration_months} months.` : ' until further order.')
}

function buildCustodyVars(vars: Record<string, string>, custody: ProposalCustody): void {
  vars.children_names_ages = custody.children_names?.join(', ') || '[Children Names]'

  const legalMap: Record<string, string> = {
    joint: 'The Parties shall share joint legal custody of the minor child(ren).',
    sole_husband: 'Petitioner shall have sole legal custody of the minor child(ren).',
    sole_wife: 'Respondent shall have sole legal custody of the minor child(ren).',
  }
  vars.legal_custody_description = legalMap[custody.legal_custody] || ''

  const physMap: Record<string, string> = {
    joint: 'The Parties shall share joint physical custody of the minor child(ren).',
    primary_husband: 'Petitioner shall have primary physical custody of the minor child(ren).',
    primary_wife: 'Respondent shall have primary physical custody of the minor child(ren).',
  }
  vars.physical_custody_description = physMap[custody.physical_custody] || ''

  vars.parenting_schedule_description = custody.schedule_description
    || `The Parties shall follow a ${custody.schedule_type.replace(/_/g, ' ')} schedule.`

  vars.holiday_schedule_description = custody.holiday_schedule
    ? JSON.stringify(custody.holiday_schedule)
    : 'The Parties shall alternate major holidays on an annual basis.'

  const decisionMap: Record<string, string> = {
    joint: 'Joint decision',
    husband: 'Petitioner decides',
    wife: 'Respondent decides',
  }
  vars.decision_education = decisionMap[custody.decision_education] || 'Joint decision'
  vars.decision_medical = decisionMap[custody.decision_medical] || 'Joint decision'
  vars.decision_religious = decisionMap[custody.decision_religious] || 'Joint decision'
  vars.decision_extracurricular = decisionMap[custody.decision_extracurricular] || 'Joint decision'

  if (custody.relocation_restriction_miles) {
    vars.relocation_provisions = `Neither Party shall relocate with the child(ren) more than ${custody.relocation_restriction_miles} miles from the current residence without ${custody.relocation_notice_days || 45} days written notice and the consent of the other Party or order of the Court.`
  }

  vars.child_custody_plain_text = `${vars.legal_custody_description} ${vars.physical_custody_description}`
}

function buildChildSupportVars(
  vars: Record<string, string>,
  cs: ProposalChildSupport,
  caseInfo: CaseInfo
): void {
  vars.support_payor_child = cs.payor === 'husband' ? caseInfo.client_name : caseInfo.spouse_name
  vars.support_payee_child = cs.payor === 'husband' ? caseInfo.spouse_name : caseInfo.client_name
  vars.child_support_amount = formatCurrency(cs.proposed_amount)
  vars.guideline_amount = formatCurrency(cs.guideline_amount)

  if (cs.deviation_type !== 'none') {
    vars.child_support_deviation = 'true'
    vars.deviation_direction = cs.deviation_type === 'upward' ? 'an upward' : 'a downward'
    vars.deviation_amount = formatCurrency(Math.abs(cs.proposed_amount - cs.guideline_amount))
    vars.deviation_reason = cs.deviation_reason || '[Reason for deviation]'
  }

  const insuranceMap: Record<string, string> = {
    husband: `Petitioner shall maintain health insurance for the child(ren).`,
    wife: `Respondent shall maintain health insurance for the child(ren).`,
    split: `The Parties shall share the cost of health insurance for the child(ren).`,
  }
  vars.health_insurance_provisions = insuranceMap[cs.health_insurance_provider] || ''

  vars.medical_expense_provisions = `Unreimbursed medical expenses shall be shared ${cs.unreimbursed_medical_split || '50/50'} between the Parties.`

  vars.childcare_provisions = cs.childcare_monthly_cost > 0
    ? `Childcare costs of approximately ${formatCurrency(cs.childcare_monthly_cost)}/month shall be shared ${cs.childcare_split || '50/50'}.`
    : 'No childcare expenses are currently anticipated.'

  if (cs.extracurricular_annual_cap) {
    vars.extracurricular_provisions = `Extracurricular activity expenses up to ${formatCurrency(cs.extracurricular_annual_cap)} annually shall be shared ${cs.extracurricular_split || '50/50'}.`
  }

  if (cs.college_provisions) {
    vars.college_provisions = cs.college_provisions
  }

  vars.child_support_plain_text = `${vars.support_payor_child} pays ${vars.child_support_amount}/month child support.`
}

function buildOtherTermVars(vars: Record<string, string>, terms: ProposalOtherTerm[]): void {
  for (const term of terms) {
    const key = `other_term_${term.category}`
    vars[key] = `${term.term_title}: ${term.term_description || ''}`
  }

  // Tax filing
  const taxTerm = terms.find(t => t.category === 'tax_filing')
  if (taxTerm) {
    vars.tax_filing_status = taxTerm.term_description || 'file separately'
    vars.has_tax_provisions = 'true'
  } else {
    vars.tax_filing_status = 'file separately for the current tax year'
  }

  // Attorney fees
  const feesTerm = terms.find(t => t.category === 'attorney_fees')
  if (feesTerm && feesTerm.amount && feesTerm.amount > 0) {
    vars.attorney_fees_each_own = ''
    vars.attorney_fees_payor = feesTerm.responsible_party === 'husband' ? 'Petitioner' : 'Respondent'
    vars.attorney_fees_payee = feesTerm.responsible_party === 'husband' ? 'Respondent' : 'Petitioner'
    vars.attorney_fees_amount = formatCurrency(feesTerm.amount)
    vars.attorney_fees_deadline = '30'
    vars.attorney_fees_plain_text = `${vars.attorney_fees_payor} pays ${vars.attorney_fees_amount} toward ${vars.attorney_fees_payee}'s fees.`
  }
}

// ============================================================================
// DOCX Generation
// ============================================================================

/**
 * Generate a DOCX settlement agreement from rendered sections
 */
export async function generateSettlementDocx(
  renderedSections: { key: string; title: string; content: string }[],
  caseInfo: CaseInfo
): Promise<Buffer> {
  const children: Paragraph[] = []

  // Court header
  children.push(...generateCourtCaption(caseInfo))

  // Document title
  children.push(
    new Paragraph({
      children: [new TextRun({
        text: 'MARITAL SETTLEMENT AGREEMENT',
        bold: true,
        size: 28,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )

  // Render each section
  for (let i = 0; i < renderedSections.length; i++) {
    const section = renderedSections[i]

    // Section header (except preamble and signatures which flow differently)
    if (section.key !== 'preamble' && section.key !== 'signatures') {
      children.push(new Paragraph({
        children: [new TextRun({
          text: `${romanNumeral(i + 1)}. ${section.title.toUpperCase()}`,
          bold: true,
          size: 24,
        })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      }))
    }

    // Section content - split by paragraphs
    const paragraphs = section.content.split('\n\n')
    for (const para of paragraphs) {
      if (!para.trim()) continue

      // Check if it's a sub-heading (line ending with ':' and followed by content)
      const lines = para.split('\n')
      for (const line of lines) {
        if (!line.trim()) continue

        const isSubHead = line.trim().endsWith(':') && line.trim().length < 60
        children.push(new Paragraph({
          children: [new TextRun({
            text: line.trim(),
            bold: isSubHead,
            size: 22,
          })],
          spacing: { after: isSubHead ? 100 : 150 },
          indent: line.startsWith('  ') ? { left: 360 } : undefined,
        }))
      }
    }

    // Add page break before signatures
    if (i < renderedSections.length - 1 && renderedSections[i + 1].key === 'signatures') {
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  return Buffer.from(buffer)
}

function generateCourtCaption(caseInfo: CaseInfo): Paragraph[] {
  const courtName = caseInfo.court_name || getCourtName(caseInfo.state_code, caseInfo.county)

  return [
    new Paragraph({
      children: [new TextRun({ text: courtName, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'In re the Marriage of:', size: 22 })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${caseInfo.client_name || 'Petitioner'},`, size: 22 }),
      ],
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    }),
    new Paragraph({
      children: [new TextRun({ text: '          Petitioner,', size: 22 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '     vs.', size: 22 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${caseInfo.spouse_name || 'Respondent'},`, size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: '          Respondent.', size: 22 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `Case No.: ${caseInfo.case_number || '___________'}`,
        size: 22,
      })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 400 },
    }),
  ]
}

function getCourtName(stateCode: string, county: string): string {
  const courts: Record<string, string> = {
    CA: `SUPERIOR COURT OF THE STATE OF CALIFORNIA\nCOUNTY OF ${(county || '___________').toUpperCase()}`,
    TX: `IN THE DISTRICT COURT OF ${(county || '___________').toUpperCase()} COUNTY, TEXAS`,
    FL: `IN THE CIRCUIT COURT OF THE JUDICIAL CIRCUIT\nIN AND FOR ${(county || '___________').toUpperCase()} COUNTY, FLORIDA`,
    NY: `SUPREME COURT OF THE STATE OF NEW YORK\nCOUNTY OF ${(county || '___________').toUpperCase()}`,
    IL: `IN THE CIRCUIT COURT OF ${(county || '___________').toUpperCase()} COUNTY, ILLINOIS`,
  }
  return courts[stateCode] || `IN THE COURT OF ${(county || '___________').toUpperCase()} COUNTY`
}

function romanNumeral(n: number): string {
  const numerals: [number, string][] = [
    [13, 'XIII'], [12, 'XII'], [11, 'XI'], [10, 'X'],
    [9, 'IX'], [8, 'VIII'], [7, 'VII'], [6, 'VI'],
    [5, 'V'], [4, 'IV'], [3, 'III'], [2, 'II'], [1, 'I'],
  ]
  for (const [val, numeral] of numerals) {
    if (n === val) return numeral
  }
  return n.toString()
}

// ============================================================================
// Full generation pipeline
// ============================================================================

/**
 * Generate a complete settlement agreement document.
 * 1. Fetches template sections for the state
 * 2. Builds variables from proposal + case info
 * 3. Renders each section
 * 4. Generates DOCX
 */
export async function generateSettlementAgreement(
  proposal: SettlementProposal,
  caseInfo: CaseInfo,
  templateSections: SettlementTemplateSection[],
  selectedSectionKeys?: string[],
  sectionOverrides?: Record<string, string>
): Promise<{
  buffer: Buffer
  renderedSections: { key: string; title: string; content: string }[]
  variables: Record<string, string>
}> {
  // Build variables
  const variables = buildVariables(proposal, caseInfo)

  // Filter to selected sections
  let sections = templateSections
    .filter(s => s.is_active)
    .sort((a, b) => a.section_order - b.section_order)

  if (selectedSectionKeys && selectedSectionKeys.length > 0) {
    sections = sections.filter(s => selectedSectionKeys.includes(s.section_key))
  }

  // Evaluate conditions and render
  const renderedSections: { key: string; title: string; content: string }[] = []

  for (const section of sections) {
    // Check condition
    if (section.condition_field) {
      const val = variables[section.condition_field]
      if (section.condition_value) {
        if (val !== section.condition_value) continue
      } else {
        if (!val || val === 'false' || val === '') continue
      }
    }

    // Use override if provided
    const template = sectionOverrides?.[section.section_key] || section.content_template
    const rendered = renderTemplate(template, variables)

    if (rendered.trim()) {
      renderedSections.push({
        key: section.section_key,
        title: section.section_title,
        content: rendered,
      })
    }
  }

  // Generate DOCX
  const buffer = await generateSettlementDocx(renderedSections, caseInfo)

  return { buffer, renderedSections, variables }
}
