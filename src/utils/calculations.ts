import type { RoofPlane, ColumnResult, PlaneResult, OrderGroup, SheetSegment } from '../types'

export const SHEET = {
  MODULE_M: 0.350,
  NOSE_M: 0.050,
  TOTAL_WIDTH_M: 1.1,
  EFFECTIVE_WIDTH_M: 1.0,
  // BILKA Modul_35 rendszer: minden modulszámhoz tartozik egy rövidíthető
  // (-3 cm-ig) és egy nyújtható (+25 cm-ig) tartomány, hogy a lemez pontosan
  // a szükséges méretre álljon anyagpazarlás (extra modul) nélkül.
  MODULE_SHORT_M: 0.03,
  MODULE_LONG_M: 0.25,
  // 6 méter fölött a lemez csak felhasználói jóváhagyással gyártható egyben;
  // egyébként a rendszer toldja, MODULE-határon vágva, fix átfedéssel.
  MAX_SINGLE_LENGTH_M: 6.0,
  OVERLAP_M: 0.12,
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

// Adott nettó (csak modulokkal lefedendő) magassághoz megkeresi a minimális
// modulszámot és a tényleges modulhosszt a BILKA rövid/hosszú modul
// rugalmasság alapján (lásd Bilka-Module-07-01-2026_09_41_PM.png, Modul_35 fül,
// 1. oszlop = rövid modul minimum, 4. oszlop = teljes modul).
function resolveModules(netH: number): { modules: number; moduleLenM: number } {
  if (netH <= 0) return { modules: 0, moduleLenM: 0 }
  let n = Math.max(1, Math.ceil((netH - SHEET.MODULE_LONG_M) / SHEET.MODULE_M))
  while (n * SHEET.MODULE_M + SHEET.MODULE_LONG_M < netH - 1e-9) n++
  const shortMinM = n * SHEET.MODULE_M - SHEET.MODULE_SHORT_M
  const moduleLenM = Math.max(netH, shortMinM)
  return { modules: n, moduleLenM: Math.round(moduleLenM * 1000) / 1000 }
}

// Egy oszlop teljes szükséges lefedési hosszából (orr + modulok + csurgó)
// legyártható szegmenseket épít fel. Ha a teljes hossz 6 m alatt van, vagy a
// felhasználó engedélyezte az egybefüggő lemezt, egyetlen szegmenst ad vissza.
// Egyébként a lemezt modulhatáron vágja: az első (csurgóhoz legközelebbi)
// darab a lehető legtöbb teljes modult tartalmazza 6 m-en belül, a
// következő darab(ok) OVERLAP_M-mel ráépülnek, és az utolsó darab a BILKA
// rugalmassággal pontosan a maradék magasságra illeszkedik.
function buildSegments(netH: number, eaveOverhangM: number, allowOversize: boolean): SheetSegment[] {
  if (netH <= 0) return []

  const { modules: totalModules, moduleLenM: totalModuleLenM } = resolveModules(netH)
  const totalLenM = Math.round((SHEET.NOSE_M + totalModuleLenM + eaveOverhangM) * 1000) / 1000

  if (allowOversize || totalLenM <= SHEET.MAX_SINGLE_LENGTH_M) {
    return [{ order: 0, modules: totalModules, lengthM: totalLenM, startM: 0, endM: totalLenM }]
  }

  const segments: SheetSegment[] = []
  let remainingNetH = netH
  let cursorM = 0
  let order = 0

  while (true) {
    const base = order === 0 ? eaveOverhangM : SHEET.OVERLAP_M
    const { modules: neededModules, moduleLenM: neededLenM } = resolveModules(remainingNetH)
    const finishLenM = Math.round((base + neededLenM + SHEET.NOSE_M) * 1000) / 1000

    if (finishLenM <= SHEET.MAX_SINGLE_LENGTH_M + 1e-9) {
      segments.push({ order, modules: neededModules, lengthM: finishLenM, startM: cursorM, endM: cursorM + finishLenM })
      break
    }

    // Nem fér ki egyben: ezt a darabot a lehető legtöbb teljes modullal
    // töltjük fel a 6 m-es határon belül (orr nélkül, hisz nem itt végződik).
    const maxModulesInCap = Math.floor((SHEET.MAX_SINGLE_LENGTH_M - base) / SHEET.MODULE_M)
    const n = Math.max(1, maxModulesInCap)
    const lenM = Math.round((base + n * SHEET.MODULE_M) * 1000) / 1000
    segments.push({ order, modules: n, lengthM: lenM, startM: cursorM, endM: cursorM + lenM })

    remainingNetH -= n * SHEET.MODULE_M
    cursorM = cursorM + lenM - SHEET.OVERLAP_M
    order++
  }

  return segments
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

export function calculatePlane(plane: RoofPlane, allowOversize = false): PlaneResult {
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
    if (colH <= 0) continue
    // Y=0 a csurgó tövénél van, ezért a moduloknak csak a csurgó és orr
    // közötti nettó részt kell lefedniük.
    const netH = Math.max(0, colH - plane.eaveOverhangM - SHEET.NOSE_M)
    const segments = buildSegments(netH, plane.eaveOverhangM, allowOversize)
    if (segments.length > 0) {
      columns.push({ index: i, heightM: colH, segments, isSplit: segments.length > 1 })
    }
  }

  return {
    planeId: plane.id,
    planeName: plane.name,
    columns,
    totalSheets: columns.reduce((s, c) => s + c.segments.length, 0),
  }
}

export function groupByLength(results: PlaneResult[]): OrderGroup[] {
  const map = new Map<number, OrderGroup>()
  for (const r of results) {
    for (const col of r.columns) {
      for (const seg of col.segments) {
        const key = seg.lengthM
        const existing = map.get(key)
        if (existing) {
          existing.totalSheets++
          if (!existing.planeNames.includes(r.planeName)) existing.planeNames.push(r.planeName)
        } else {
          map.set(key, { lengthM: key, totalSheets: 1, planeNames: [r.planeName] })
        }
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
