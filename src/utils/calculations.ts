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
  // A legkisebb gyártható lemezhossz — sem az alap kiosztás, sem a kézi/
  // automatikus megosztás nem hozhat létre ennél rövidebb darabot.
  MIN_LENGTH_M: 0.82,
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

// A BONA Plus modul-táblázat szerint 1 modulos lemez nincs; 2 modulnál a
// 82 cm-es gyártási minimumot kell ellenőrizni, 3 modultól fölfelé viszont
// mindig gyártható, méret-ellenőrzés nélkül.
function minViableModules(otherLenM: number): number {
  const twoModuleLenM = r3(otherLenM + 2 * SHEET.MODULE_M)
  return twoModuleLenM >= SHEET.MIN_LENGTH_M - 1e-9 ? 2 : 3
}

// Megosztható-e egyáltalán az oszlop úgy, hogy mindkét darab gyártható legyen
// (legalább 2 modul, és 2 modulnál a 82 cm-es minimumot is elérje).
export function canSplitColumn(totalModules: number, bottomExtraM: number): boolean {
  const kMin = minViableModules(bottomExtraM)
  const kMax = totalModules - minViableModules(SHEET.OVERLAP_M + SHEET.NOSE_M)
  return kMin <= kMax
}

// Az alsó darab megengedett hossztartománya (mm), amivel mindkét darab
// gyártható marad. null, ha az oszlop egyáltalán nem osztható.
export function splitBoundsMm(totalModules: number, bottomExtraM: number): { minMm: number; maxMm: number } | null {
  if (!canSplitColumn(totalModules, bottomExtraM)) return null
  const kMin = minViableModules(bottomExtraM)
  const kMax = totalModules - minViableModules(SHEET.OVERLAP_M + SHEET.NOSE_M)
  return {
    minMm: Math.round((bottomExtraM + kMin * SHEET.MODULE_M) * 1000),
    maxMm: Math.round((bottomExtraM + kMax * SHEET.MODULE_M) * 1000),
  }
}

// A megadott (mm-ben kért) alsó-darab-hosszhoz legközelebb eső érvényes
// modulhatárt adja vissza, úgy hogy mindkét darab gyártható maradjon.
export function nearestSplitModules(totalModules: number, bottomExtraM: number, targetBottomM: number): number {
  const kMin = minViableModules(bottomExtraM)
  const kMax = Math.max(kMin, totalModules - minViableModules(SHEET.OVERLAP_M + SHEET.NOSE_M))
  const raw = (targetBottomM - bottomExtraM) / SHEET.MODULE_M
  return Math.min(kMax, Math.max(kMin, Math.round(raw)))
}

// Adott modulszámú lemezoszlopból legyártható szegmenseket épít fel.
// bottomExtraM: a legalsó darab alsó ráhagyása (csurgó az eresznél, 0 emelt aljnál),
// startYM: a lemez aljának Y pozíciója a síkon (0 az eresznél, modulrács-vonal emelt aljnál).
// splitAtModules: felhasználó által kért kézi megosztás — ha a lemez egyébként
// egyben (nem 6 m fölötti) elférne, mégis az adott modulszámnál (az alsó darab
// modulmennyisége) két darabra vágja, OVERLAP_M átfedéssel.
// Ha a teljes hossz 6 m alatt van (és nincs kézi megosztás), vagy a
// felhasználó engedélyezte az egybefüggő lemezt, egyetlen szegmenst ad
// vissza. Egyébként modulhatáron vágva toldja, a darabok OVERLAP_M
// átfedéssel épülnek egymásra, az orr a legfelső darabon van.
function buildSegments(totalModules: number, bottomExtraM: number, startYM: number, allowOversize: boolean, splitAtModules?: number): SheetSegment[] {
  if (totalModules <= 0) return []

  const totalLenM = r3(bottomExtraM + totalModules * SHEET.MODULE_M + SHEET.NOSE_M)
  const needsAutoSplit = !allowOversize && totalLenM > SHEET.MAX_SINGLE_LENGTH_M + 1e-9

  if (!needsAutoSplit && splitAtModules !== undefined && totalModules >= 2 && canSplitColumn(totalModules, bottomExtraM)) {
    const k = nearestSplitModules(totalModules, bottomExtraM, bottomExtraM + splitAtModules * SHEET.MODULE_M)
    const lenA = r3(bottomExtraM + k * SHEET.MODULE_M)
    const lenB = r3(SHEET.OVERLAP_M + (totalModules - k) * SHEET.MODULE_M + SHEET.NOSE_M)
    return [
      { order: 0, modules: k, lengthM: lenA, startM: r3(startYM), endM: r3(startYM + lenA) },
      { order: 1, modules: totalModules - k, lengthM: lenB, startM: r3(startYM + lenA - SHEET.OVERLAP_M), endM: r3(startYM + lenA - SHEET.OVERLAP_M + lenB) },
    ]
  }

  if (!needsAutoSplit) {
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
    // de annyi modult meghagyva a záró darabnak, hogy az is elérje a
    // gyártási minimumot (MIN_LENGTH_M).
    const maxModulesInCap = Math.floor((SHEET.MAX_SINGLE_LENGTH_M - base) / SHEET.MODULE_M)
    const minFinishModules = minViableModules(SHEET.OVERLAP_M + SHEET.NOSE_M)
    let n = Math.min(remaining - 1, Math.max(1, maxModulesInCap))
    if (remaining - n < minFinishModules) n = Math.max(1, remaining - minFinishModules)
    const lenM = r3(base + n * SHEET.MODULE_M)
    segments.push({ order, modules: n, lengthM: lenM, startM: r3(cursorM), endM: r3(cursorM + lenM) })

    remaining -= n
    cursorM = cursorM + lenM - SHEET.OVERLAP_M
    order++
  }

  return segments
}

// A sokszög X tartománya (bounding box), így a pontok lehetnek negatívak is
// — a lemezkiosztás mindig a tényleges bal/jobb szélhez igazodik, nem
// feltételezi, hogy a bal szél X=0-nál van.
export function polyMinX(points: [number, number][]): number {
  return points.length === 0 ? 0 : Math.min(...points.map(p => p[0]))
}

export function polyMaxX(points: [number, number][]): number {
  return points.length === 0 ? 0 : Math.max(...points.map(p => p[0]))
}

export function polyWidth(points: [number, number][]): number {
  if (points.length === 0) return 0
  return polyMaxX(points) - polyMinX(points)
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
  const minX = polyMinX(plane.points)
  const maxX = polyMaxX(plane.points)
  const width = maxX - minX
  const numCols = Math.ceil(width / SHEET.EFFECTIVE_WIDTH_M)
  const startX = minX + getStartOffset(plane)
  const manualSplits = plane.manualSplits ?? []
  const columns: ColumnResult[] = []

  for (let i = 0; i < numCols; i++) {
    const sheetX1 = startX + i * SHEET.EFFECTIVE_WIDTH_M
    const sheetX2 = sheetX1 + SHEET.EFFECTIVE_WIDTH_M
    // Intersect with polygon extent
    const polyX1 = Math.max(minX, sheetX1)
    const polyX2 = Math.min(maxX, sheetX2)
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
    const startY = raised ? plane.eaveOverhangM + nBot * SHEET.MODULE_M : 0
    const bottomExtra = raised ? 0 : plane.eaveOverhangM
    // A legkisebb gyártható méret (MIN_LENGTH_M) betartásához legalább ennyi
    // modul kell — nagyon rövid (pl. sarki) oszlopoknál ez felülírja a
    // pusztán a magasságból számolt modulszámot.
    const modules = Math.max(nTop - nBot, minViableModules(bottomExtra + SHEET.NOSE_M))

    const manualSplit = manualSplits.find(s => s.col === i)
    const segments = buildSegments(modules, bottomExtra, startY, allowOversize, manualSplit?.modules)
    if (segments.length > 0) {
      columns.push({ index: i, heightM: ext.maxY, segments, isSplit: segments.length > 1, totalModules: modules, bottomExtraM: bottomExtra })
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

// Anyagszükséglet: a lemez TELJES szélességével (1,1 m) — ennyi anyagot kell
// ténylegesen megrendelni/kifizetni, mert minden lemez ilyen szélességben készül.
export function groupMaterialAreaM2(g: OrderGroup): number {
  return g.lengthM * g.totalSheets * SHEET.TOTAL_WIDTH_M
}

export function totalMaterialAreaM2(groups: OrderGroup[]): number {
  return groups.reduce((s, g) => s + groupMaterialAreaM2(g), 0)
}

// Tetőfelület szükséglet: a lemez HASZNOS szélességével (1,0 m) — ennyi
// tényleges tetőfelületet fed le a lemez (az átfedő rész nem számít bele).
export function groupCoverageAreaM2(g: OrderGroup): number {
  return g.lengthM * g.totalSheets * SHEET.EFFECTIVE_WIDTH_M
}

export function totalCoverageAreaM2(groups: OrderGroup[]): number {
  return groups.reduce((s, g) => s + groupCoverageAreaM2(g), 0)
}

export function isPlaneValid(plane: RoofPlane): boolean {
  return plane.points.length >= 3
}
