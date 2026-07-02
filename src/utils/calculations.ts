import type { RoofPlane, ColumnResult, PlaneResult, OrderGroup, SheetSegment } from '../types'

export const SHEET = {
  MODULE_M: 0.350,
  NOSE_M: 0.050,
  TOTAL_WIDTH_M: 1.1,
  EFFECTIVE_WIDTH_M: 1.0,
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

// Polygon min/max Y within a 1m-wide column strip.
// A minimum is kell: ha a sokszög alja átlósan emelkedik (lentről felfelé
// csökkenő sík), a lemez alja is feljebb kerül, modulrácsra lépcsőzve.
function columnExtent(points: [number, number][], colX1: number, colX2: number): { minY: number; maxY: number } | null {
  if (points.length < 3) return null
  let minY = Infinity
  let maxY = -Infinity
  const SAMPLES = 24
  for (let i = 0; i <= SAMPLES; i++) {
    const x = colX1 + (colX2 - colX1) * (i / SAMPLES)
    const ys = yValuesAtX(points, x)
    if (ys.length > 0) {
      minY = Math.min(minY, ...ys)
      maxY = Math.max(maxY, ...ys)
    }
  }
  // Also check vertices within the column range
  for (const [px, py] of points) {
    if (px >= colX1 - 1e-9 && px <= colX2 + 1e-9) {
      minY = Math.min(minY, py)
      maxY = Math.max(maxY, py)
    }
  }
  if (!isFinite(maxY) || maxY <= 0) return null
  return { minY: Math.max(0, minY), maxY }
}

const r3 = (x: number) => Math.round(x * 1000) / 1000

// Nettó magassághoz szükséges egész modulszám (felfelé lépcsőzve).
// Ha a magasság pontosan modulhatárra esik, +1 modul (5 cm védőzóna elve).
function moduleCount(netH: number): number {
  const ratio = netH / SHEET.MODULE_M
  let n = Math.ceil(ratio - 1e-9)
  if (Math.abs(ratio - Math.round(ratio)) < 1e-6) n = Math.round(ratio) + 1
  return Math.max(1, n)
}

// Emelt aljú oszlopnál hány teljes modullal kezdődhet feljebb a lemez:
// a sokszög legalsó pontja ALATTI modulhatárra igazít (lefelé lépcsőzve).
// Pontos határra esésnél egy modullal lejjebb (itt is védőzóna).
function moduleFloor(relH: number): number {
  const ratio = relH / SHEET.MODULE_M
  let n = Math.floor(ratio + 1e-9)
  if (Math.abs(ratio - Math.round(ratio)) < 1e-6) n = Math.round(ratio) - 1
  return Math.max(0, n)
}

// Adott modulszámú lemezoszlopból legyártható szegmenseket épít fel.
// bottomExtraM: a legalsó darab alsó ráhagyása (csurgó az eresznél, 0 emelt aljnál),
// startYM: a lemez aljának Y pozíciója a síkon (0 az eresznél, modulrács-vonal emelt aljnál).
// Ha a teljes hossz 6 m alatt van, vagy a felhasználó engedélyezte az egybefüggő
// lemezt, egyetlen szegmenst ad vissza. Egyébként modulhatáron vágva toldja,
// a darabok OVERLAP_M átfedéssel épülnek egymásra, az orr a legfelső darabon van.
function buildSegments(totalModules: number, bottomExtraM: number, startYM: number, allowOversize: boolean): SheetSegment[] {
  if (totalModules <= 0) return []

  const totalLenM = r3(bottomExtraM + totalModules * SHEET.MODULE_M + SHEET.NOSE_M)

  if (allowOversize || totalLenM <= SHEET.MAX_SINGLE_LENGTH_M + 1e-9) {
    return [{ order: 0, modules: totalModules, lengthM: totalLenM, startM: r3(startYM), endM: r3(startYM + totalLenM) }]
  }

  const segments: SheetSegment[] = []
  let remaining = totalModules
  let cursorM = startYM
  let order = 0

  while (true) {
    const base = order === 0 ? bottomExtraM : SHEET.OVERLAP_M
    const finishLenM = r3(base + remaining * SHEET.MODULE_M + SHEET.NOSE_M)

    if (finishLenM <= SHEET.MAX_SINGLE_LENGTH_M + 1e-9) {
      segments.push({ order, modules: remaining, lengthM: finishLenM, startM: r3(cursorM), endM: r3(cursorM + finishLenM) })
      break
    }

    // Nem fér ki egyben: ezt a darabot a lehető legtöbb teljes modullal
    // töltjük fel a 6 m-es határon belül (orr nélkül, hisz nem itt végződik),
    // de legalább 1 modult meghagyva a záró darabnak.
    const maxModulesInCap = Math.floor((SHEET.MAX_SINGLE_LENGTH_M - base) / SHEET.MODULE_M)
    const n = Math.min(remaining - 1, Math.max(1, maxModulesInCap))
    const lenM = r3(base + n * SHEET.MODULE_M)
    segments.push({ order, modules: n, lengthM: lenM, startM: r3(cursorM), endM: r3(cursorM + lenM) })

    remaining -= n
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
    const ext = polyX2 > polyX1 ? columnExtent(plane.points, polyX1, polyX2) : null
    if (!ext) continue

    // Y=0 a csurgó tövénél van; a modulrács a csurgó fölött indul, és minden
    // oszlop lemeze erre a közös rácsra igazodik (a cseréphatás sorai így
    // futnak végig vízszintesen az egész síkon).
    const netTop = ext.maxY - plane.eaveOverhangM - SHEET.NOSE_M
    if (netTop <= 1e-9) continue
    const nTop = moduleCount(netTop)

    // Ha a sokszög alja ebben az oszlopban a csurgó fölött van (átlósan
    // emelkedő alsó él), a lemez alja a legalsó pont alatti modulhatárra
    // kerül → lentről felfelé is lépcsőzik a kiosztás.
    const raised = ext.minY > plane.eaveOverhangM + 1e-6
    const nBot = raised ? moduleFloor(ext.minY - plane.eaveOverhangM) : 0
    const modules = Math.max(1, nTop - nBot)
    const startY = raised ? plane.eaveOverhangM + nBot * SHEET.MODULE_M : 0
    const bottomExtra = raised ? 0 : plane.eaveOverhangM

    const segments = buildSegments(modules, bottomExtra, startY, allowOversize)
    if (segments.length > 0) {
      columns.push({ index: i, heightM: ext.maxY, segments, isSplit: segments.length > 1 })
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
