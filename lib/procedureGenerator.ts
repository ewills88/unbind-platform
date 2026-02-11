import { ProcedureTemplate, ProcedureType, KeyDates } from '@/types/procedures'

/**
 * Generates a full procedure checklist for a case based on state-specific rules.
 * Pure function — returns task templates with calculated due dates.
 */
export function generateProcedureChecklist(
  stateCode: string,
  filingDate: string,
  hasChildren: boolean
): { tasks: GeneratedTask[]; keyDates: KeyDates; estimatedCompletionDate: string } {
  const filing = new Date(filingDate)
  const keyDates = calculateKeyDates(filing, stateCode, hasChildren)
  const templates = getStateTemplates(stateCode, hasChildren)

  const tasks: GeneratedTask[] = templates.map((t, idx) => ({
    task_order: idx + 1,
    task_name: t.name,
    task_description: t.description,
    required_documents: t.required_documents,
    estimated_duration_days: t.estimated_days,
    default_assignee: t.default_assignee,
    state_statute_reference: t.statute,
    dependencies: t.dependencies,
    procedure_type: t.procedure_type,
    due_date: resolveDueDate(t, keyDates, filing),
  }))

  return {
    tasks,
    keyDates,
    estimatedCompletionDate: keyDates.estimated_final_judgment,
  }
}

export interface GeneratedTask {
  task_order: number
  task_name: string
  task_description: string
  required_documents: string[]
  estimated_duration_days: number
  default_assignee: 'attorney' | 'paralegal' | 'client'
  state_statute_reference: string | null
  dependencies: string[]
  procedure_type: ProcedureType
  due_date: string
}

// ─── Key Dates Calculator ───────────────────────────────────────

function calculateKeyDates(filing: Date, stateCode: string, hasChildren: boolean): KeyDates {
  const dates: KeyDates = {
    filing_date: fmt(filing),
    service_deadline: '',
    response_deadline: '',
    earliest_judgment: '',
    estimated_final_judgment: '',
  }

  switch (stateCode) {
    case 'CA':
      dates.service_deadline = fmt(addDays(filing, 60))
      dates.response_deadline = fmt(addDays(filing, 90))    // 60 + 30
      dates.earliest_judgment = fmt(addDays(filing, 181 + 1)) // 6 months from service + 1 day
      dates.preliminary_disclosure_deadline = fmt(addDays(filing, 60))
      dates.estimated_final_judgment = fmt(addDays(filing, 240)) // ~8 months
      break
    case 'TX':
      dates.service_deadline = fmt(addDays(filing, 90))
      dates.response_deadline = fmt(addDays(filing, 113))    // 90 + 23
      dates.earliest_judgment = fmt(addDays(filing, 60))
      dates.inventory_deadline = fmt(addDays(filing, 60))
      dates.estimated_final_judgment = fmt(addDays(filing, 180)) // ~6 months
      break
    case 'FL':
      dates.service_deadline = fmt(addDays(filing, 120))
      dates.response_deadline = fmt(addDays(filing, 140))    // 120 + 20
      dates.earliest_judgment = fmt(addDays(filing, 140))    // 120 + 20 days
      dates.mandatory_disclosure_deadline = fmt(addDays(filing, 45))
      dates.mediation_deadline = fmt(addDays(filing, 90))
      if (hasChildren) {
        dates.parenting_course_deadline = fmt(addDays(filing, 90))
      }
      dates.estimated_final_judgment = fmt(addDays(filing, 150)) // ~5 months
      break
  }

  return dates
}

function resolveDueDate(template: ProcedureTemplate, keyDates: KeyDates, filing: Date): string {
  // Match task name to a sensible deadline from keyDates
  const name = template.name.toLowerCase()

  if (name.includes('file petition') || name.includes('file original')) return keyDates.filing_date
  if (name.includes('serve respondent') || name.includes('serve citation')) return keyDates.service_deadline
  if (name.includes('proof of service') || name.includes('return of service')) {
    return fmt(addDays(new Date(keyDates.service_deadline), 10))
  }
  if (name.includes('disclosure') || name.includes('mandatory disclosure')) {
    return keyDates.preliminary_disclosure_deadline || keyDates.mandatory_disclosure_deadline || fmt(addDays(filing, 60))
  }
  if (name.includes('inventory')) return keyDates.inventory_deadline || fmt(addDays(filing, 60))
  if (name.includes('mediation')) return keyDates.mediation_deadline || fmt(addDays(filing, 90))
  if (name.includes('parenting course')) return keyDates.parenting_course_deadline || fmt(addDays(filing, 90))
  if (name.includes('negotiate') || name.includes('settlement')) {
    return fmt(addDays(new Date(keyDates.earliest_judgment), -14))
  }
  if (name.includes('judgment package') || name.includes('prepare judgment') || name.includes('final hearing')) {
    return keyDates.earliest_judgment
  }
  if (name.includes('file judgment') || name.includes('file signed') || name.includes('file final')) {
    return fmt(addDays(new Date(keyDates.earliest_judgment), 7))
  }

  // Default: estimated completion
  return keyDates.estimated_final_judgment
}

// ─── State Templates ────────────────────────────────────────────

function getStateTemplates(stateCode: string, hasChildren: boolean): ProcedureTemplate[] {
  switch (stateCode) {
    case 'CA': return getCATemplates()
    case 'TX': return getTXTemplates()
    case 'FL': return getFLTemplates(hasChildren)
    default: return getCATemplates() // Fallback
  }
}

function getCATemplates(): ProcedureTemplate[] {
  return [
    {
      name: 'File Petition and Summons',
      description: 'File FL-100 (Petition) and FL-110 (Summons) with Superior Court. Pay filing fee ($435). Obtain case number and file-stamped copies.',
      required_documents: ['FL-100', 'FL-110'],
      estimated_days: 1,
      default_assignee: 'attorney',
      statute: 'CCP § 412.20',
      dependencies: [],
      procedure_type: 'filing',
    },
    {
      name: 'Serve Respondent',
      description: 'Have Respondent personally served with petition, summons, and blank response forms. Must be served within 60 days of filing. Cannot serve yourself.',
      required_documents: ['FL-100', 'FL-110', 'FL-120'],
      estimated_days: 14,
      default_assignee: 'attorney',
      statute: 'CCP § 415.10',
      dependencies: ['File Petition and Summons'],
      procedure_type: 'service',
    },
    {
      name: 'File Proof of Service',
      description: 'After Respondent served, file FL-115 (Proof of Service) with the court within 10 days of service.',
      required_documents: ['FL-115'],
      estimated_days: 3,
      default_assignee: 'paralegal',
      statute: 'CCP § 417.10',
      dependencies: ['Serve Respondent'],
      procedure_type: 'service',
    },
    {
      name: 'Serve Preliminary Declaration of Disclosure',
      description: 'Serve FL-140, FL-142, FL-150 and supporting income/expense documents on Respondent. File FL-141 (Declaration re Service) with court. Due within 60 days of filing.',
      required_documents: ['FL-140', 'FL-141', 'FL-142', 'FL-150'],
      estimated_days: 7,
      default_assignee: 'attorney',
      statute: 'Fam. Code § 2104',
      dependencies: ['File Proof of Service'],
      procedure_type: 'discovery',
    },
    {
      name: 'Negotiate Settlement or Prepare for Trial',
      description: 'Work with opposing counsel to reach settlement on all issues: custody, support, property division. If no agreement, prepare for trial. Attempt mediation if ordered.',
      required_documents: [],
      estimated_days: 120,
      default_assignee: 'attorney',
      statute: null,
      dependencies: ['Serve Preliminary Declaration of Disclosure'],
      procedure_type: 'settlement',
    },
    {
      name: 'Serve Final Declaration of Disclosure',
      description: 'Serve FL-140, updated FL-142, FL-150 on Respondent at least 45 days before trial. Can be waived by stipulation in uncontested cases.',
      required_documents: ['FL-140', 'FL-142', 'FL-150'],
      estimated_days: 7,
      default_assignee: 'attorney',
      statute: 'Fam. Code § 2105',
      dependencies: ['Negotiate Settlement or Prepare for Trial'],
      procedure_type: 'discovery',
    },
    {
      name: 'Prepare Judgment Package',
      description: 'Prepare FL-180 (Judgment), FL-190 (Notice of Entry of Judgment), and applicable attachments. Earliest judgment date is 6 months + 1 day from service.',
      required_documents: ['FL-180', 'FL-190'],
      estimated_days: 7,
      default_assignee: 'attorney',
      statute: 'Fam. Code § 2337',
      dependencies: ['Serve Final Declaration of Disclosure'],
      procedure_type: 'judgment',
    },
    {
      name: 'File Judgment with Court',
      description: 'Submit judgment package to court for judge signature. Serve Notice of Entry on Respondent after judgment entered. Case finalized.',
      required_documents: ['FL-180', 'FL-190'],
      estimated_days: 3,
      default_assignee: 'paralegal',
      statute: 'Fam. Code § 2346',
      dependencies: ['Prepare Judgment Package'],
      procedure_type: 'judgment',
    },
  ]
}

function getTXTemplates(): ProcedureTemplate[] {
  return [
    {
      name: 'File Original Petition for Divorce',
      description: 'File Original Petition with District Court. Pay filing fee (~$300-$350 depending on county). Obtain cause number and file-stamped copies.',
      required_documents: ['Original Petition for Divorce'],
      estimated_days: 1,
      default_assignee: 'attorney',
      statute: 'Tex. Fam. Code § 6.301',
      dependencies: [],
      procedure_type: 'filing',
    },
    {
      name: 'Serve Respondent with Citation',
      description: 'Have Respondent personally served with citation and petition by constable, sheriff, or private process server. Waiver of service possible if agreed.',
      required_documents: ['Citation', 'Original Petition'],
      estimated_days: 14,
      default_assignee: 'attorney',
      statute: 'Tex. R. Civ. P. 106',
      dependencies: ['File Original Petition for Divorce'],
      procedure_type: 'service',
    },
    {
      name: 'File Return of Service',
      description: 'After service completed, ensure return of service filed with court showing proof of proper service on Respondent.',
      required_documents: ['Return of Service'],
      estimated_days: 3,
      default_assignee: 'paralegal',
      statute: 'Tex. R. Civ. P. 107',
      dependencies: ['Serve Respondent with Citation'],
      procedure_type: 'service',
    },
    {
      name: 'Exchange Inventory & Appraisement',
      description: 'Prepare and exchange Inventory and Appraisement listing all community and separate property, assets, and liabilities with supporting documentation.',
      required_documents: ['Inventory and Appraisement'],
      estimated_days: 30,
      default_assignee: 'attorney',
      statute: 'Tex. Fam. Code § 6.706',
      dependencies: ['File Return of Service'],
      procedure_type: 'discovery',
    },
    {
      name: 'Negotiate Settlement',
      description: 'Work toward Mediated Settlement Agreement (MSA) on property division, conservatorship, and support. TX courts often order mediation before trial.',
      required_documents: ['Mediated Settlement Agreement'],
      estimated_days: 90,
      default_assignee: 'attorney',
      statute: 'Tex. Civ. Prac. & Rem. Code § 154.071',
      dependencies: ['Exchange Inventory & Appraisement'],
      procedure_type: 'settlement',
    },
    {
      name: 'Prepare Final Decree of Divorce',
      description: 'Draft Final Decree incorporating all agreements. Includes property division, conservatorship orders, child support, and spousal maintenance. Earliest: 60 days from filing.',
      required_documents: ['Final Decree of Divorce'],
      estimated_days: 7,
      default_assignee: 'attorney',
      statute: 'Tex. Fam. Code § 6.702',
      dependencies: ['Negotiate Settlement'],
      procedure_type: 'judgment',
    },
    {
      name: 'Attend Final Hearing',
      description: 'Appear at final hearing (prove-up). Present Final Decree to judge for signature. Can be brief for uncontested cases.',
      required_documents: ['Final Decree of Divorce'],
      estimated_days: 1,
      default_assignee: 'attorney',
      statute: 'Tex. Fam. Code § 6.701',
      dependencies: ['Prepare Final Decree of Divorce'],
      procedure_type: 'trial',
    },
    {
      name: 'File Signed Final Decree',
      description: 'Obtain signed Final Decree from court. File certified copies. Transfer titles, update beneficiaries, implement support orders.',
      required_documents: ['Final Decree of Divorce'],
      estimated_days: 3,
      default_assignee: 'paralegal',
      statute: 'Tex. Fam. Code § 6.7041',
      dependencies: ['Attend Final Hearing'],
      procedure_type: 'judgment',
    },
  ]
}

function getFLTemplates(hasChildren: boolean): ProcedureTemplate[] {
  const tasks: ProcedureTemplate[] = [
    {
      name: 'File Petition for Dissolution',
      description: 'File Petition for Dissolution (Form 12.901(a) or (b)) with Circuit Court. Pay filing fee (~$409). Obtain case number.',
      required_documents: ['12.901(a)'],
      estimated_days: 1,
      default_assignee: 'attorney',
      statute: 'Fla. Fam. L.R.P. 12.105',
      dependencies: [],
      procedure_type: 'filing',
    },
    {
      name: 'Serve Respondent',
      description: 'Have Respondent personally served with petition and summons by sheriff or private process server. Respondent has 20 days to respond.',
      required_documents: ['12.901(a)', 'Summons'],
      estimated_days: 14,
      default_assignee: 'attorney',
      statute: 'Fla. R. Civ. P. 1.070',
      dependencies: ['File Petition for Dissolution'],
      procedure_type: 'service',
    },
    {
      name: 'File Mandatory Disclosure',
      description: 'Serve Financial Affidavit (12.902(b) under $50K or 12.902(c) over $50K) and supporting documents. File Certificate of Compliance (12.932) with court within 45 days.',
      required_documents: ['12.902(b)', '12.902(c)', '12.932'],
      estimated_days: 7,
      default_assignee: 'attorney',
      statute: 'Fla. Fam. L.R.P. 12.285',
      dependencies: ['File Petition for Dissolution'],
      procedure_type: 'discovery',
    },
  ]

  if (hasChildren) {
    tasks.push({
      name: 'Complete Parenting Course',
      description: 'Both parties must complete Parent Education and Family Stabilization Course (4 hours). File certificates of completion with court before final hearing.',
      required_documents: ['Certificate of Completion'],
      estimated_days: 30,
      default_assignee: 'client',
      statute: 'Fla. Stat. § 61.21',
      dependencies: ['File Petition for Dissolution'],
      procedure_type: 'discovery',
    })
  }

  tasks.push(
    {
      name: 'Attend Mediation',
      description: 'Participate in court-ordered mediation to attempt settlement on all contested issues. File mediation report indicating full/partial agreement or impasse.',
      required_documents: [],
      estimated_days: 1,
      default_assignee: 'attorney',
      statute: 'Fla. Stat. § 44.102',
      dependencies: ['File Mandatory Disclosure'],
      procedure_type: 'settlement',
    },
    {
      name: 'Prepare Settlement Agreement and Parenting Plan',
      description: `Prepare Marital Settlement Agreement (12.902(f)(1) or (2))${hasChildren ? ' and Parenting Plan (12.995(a))' : ''}. Both parties must sign before notary.`,
      required_documents: hasChildren ? ['12.902(f)(1)', '12.995(a)'] : ['12.902(f)(1)'],
      estimated_days: 14,
      default_assignee: 'attorney',
      statute: 'Fla. Stat. § 61.13',
      dependencies: ['Attend Mediation'],
      procedure_type: 'settlement',
    },
    {
      name: 'Attend Final Hearing',
      description: 'Appear at uncontested final hearing (typically 15-20 minutes). Present Final Judgment to judge for approval. Minimum 20 days after service.',
      required_documents: ['12.990(a)'],
      estimated_days: 1,
      default_assignee: 'attorney',
      statute: 'Fla. Fam. L.R.P. 12.440',
      dependencies: ['Prepare Settlement Agreement and Parenting Plan'],
      procedure_type: 'trial',
    },
    {
      name: 'File Final Judgment',
      description: 'Obtain signed Final Judgment from court. File certified copies. Divorce effective immediately; remarriage allowed after 30 days.',
      required_documents: ['12.990(a)'],
      estimated_days: 3,
      default_assignee: 'paralegal',
      statute: 'Fla. Stat. § 61.19',
      dependencies: ['Attend Final Hearing'],
      procedure_type: 'judgment',
    }
  )

  return tasks
}

// ─── Helpers ────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function fmt(date: Date): string {
  return date.toISOString().split('T')[0]
}
