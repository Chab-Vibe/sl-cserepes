import type { RoofPlane, ColumnResult, PlaneResult, OrderGroup } from '../types'

export const SHEET = {
  MODULE_M: 0.350,
  NOSE_M: 0.050,
  TOTAL_WIDTH_M: 1.1,
  EFFECTIVE_WIDTH_M: 1.0,
} as const

// Y values of the polygon boundary at a given x (scanline)
function yValuesAtX(points: [number, number][], x: number): number[] {
  const ys: number[] = []
  const n = points.length
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % n]
    if (x1 === x2) {
      if (Math.abs(x1 - x) < 1e-9) { ys.push(y1, y2) }
    } else {
      const tMin = Math.min(x1, x2)
      const tMax = Math.max(x1, x2)
      if (x >= tMin - 1e-9 && x <= tMax + 1e-9) {
        const t = (x - x1) / (x2 - x1)
        ys.push(y1 + t * (y2 - y1))
      }
    }
  }
  return ys
}

// Max polygon height within a 1m-wide column
function maxHeightInColumn(points: [number, number][], colX1: number, colX2: number): number {
  if (points.length < 3) return 0
  let maxY = 0
  const SAMPLES = 24
  for (let i = 0; i <= SAMPLES; i++) {
    const x = colX1 + (colX2 - colX1) * (i / SAMPLES)
    const ys = yValuesAtX(points, x)
    if (ys.length > 0) maxY = Math.max(maxY, ...ys)
  }
  // Also check vertices within the column range
  for (const [px, py] of points) {
    if (px >= colX1 - 1e-9 && px <= colX2 + 1e-9) maxY = Math.max(maxY, py)
  }
  return maxY
}

function columnToSheetLength(colHeightM: number, eaveOverhangM: number): { modules: number; lengthM: number } {
  if (colHeightM <= 0) return { modules: 0, lengthM: 0 }
  // Y=0 a csurgó tövénél van, ezért a moduloknak csak a csurgó és orr közötti
  // nettó részt kell lefedniük: height − csurgó − orr.
  const netH = Math.max(0, colHeightM - eaveOverhangM - SHEET.NOSE_M)
  let modules = Math.ceil(netH / SHEET.MODULE_M)
  if (modules < 1) modules = 1
  // Ha a nettó magasság pontosan modulhatárra esik, a vágás éppen a modulcsíkra
  // kerülne → +1 modul (legalább 5 cm plus biztosítása).
  const remainder = netH % SHEET.MODULE_M
  if (remainder < 1e-6) modules += 1
  const lengthM = Math.round((SHEET.NOSE_M + modules * SHEET.MODULE_M + eaveOverhangM) * 1000) / 1000
  return { modules, lengthM }
}

export function polyWidth(points: [number, number][]): number {
  if (points.length === 0) return 0
  return Math.max(...points.map(p => p[0]))
}

export function polyHeight(points: [number, number][]): number {
  if (points.length === 0) return 0
  return Math.max(...points.map(p => p[1]))
}

export function getStartOffset(plane: RoofPlane): number {
  const width = polyWidth(plane.points)
  if (width <= 0) return 0
  const numCols = Math.ceil(width / SHEET.EFFECTIVE_WIDTH_M)
  const totalSheetWidth = numCols * SHEET.EFFECTIVE_WIDTH_M
  const overhang = totalSheetWidth - width
  if (plane.alignment === 'right') return -overhang
  if (plane.alignment === 'center') return -overhang / 2
  return 0  // left
}

export function calculatePlane(plane: RoofPlane): PlaneResult {
  const width = polyWidth(plane.points)
  const numCols = Math.ceil(width / SHEET.EFFECTIVE_WIDTH_M)
  const startX = getStartOffset(plane)
  const columns: ColumnResult[] = []

  for (let i = 0; i < numCols; i++) {
    const sheetX1 = startX + i * SHEET.EFFECTIVE_WIDTH_M
    const sheetX2 = sheetX1 + SHEET.EFFECTIVE_WIDTH_M
    // Intersect with polygon extent
    const polyX1 = Math.max(0, sheetX1)
    const polyX2 = Math.min(width, sheetX2)
    const colH = polyX2 > polyX1 ? maxHeightInColumn(plane.points, polyX1, polyX2) : 0
    const { modules, lengthM } = columnToSheetLength(colH, plane.eaveOverhangM)
    if (lengthM > 0) columns.push({ index: i, heightM: colH, modules, sheetLengthM: lengthM })
  }

  return {
    planeId: plane.id,
    planeName: plane.name,
    columns,
    totalSheets: columns.length,
  }
}

export function groupByLength(results: PlaneResult[]): OrderGroup[] {
  const map = new Map<number, OrderGroup>()
  for (const r of results) {
    for (const col of r.columns) {
      const key = col.sheetLengthM
      const existing = map.get(key)
      if (existing) {
        existing.totalSheets++
        if (!existing.planeNames.includes(r.planeName)) existing.planeNames.push(r.planeName)
      } else {
        map.set(key, { lengthM: key, totalSheets: 1, planeNames: [r.planeName] })
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.lengthM - b.lengthM)
}

export function totalSheets(groups: OrderGroup[]): number {
  return groups.reduce((s, g) => s + g.totalSheets, 0)
}

export function isPlaneValid(plane: RoofPlane): boolean {
  return plane.points.length >= 3
}
