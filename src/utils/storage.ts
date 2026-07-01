import type { RoofPlane } from '../types'

const KEY = 'cserepeslemez_planes'
const OVERSIZE_KEY = 'cserepeslemez_allow_oversize'

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
