// Discovery Response Document Generator
// Session 16: Generate Word documents for discovery responses

import {
  Document, Paragraph, TextRun, AlignmentType, PageBreak,
  Packer,
} from 'docx'
import type { DiscoveryItem } from '@/types/discovery'
import { getItemTypeLabel } from '@/types/discovery'

interface CaseInfo {
  case_number: string
  state_code: string
  county: string
  court_name: string
  client_name: string
  spouse_name: string
}

interface GenerateParams {
  discoveryTitle: string
  discoveryType: string
  setNumber: string
  propoundingParty: string
  respondingParty: string
  items: DiscoveryItem[]
  caseInfo: CaseInfo
  includeVerification: boolean
  includeObjections: boolean
  respondingPartyName: string
}

/**
 * Generate a Word document for discovery responses
 */
export async function generateResponseDocument(params: GenerateParams): Promise<Buffer> {
  const {
    discoveryTitle, discoveryType, setNumber,
    propoundingParty, respondingParty,
    items, caseInfo, includeVerification, includeObjections,
    respondingPartyName,
  } = params

  const children: Paragraph[] = []

  // Court header / caption
  children.push(...generateCaption(caseInfo))

  // Document title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${respondingPartyName.toUpperCase()}'S RESPONSES TO`,
          bold: true,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: discoveryTitle.toUpperCase(),
          bold: true,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  )

  // Party info
  if (propoundingParty) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `PROPOUNDING PARTY: ${propoundingParty}`, size: 22 })],
      spacing: { after: 100 },
    }))
  }
  if (respondingParty) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `RESPONDING PARTY: ${respondingParty}`, size: 22 })],
      spacing: { after: 100 },
    }))
  }
  children.push(new Paragraph({
    children: [new TextRun({ text: `SET: ${setNumber}`, size: 22 })],
    spacing: { after: 400 },
  }))

  // Preliminary statement
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'PRELIMINARY STATEMENT', bold: true, size: 22 })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: getPreliminaryStatement(discoveryType, caseInfo.state_code),
        size: 22,
      })],
      spacing: { after: 400 },
    }),
  )

  // RESPONSES header
  children.push(new Paragraph({
    children: [new TextRun({ text: 'RESPONSES', bold: true, size: 22 })],
    spacing: { after: 200 },
  }))

  // Individual item responses
  const itemLabel = getItemTypeLabel(discoveryType as Parameters<typeof getItemTypeLabel>[0])
  for (let i = 0; i < items.length; i++) {
    children.push(...generateItemResponse(items[i], itemLabel, includeObjections, i === items.length - 1))
  }

  // Verification page
  if (includeVerification) {
    children.push(...generateVerification(respondingPartyName, caseInfo.state_code))
  }

  // Signature block
  children.push(...generateSignatureBlock())

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

function generateCaption(caseInfo: CaseInfo): Paragraph[] {
  const courtHeader = caseInfo.court_name
    || getCourtHeader(caseInfo.state_code, caseInfo.county)

  return [
    new Paragraph({
      children: [new TextRun({ text: courtHeader, size: 22 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'In re the Marriage of:', size: 22 })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${caseInfo.client_name || 'Petitioner'},`, size: 22 })],
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
      children: [new TextRun({ text: `Case No.: ${caseInfo.case_number || '___________'}`, size: 22 })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 400 },
    }),
  ]
}

function generateItemResponse(
  item: DiscoveryItem,
  itemLabel: string,
  includeObjections: boolean,
  _isLast: boolean
): Paragraph[] {
  const paras: Paragraph[] = []

  // Request header
  paras.push(new Paragraph({
    children: [new TextRun({
      text: `${itemLabel} NO. ${item.item_number}:`,
      bold: true,
      size: 22,
    })],
    spacing: { before: 300, after: 100 },
  }))

  // Request text
  if (item.request_text) {
    paras.push(new Paragraph({
      children: [new TextRun({ text: item.request_text, size: 22 })],
      spacing: { after: 200 },
    }))
  }

  // Response header
  paras.push(new Paragraph({
    children: [new TextRun({ text: 'RESPONSE:', bold: true, size: 22 })],
    spacing: { after: 100 },
  }))

  // Objection (if any and included)
  if (includeObjections && item.objection_text) {
    paras.push(new Paragraph({
      children: [new TextRun({ text: item.objection_text, size: 22 })],
      spacing: { after: 200 },
    }))

    if (item.response_text) {
      paras.push(new Paragraph({
        children: [new TextRun({
          text: 'Subject to and without waiving the foregoing objections, responding party responds as follows:',
          size: 22,
        })],
        spacing: { after: 100 },
      }))
    }
  }

  // Response text
  if (item.response_text) {
    paras.push(new Paragraph({
      children: [new TextRun({ text: item.response_text, size: 22 })],
      spacing: { after: 300 },
    }))
  } else {
    paras.push(new Paragraph({
      children: [new TextRun({ text: '[RESPONSE PENDING]', italics: true, size: 22 })],
      spacing: { after: 300 },
    }))
  }

  return paras
}

function generateVerification(respondingPartyName: string, stateCode: string): Paragraph[] {
  const text = getVerificationText(stateCode).replace(/\{\{PARTY_NAME\}\}/g, respondingPartyName)

  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      children: [new TextRun({ text: 'VERIFICATION', bold: true, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text, size: 22 })],
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Dated: ____________________', size: 22 })],
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '_________________________________', size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: respondingPartyName, size: 22 })],
    }),
  ]
}

function generateSignatureBlock(): Paragraph[] {
  return [
    new Paragraph({
      children: [new TextRun({ text: 'Respectfully submitted,', size: 22 })],
      spacing: { before: 600, after: 600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '_________________________________', size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Attorney for Responding Party', size: 22 })],
    }),
  ]
}

function getCourtHeader(stateCode: string, county: string): string {
  const courts: Record<string, string> = {
    CA: `SUPERIOR COURT OF THE STATE OF CALIFORNIA\nCOUNTY OF ${(county || '___________').toUpperCase()}`,
    TX: `IN THE DISTRICT COURT OF ${(county || '___________').toUpperCase()} COUNTY, TEXAS`,
    FL: `IN THE CIRCUIT COURT OF THE ${(county || '___________').toUpperCase()} JUDICIAL CIRCUIT\nIN AND FOR ${(county || '___________').toUpperCase()} COUNTY, FLORIDA`,
    NY: `SUPREME COURT OF THE STATE OF NEW YORK\nCOUNTY OF ${(county || '___________').toUpperCase()}`,
    IL: `IN THE CIRCUIT COURT OF ${(county || '___________').toUpperCase()} COUNTY, ILLINOIS`,
  }
  return courts[stateCode] || `IN THE COURT OF ${(county || '___________').toUpperCase()} COUNTY`
}

function getPreliminaryStatement(discoveryType: string, stateCode: string): string {
  const typeName = discoveryType === 'rfp'
    ? 'the Request for Production of Documents'
    : discoveryType === 'rfa'
    ? 'the Request for Admissions'
    : 'the Interrogatories'

  if (stateCode === 'CA') {
    return `Responding party hereby responds to ${typeName}, propounded by propounding party, as follows. These responses are made based upon information presently known to responding party and responding party's counsel, and responding party reserves the right to supplement or amend these responses as additional information becomes available.`
  }

  if (stateCode === 'TX') {
    return `Responding party hereby responds to ${typeName} as follows. These responses are based on information currently available, and responding party reserves the right to supplement these responses as additional information becomes known.`
  }

  return `Responding party hereby responds to the discovery propounded by propounding party as follows. These responses are based on information currently available and responding party reserves the right to supplement these responses.`
}

function getVerificationText(stateCode: string): string {
  if (stateCode === 'CA') {
    return `I, {{PARTY_NAME}}, am the responding party in the above-entitled action. I have read the foregoing responses and know the contents thereof. The facts stated therein are true of my own knowledge, except as to those matters stated on information and belief, and as to those matters, I believe them to be true.\n\nI declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.`
  }

  if (stateCode === 'TX') {
    return `Before me, the undersigned notary public, on this day personally appeared {{PARTY_NAME}}, who being by me duly sworn, upon oath, stated that the facts stated in the foregoing discovery responses are true and correct.`
  }

  if (stateCode === 'FL') {
    return `Under penalties of perjury, I declare that I have read the foregoing responses and that the facts stated in them are true, except as to those matters stated on information and belief, and as to those matters I believe them to be true.\n\n{{PARTY_NAME}}`
  }

  return `I, {{PARTY_NAME}}, declare under penalty of perjury that the foregoing answers are true and correct to the best of my knowledge.`
}
