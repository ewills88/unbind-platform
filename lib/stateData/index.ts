import { californiaData } from './california'
import { texasData } from './texas'
import { floridaData } from './florida'
import { StateLawData } from '@/types/stateLaw'

export const STATE_DATA: Record<string, StateLawData> = {
  CA: californiaData,
  TX: texasData,
  FL: floridaData,
}

export function getStateData(stateCode: string): StateLawData | null {
  return STATE_DATA[stateCode.toUpperCase()] || null
}

export function getSupportedStates(): { code: string; name: string }[] {
  return Object.values(STATE_DATA).map((s) => ({ code: s.code, name: s.name }))
}

export { californiaData, texasData, floridaData }
