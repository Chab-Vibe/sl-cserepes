import type { RoofPlane } from '../types'

const KEY = 'cserepeslemez_planes'

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
