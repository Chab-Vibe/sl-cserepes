import type { RoofPlane, SheetTypeId } from '../types'
import { DEFAULT_SHEET_TYPE, SHEET_PROFILES } from './calculations'

const KEY = 'cserepeslemez_planes'
const OVERSIZE_KEY = 'cserepeslemez_allow_oversize'
const SHEET_TYPE_KEY = 'cserepeslemez_sheet_type'

export function loadPlanes(): RoofPlane[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function savePlanes(planes: RoofPlane[]): void {
  localStorage.setItem(KEY, JSON.stringify(planes))
}

export function loadAllowOversize(): boolean {
  return localStorage.getItem(OVERSIZE_KEY) === '1'
}

export function saveAllowOversize(value: boolean): void {
  localStorage.setItem(OVERSIZE_KEY, value ? '1' : '0')
}

export function loadSheetType(): SheetTypeId {
  const raw = localStorage.getItem(SHEET_TYPE_KEY)
  return raw && raw in SHEET_PROFILES ? (raw as SheetTypeId) : DEFAULT_SHEET_TYPE
}

export function saveSheetType(value: SheetTypeId): void {
  localStorage.setItem(SHEET_TYPE_KEY, value)
}
