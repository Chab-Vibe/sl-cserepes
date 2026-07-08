import type { RoofPlane, ColumnResult, PlaneResult, OrderGroup, SheetSegment, SheetTypeId, EdgeAccessoryResult, AccessoryGroup } from '../types'

export type SheetGroupId = 'trapez' | 'cserepeslemez' | 'modulos_cserepeslemez' | 'roll'

// A csoportok a termékkatalógus UI-hoz — szándékosan független a ténylegesen
// létező profiloktól, hogy később bővíthető legyen (üres csoportot a UI nem jelenít meg).
export const SHEET_GROUPS: { id: SheetGroupId; label: string }[] = [
  { id: 'trapez', label: 'Trapézlemezek és panelek' },
  { id: 'cserepeslemez', label: 'Cserepeslemezek' },
  { id: 'modulos_cserepeslemez', label: 'Modulos cserepeslemez' },
  { id: 'roll', label: 'Tekercses anyagok' },
]

export interface SheetProfile {
  id: SheetTypeId
  label: string
  group: SheetGroupId
  moduleM: number | null      // null = folytonos rendszer, nincs modulosztás
  noseM: number               // a lemez felső (gerinc felőli) fedése — csak a legfelső darab tetejéhez adódik; a csurgó felőli végen a felhasználó eaveOverhangM-je adja a ráhagyást, nincs külön fix "lábméret"
  totalWidthM: number
  effectiveWidthM: number
  maxSingleLengthM: number
  overlapM: number
  minLengthM: number | null   // null = nincs gyártási minimum
  roundingMm: number          // vágási hossz kerekítési lépésköze (mm), 0 = nincs kerekítés
  alternatingJointDefaultMm: number  // toldott lemezek varrat-vonalának alap váltakozó eltolása (mm), 0 = kikapcsolva
}

export const SHEET_PROFILES: Record<SheetTypeId, SheetProfile> = {
  cserepeslemez: {
    id: 'cserepeslemez',
    label: 'Cserepeslemez',
    group: 'cserepeslemez',
    moduleM: 0.350,
    noseM: 0.070,
    totalWidthM: 1.1,
    effectiveWidthM: 1.0,
    // 6 méter fölött a lemez csak felhasználói jóváhagyással gyártható egyben;
    // egyébként a rendszer toldja, MODULE-határon vágva, fix átfedéssel.
    maxSingleLengthM: 6.0,
    overlapM: 0.12,
    // A legkisebb gyártható lemezhossz — sem az alap kiosztás, sem a kézi/
    // automatikus megosztás nem hozhat létre ennél rövidebb darabot.
    minLengthM: 0.82,
    // Már modulrácshoz kötött rendszer — alapból ne módosítsuk a viselkedését.
    roundingMm: 0,
    alternatingJointDefaultMm: 0,
  },
  t35: {
    id: 't35',
    label: 'T-35 saját gyártás',
    group: 'trapez',
    moduleM: null,
    noseM: 0,
    totalWidthM: 1.05,
    effectiveWidthM: 0.98,
    maxSingleLengthM: 7.0,
    overlapM: 0.20,
    minLengthM: null,
    roundingMm: 10,
    alternatingJointDefaultMm: 100,
  },
  t14: {
    id: 't14',
    label: 'T-14 saját gyártás',
    group: 'trapez',
    moduleM: null,
    noseM: 0,
    totalWidthM: 1.1,
    effectiveWidthM: 1.02,
    maxSingleLengthM: 7.0,
    overlapM: 0.20,
    minLengthM: null,
    roundingMm: 10,
    alternatingJointDefaultMm: 100,
  },
  t8: {
    id: 't8',
    label: 'T-8 saját gyártás',
    group: 'trapez',
    moduleM: null,
    noseM: 0,
    totalWidthM: 1.18,
    effectiveWidthM: 1.13,
    maxSingleLengthM: 5.0,
    overlapM: 0.20,
    minLengthM: null,
    roundingMm: 10,
    alternatingJointDefaultMm: 100,
  },
  t18: {
    id: 't18',
    label: 'T-18 saját gyártás',
    group: 'trapez',
    moduleM: null,
    noseM: 0,
    totalWidthM: 1.15,
    effectiveWidthM: 1.1,
    maxSingleLengthM: 7.0,
    overlapM: 0.20,
    minLengthM: null,
    roundingMm: 10,
    alternatingJointDefaultMm: 100,
  },
}

export const DEFAULT_SHEET_TYPE: SheetTypeId = 'cserepeslemez'

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
// A minY lehet negatív is: ha a sík alja egy adott oszlopban a csurgó (y=0)
// alá lóg (pl. lépcsős tetőforma, alacsonyabb toldalék), azt a lemez
// tényleges lefedésébe be kell számítani, nem eldobni.
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
  return { minY, maxY }
}

const r3 = (x: number) => Math.round(x * 1000) / 1000

// Felfelé kerekít a legközelebbi stepM többszörösére (a gyártási vágási
// tűréshez) — 0 lépésköznél nincs kerekítés, csak mm-re kerekítünk.
function ceilToStepM(lenM: number, stepM: number): number {
  if (stepM <= 1e-9) return r3(lenM)
  return r3(Math.ceil(lenM / stepM - 1e-9) * stepM)
}

// ── Modul-alapú (pl. cserepeslemez) segédfüggvények ──────────────────────

// Nettó magassághoz szükséges egész modulszám (felfelé lépcsőzve).
// Ha a magasság pontosan modulhatárra esik, +1 modul (5 cm védőzóna elve).
function moduleCount(moduleM: number, netH: number): number {
  const ratio = netH / moduleM
  let n = Math.ceil(ratio - 1e-9)
  if (Math.abs(ratio - Math.round(ratio)) < 1e-6) n = Math.round(ratio) + 1
  return Math.max(1, n)
}

// Emelt aljú oszlopnál hány teljes modullal kezdődhet feljebb a lemez:
// a sokszög legalsó pontja ALATTI modulhatárra igazít (lefelé lépcsőzve).
// Pontos határra esésnél egy modullal lejjebb (itt is védőzóna).
function moduleFloor(moduleM: number, relH: number): number {
  const ratio = relH / moduleM
  let n = Math.floor(ratio + 1e-9)
  if (Math.abs(ratio - Math.round(ratio)) < 1e-6) n = Math.round(ratio) - 1
  return Math.max(0, n)
}

// Egy darab tényleges gyártási hossza adott alapmérethez (csurgó/átfedés,
// esetleg +orr) és modulszámhoz. A BONA Plus tábla szerint 1 modulos lemez
// nincs (legalább 2 modul mindig kell); 2 modulnál, ha a nyers hossz a
// profil gyártási minimuma alá esne, a darabot pontosan a minimumra
// NYÚJTJUK (nem lépünk egy egész modult tovább). 3 modultól fölfelé a
// nyers hossz mindig eléri a minimumot, így ott sosem kell nyújtani.
// Ez a "döntési" hossz — a kerekítési tűrés (ceilToStepM) ezután, a
// szegmens véglegesítésekor alkalmazandó, nem itt.
function finalizeModuleLength(profile: SheetProfile, otherLenM: number, modules: number): number {
  const naturalM = r3(otherLenM + modules * profile.moduleM!)
  if (profile.minLengthM !== null && modules === 2 && naturalM < profile.minLengthM - 1e-9) return profile.minLengthM
  return naturalM
}

interface SegmentBuildOpts {
  splitAtM?: number
  roundingM: number
  alternatingM: number
  colParityOdd: boolean
}

// Adott modulszámú lemezoszlopból legyártható szegmenseket épít fel.
// bottomExtraM: a legalsó darab alsó ráhagyása (csurgó az eresznél, 0 emelt aljnál) —
// ez adja a lemez alsó "orrát" is, nincs ettől külön fix lábméret.
// startYM: a lemez aljának Y pozíciója a síkon (0 az eresznél, modulrács-vonal emelt aljnál).
// opts.splitAtM: felhasználó által kért kézi megosztás (az alsó darab kívánt
// hossza méterben) — ha a lemez egyébként egyben elférne, mégis a legközelebbi
// érvényes modulhatárnál két darabra vágja, OVERLAP_M átfedéssel.
function buildModuleSegments(profile: SheetProfile, totalModules: number, bottomExtraM: number, startYM: number, allowOversize: boolean, opts: SegmentBuildOpts): SheetSegment[] {
  const MODULE = profile.moduleM!
  const { splitAtM, roundingM, alternatingM, colParityOdd } = opts
  if (totalModules <= 0) return []

  const totalLenM = finalizeModuleLength(profile, bottomExtraM + profile.noseM, totalModules)
  const needsAutoSplit = !allowOversize && totalLenM > profile.maxSingleLengthM + 1e-9

  if (!needsAutoSplit && splitAtM !== undefined && totalModules >= 4) {
    const kMax = totalModules - 2
    const twoModuleLenM = finalizeModuleLength(profile, bottomExtraM + profile.noseM, 2)
    const k = splitAtM <= twoModuleLenM + 1e-9
      ? Math.min(2, kMax)
      : Math.min(kMax, Math.max(3, Math.ceil((splitAtM - bottomExtraM - profile.noseM) / MODULE - 1e-9)))
    const lenA = ceilToStepM(finalizeModuleLength(profile, bottomExtraM + profile.noseM, k), roundingM)
    const lenB = ceilToStepM(finalizeModuleLength(profile, profile.overlapM + profile.noseM, totalModules - k), roundingM)
    return [
      { order: 0, modules: k, lengthM: lenA, startM: r3(startYM), endM: r3(startYM + lenA) },
      { order: 1, modules: totalModules - k, lengthM: lenB, startM: r3(startYM + lenA - profile.overlapM), endM: r3(startYM + lenA - profile.overlapM + lenB) },
    ]
  }

  if (!needsAutoSplit) {
    const lenM = ceilToStepM(totalLenM, roundingM)
    return [{ order: 0, modules: totalModules, lengthM: lenM, startM: r3(startYM), endM: r3(startYM + lenM) }]
  }

  // Automatikus toldás: a lehető legkevesebb darabra osztjuk, és a modulokat
  // minél egyenletesebben osztjuk el köztük — nem az elsőt töltjük tele a
  // max. hosszig egy apró maradék darabbal a végén, hanem pl. 2 db kb.
  // egyenlő darabot készítünk (átfedéssel).
  let N = 2
  let base = 0
  let extra = 0
  while (true) {
    base = Math.floor(totalModules / N)
    extra = totalModules % N
    if (base < 2) { N++; continue }
    const maxCountInAnyPiece = extra > 0 ? base + 1 : base
    // Óvatos (worst-case) becslés: bármelyik pozícióban lehet a legtöbb
    // modult tartalmazó darab, ezért a legnagyobb lehetséges alapmérettel
    // (csurgó, átfedés vagy orr) számolunk.
    const worstBase = Math.max(bottomExtraM, profile.overlapM) + profile.noseM
    const worstLenM = worstBase + maxCountInAnyPiece * MODULE
    if (worstLenM <= profile.maxSingleLengthM + 1e-9) break
    N++
  }

  let counts = Array.from({ length: N }, (_, i) => base + (i < extra ? 1 : 0))

  // Váltakozó varrat-eltolás: csak a leggyakoribb N=2 esetben, páratlan
  // oszlopoknál toljuk el a vágáspontot néhány modullal, hogy a toldási
  // varratok ne fussanak egy vonalban a teljes tetőn. Ha az eltolt darabok
  // bármelyike sértené a modul-minimumot vagy a max. gyártási hosszt, a
  // klippelés visszaesik az eredeti (nem eltolt) felosztásra.
  if (N === 2 && alternatingM > 1e-9 && colParityOdd) {
    const shiftMod = Math.max(1, Math.round(alternatingM / MODULE))
    const cand0 = counts[0] + shiftMod
    const cand1 = totalModules - cand0
    if (cand0 >= 2 && cand1 >= 2) {
      const len0 = finalizeModuleLength(profile, bottomExtraM + profile.noseM, cand0)
      const len1 = finalizeModuleLength(profile, profile.overlapM + profile.noseM, cand1)
      if (len0 <= profile.maxSingleLengthM + 1e-9 && len1 <= profile.maxSingleLengthM + 1e-9) {
        counts = [cand0, cand1]
      }
    }
  }

  const segments: SheetSegment[] = []
  let cursorM = startYM
  for (let i = 0; i < N; i++) {
    const pieceBase = (i === 0 ? bottomExtraM : profile.overlapM) + profile.noseM
    const lenM = ceilToStepM(finalizeModuleLength(profile, pieceBase, counts[i]), roundingM)
    segments.push({ order: i, modules: counts[i], lengthM: lenM, startM: r3(cursorM), endM: r3(cursorM + lenM) })
    cursorM = cursorM + lenM - profile.overlapM
  }

  return segments
}

// ── Folytonos (modulosztás nélküli, pl. T-35) segédfüggvények ────────────

// Nincs rács: a lemez pontosan a szükséges hosszra készül, tetszőleges
// (mm-pontos) hosszban — csak a gyártási max. hossz és az átfedés korlátoz.
function buildContinuousSegments(profile: SheetProfile, totalLenM: number, startYM: number, allowOversize: boolean, opts: SegmentBuildOpts): SheetSegment[] {
  const { splitAtM, roundingM, alternatingM, colParityOdd } = opts
  if (totalLenM <= 1e-9) return []
  const MAX = profile.maxSingleLengthM
  const OVERLAP = profile.overlapM
  const needsAutoSplit = !allowOversize && totalLenM > MAX + 1e-9

  if (!needsAutoSplit && splitAtM !== undefined) {
    const bounds = continuousSplitBoundsM(profile, totalLenM)
    if (bounds) {
      const lenA = ceilToStepM(Math.min(bounds.maxM, Math.max(bounds.minM, splitAtM)), roundingM)
      const lenB = ceilToStepM(totalLenM - lenA + OVERLAP, roundingM)
      return [
        { order: 0, modules: 0, lengthM: lenA, startM: r3(startYM), endM: r3(startYM + lenA) },
        { order: 1, modules: 0, lengthM: lenB, startM: r3(startYM + lenA - OVERLAP), endM: r3(startYM + lenA - OVERLAP + lenB) },
      ]
    }
  }

  if (!needsAutoSplit) {
    const lenM = ceilToStepM(totalLenM, roundingM)
    return [{ order: 0, modules: 0, lengthM: lenM, startM: r3(startYM), endM: r3(startYM + lenM) }]
  }

  // Automatikus toldás: a lehető legkevesebb, egymáshoz közel egyenlő
  // hosszú darabra osztjuk (nem az elsőt max. hosszra töltve egy apró
  // maradék darabbal a végén) — pl. 7,4 m 7 m-es max. hossznál 2×3,8 m
  // lesz, nem 7 m + 0,6 m.
  let N = 2
  while ((totalLenM + (N - 1) * OVERLAP) / N > MAX + 1e-9) N++
  const pieceLenM = r3((totalLenM + (N - 1) * OVERLAP) / N)

  // Váltakozó varrat-eltolás: csak N=2 esetben, páratlan oszlopoknál.
  let lenAOverride: number | null = null
  if (N === 2 && alternatingM > 1e-9 && colParityOdd) {
    const candA = pieceLenM + alternatingM
    const candB = totalLenM + OVERLAP - candA
    const bounds = continuousSplitBoundsM(profile, totalLenM)
    if (bounds && candA >= bounds.minM && candA <= bounds.maxM && candA <= MAX + 1e-9 && candB <= MAX + 1e-9 && candB >= CONTINUOUS_MIN_PIECE_M) {
      lenAOverride = candA
    }
  }

  const segments: SheetSegment[] = []
  const endTarget = startYM + totalLenM
  let cursorM = startYM
  for (let i = 0; i < N; i++) {
    const isLast = i === N - 1
    let lenM: number
    if (i === 0 && lenAOverride !== null) lenM = lenAOverride
    else if (isLast) lenM = r3(endTarget - cursorM)
    else lenM = pieceLenM
    lenM = ceilToStepM(lenM, roundingM)
    segments.push({ order: i, modules: 0, lengthM: lenM, startM: r3(cursorM), endM: r3(cursorM + lenM) })
    cursorM = cursorM + lenM - OVERLAP
  }
  return segments
}

// A folytonos rendszerben a megosztás nem modulhatárhoz, hanem tetszőleges
// (mm-pontos) hosszhoz igazodik; csak egy kis darabméret-védelem van
// (min. 10 cm/darab), hogy ne jöhessen létre értelmetlenül rövid szelet.
const CONTINUOUS_MIN_PIECE_M = 0.1

function continuousSplitBoundsM(profile: SheetProfile, totalLenM: number): { minM: number; maxM: number } | null {
  const minA = CONTINUOUS_MIN_PIECE_M
  const maxA = totalLenM + profile.overlapM - CONTINUOUS_MIN_PIECE_M
  if (maxA < minA) return null
  return { minM: minA, maxM: maxA }
}

// ── Profil-agnosztikus, kifelé exportált API ──────────────────────────────

// Megosztható-e egyáltalán az oszlop úgy, hogy mindkét darab gyártható legyen.
export function canSplitColumn(profile: SheetProfile, col: Pick<ColumnResult, 'totalModules' | 'totalLenM'>): boolean {
  if (profile.moduleM === null) return continuousSplitBoundsM(profile, col.totalLenM) !== null
  return col.totalModules >= 4
}

// Az alsó darab megengedett hossztartománya (mm), amivel mindkét darab
// gyártható marad. null, ha az oszlop egyáltalán nem osztható.
export function splitBoundsMm(profile: SheetProfile, col: Pick<ColumnResult, 'totalModules' | 'totalLenM' | 'bottomExtraM'>): { minMm: number; maxMm: number } | null {
  if (profile.moduleM === null) {
    const bounds = continuousSplitBoundsM(profile, col.totalLenM)
    if (!bounds) return null
    return { minMm: Math.round(bounds.minM * 1000), maxMm: Math.round(bounds.maxM * 1000) }
  }
  if (col.totalModules < 4) return null
  const kMax = col.totalModules - 2
  return {
    minMm: Math.round(finalizeModuleLength(profile, col.bottomExtraM + profile.noseM, 2) * 1000),
    maxMm: Math.round(finalizeModuleLength(profile, col.bottomExtraM + profile.noseM, kMax) * 1000),
  }
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

// Minden sokszögél (points[i] → points[(i+1) % n]) hossza méterben — ezt
// használja a rajz élcímkéje ÉS az élenkénti kellékszámítás is, hogy a kettő
// sose térjen el egymástól.
export function polyEdges(points: [number, number][]): { index: number; lengthM: number }[] {
  const n = points.length
  if (n < 2) return []
  return Array.from({ length: n }, (_, i) => {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % n]
    return { index: i, lengthM: Math.hypot(x2 - x1, y2 - y1) }
  })
}

// Egy sík élenkénti kellékeinek (sarokelem, szegély stb.) számított
// darabszáma — a kellék egységhosszából és az él tényleges hosszából.
export function calculateEdgeAccessories(plane: RoofPlane): EdgeAccessoryResult[] {
  const edges = polyEdges(plane.points)
  return (plane.edgeAccessories ?? []).map(acc => {
    const edgeLengthM = edges.find(e => e.index === acc.edgeIndex)?.lengthM ?? 0
    const count = acc.unitLengthM > 1e-9 ? Math.ceil(edgeLengthM / acc.unitLengthM - 1e-9) : 0
    return { ...acc, edgeLengthM, count }
  })
}

// Projekt-szintű kellék-összesítő: névre (kisbetűsítve, trim-elve)
// csoportosítva összeadja az összes sík összes kellékének darabszámát.
export function groupAccessories(planes: RoofPlane[]): AccessoryGroup[] {
  const map = new Map<string, AccessoryGroup>()
  for (const plane of planes) {
    for (const r of calculateEdgeAccessories(plane)) {
      const key = r.name.trim().toLowerCase()
      if (!key) continue
      const existing = map.get(key)
      if (existing) existing.totalCount += r.count
      else map.set(key, { name: r.name.trim(), totalCount: r.count })
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function getStartOffset(plane: RoofPlane, profile: SheetProfile): number {
  const width = polyWidth(plane.points)
  if (width <= 0) return 0
  const numCols = Math.ceil(width / profile.effectiveWidthM)
  const totalSheetWidth = numCols * profile.effectiveWidthM
  const overhang = totalSheetWidth - width
  if (plane.alignment === 'right') return -overhang
  if (plane.alignment === 'center') return -overhang / 2
  return 0  // left
}

export function calculatePlane(plane: RoofPlane, profile: SheetProfile, allowOversize = false): PlaneResult {
  const minX = polyMinX(plane.points)
  const maxX = polyMaxX(plane.points)
  const width = maxX - minX
  const numCols = Math.ceil(width / profile.effectiveWidthM)
  const startX = minX + getStartOffset(plane, profile)
  const manualSplits = plane.manualSplits ?? []
  const excludedCols = plane.excludedCols ?? []
  const roundingM = (plane.roundingOverrideMm ?? profile.roundingMm) / 1000
  const alternatingM = (plane.alternatingJointOverrideMm ?? profile.alternatingJointDefaultMm) / 1000
  const columns: ColumnResult[] = []

  for (let i = 0; i < numCols; i++) {
    const sheetX1 = startX + i * profile.effectiveWidthM
    const sheetX2 = sheetX1 + profile.effectiveWidthM
    // Intersect with polygon extent
    const polyX1 = Math.max(minX, sheetX1)
    const polyX2 = Math.min(maxX, sheetX2)
    const ext = polyX2 > polyX1 ? columnExtent(plane.points, polyX1, polyX2) : null
    if (!ext) continue

    const manualSplit = manualSplits.find(s => s.col === i)
    const excluded = excludedCols.includes(i)

    // Ha a sík alja ebben az oszlopban a csurgó (y=0) fölött van (átlósan
    // emelkedő alsó él, pl. kontyolt sarok), a lemez a legalsó pont alatti
    // modulhatárra igazodik, fizikai csurgó-túlnyúlás nélkül (nem éri el a
    // valódi ereszvonalat). Egyébként — akár pontosan y=0-nál, akár az ALÁ
    // lógva (pl. lépcsős tetőforma, alacsonyabb toldalék) — az oszlop eléri
    // a saját (helyi) ereszvonalát, ott kapja meg a fizikai túlnyúlást, a
    // lemez pedig a TÉNYLEGES legalsó pontból indul, nem egy rögzített 0-ból.
    const raised = ext.minY > plane.eaveOverhangM + 1e-6
    const segOpts: SegmentBuildOpts = { splitAtM: manualSplit?.atM, roundingM, alternatingM, colParityOdd: i % 2 === 1 }

    if (profile.moduleM !== null) {
      const MODULE = profile.moduleM
      let modules: number
      let startY: number
      let bottomExtra: number

      if (raised) {
        // Y=0 a csurgó tövénél van; a modulrács a csurgó fölött indul, és
        // minden ilyen oszlop lemeze erre a közös rácsra igazodik (a
        // cseréphatás sorai így futnak végig vízszintesen az egész síkon).
        const netTop = ext.maxY - plane.eaveOverhangM - profile.noseM
        if (netTop <= 1e-9) continue
        const nTop = moduleCount(MODULE, netTop)
        const nBot = moduleFloor(MODULE, ext.minY - plane.eaveOverhangM)
        modules = Math.max(2, nTop - nBot)
        startY = plane.eaveOverhangM + nBot * MODULE
        bottomExtra = 0
      } else {
        // A tényleges lefedendő magasság a sík valódi alja (ext.minY, akár
        // negatív is) és teteje között — nem csak a maxY-eave.
        const coverageM = ext.maxY - ext.minY
        const netTop = coverageM - plane.eaveOverhangM - profile.noseM
        if (netTop <= 1e-9) continue
        modules = Math.max(2, moduleCount(MODULE, netTop))
        startY = ext.minY
        bottomExtra = plane.eaveOverhangM
      }

      const totalLenM = finalizeModuleLength(profile, bottomExtra + profile.noseM, modules)
      const segments = buildModuleSegments(profile, modules, bottomExtra, startY, allowOversize, segOpts)
      if (segments.length > 0) {
        columns.push({ index: i, heightM: ext.maxY, segments, isSplit: segments.length > 1, totalModules: modules, bottomExtraM: bottomExtra, totalLenM, excluded })
      }
    } else {
      // Folytonos (modulosztás nélküli) profil: nincs rács, a lemez pontosan
      // a szükséges hosszra készül; csurgó csak azoknál az oszlopoknál adódik
      // hozzá, amelyek ténylegesen elérik a (helyi) ereszvonalukat.
      const startY = ext.minY
      const bottomExtra = raised ? 0 : plane.eaveOverhangM
      const coverageM = ext.maxY - startY
      if (coverageM <= 1e-9) continue
      const totalLenM = r3(coverageM + bottomExtra)

      const segments = buildContinuousSegments(profile, totalLenM, startY, allowOversize, segOpts)
      if (segments.length > 0) {
        columns.push({ index: i, heightM: ext.maxY, segments, isSplit: segments.length > 1, totalModules: 0, bottomExtraM: bottomExtra, totalLenM, excluded })
      }
    }
  }

  return {
    planeId: plane.id,
    planeName: plane.name,
    columns,
    totalSheets: columns.reduce((s, c) => s + (c.excluded ? 0 : c.segments.length), 0),
  }
}

export function groupByLength(results: PlaneResult[]): OrderGroup[] {
  const map = new Map<number, OrderGroup>()
  for (const r of results) {
    for (const col of r.columns) {
      if (col.excluded) continue
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

// Anyagszükséglet: a lemez TELJES szélességével — ennyi anyagot kell
// ténylegesen megrendelni/kifizetni, mert minden lemez ilyen szélességben készül.
export function groupMaterialAreaM2(g: OrderGroup, profile: SheetProfile): number {
  return g.lengthM * g.totalSheets * profile.totalWidthM
}

export function totalMaterialAreaM2(groups: OrderGroup[], profile: SheetProfile): number {
  return groups.reduce((s, g) => s + groupMaterialAreaM2(g, profile), 0)
}

// Tetőfelület szükséglet: a lemez HASZNOS szélességével — ennyi tényleges
// tetőfelületet fed le a lemez (az átfedő rész nem számít bele).
export function groupCoverageAreaM2(g: OrderGroup, profile: SheetProfile): number {
  return g.lengthM * g.totalSheets * profile.effectiveWidthM
}

export function totalCoverageAreaM2(groups: OrderGroup[], profile: SheetProfile): number {
  return groups.reduce((s, g) => s + groupCoverageAreaM2(g, profile), 0)
}

export function isPlaneValid(plane: RoofPlane): boolean {
  return plane.points.length >= 3
}
