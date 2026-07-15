import type { RoofPlane, PlaneResult, SheetSegment } from '../../types'
import { polyMinX, polyMaxX, polyHeight, polyEdges, getStartOffset, type SheetProfile } from '../../utils/calculations'

interface Props {
  plane: RoofPlane
  result: PlaneResult
  profile: SheetProfile
  onSelectColumn?: (colIndex: number) => void
  selectedCol?: number | null
  onSelectEdge?: (edgeIndex: number) => void
  selectedEdge?: number | null
  // Kozmetikai (betűméret/jelölésméret) szorzó — a geometria (SVG_W/H, PAD,
  // lépték) mindig ugyanaz marad, hogy a nyomtatott kép változatlan legyen;
  // csak a képernyős nézet kaphat nagyobb feliratokat ezzel a prop-pal.
  fontScale?: number
}

export interface SheetLayoutView {
  SVG_W: number
  SVG_H: number
  PAD: { top: number; right: number; bottom: number; left: number }
  minX: number
  maxX: number
  maxY: number
  startX: number
  totalSheetW: number
  overhangLeft: number
  overhangRight: number
  viewLeft: number
  viewRight: number
  viewW: number
  viewH: number
  scale: number
  ox: number
  oy: number
  usedW: number
  usedH: number
}

// Kiemelt nézet/lépték-számítás — ugyanezt használja a SheetLayout maga (a
// kirajzoláshoz) és a RulerCanvas-alapú LayoutWorkspace is (a vonalzó
// pixelsPerMeter/originScreen paramétereihez), hogy a kettő sose térjen el.
export function computeSheetLayoutView(plane: RoofPlane, result: PlaneResult, profile: SheetProfile): SheetLayoutView {
  const minX = polyMinX(plane.points)
  const maxX = polyMaxX(plane.points) || 1
  const maxY = polyHeight(plane.points) || 1
  const startX = minX + getStartOffset(plane, profile)
  const numCols = result.columns.length
  const totalSheetW = numCols * profile.effectiveWidthM
  const overhangLeft  = Math.max(0, minX - startX)
  const overhangRight = Math.max(0, startX + totalSheetW - maxX)

  // Drawing canvas — fix méret, a nyomtatott kép ettől nem függ a fontScale-től.
  const SVG_W = 700
  const SVG_H = 440
  const PAD = { top: 40, right: 60, bottom: 70, left: 60 }
  const DW = SVG_W - PAD.left - PAD.right
  const DH = SVG_H - PAD.top - PAD.bottom

  // View includes overhangs
  const viewLeft  = Math.min(startX, minX)
  const viewRight = Math.max(maxX, startX + totalSheetW)
  const viewW = viewRight - viewLeft
  const viewH = maxY

  const scaleX = DW / viewW
  const scaleY = DH / viewH
  const scale  = Math.min(scaleX, scaleY) * 0.88

  const usedW = viewW * scale
  const usedH = viewH * scale
  const ox = PAD.left  + (DW - usedW) / 2
  const oy = PAD.top   + (DH - usedH) / 2

  return { SVG_W, SVG_H, PAD, minX, maxX, maxY, startX, totalSheetW, overhangLeft, overhangRight, viewLeft, viewRight, viewW, viewH, scale, ox, oy, usedW, usedH }
}

export function SheetLayout({ plane, result, profile, onSelectColumn, selectedCol = null, onSelectEdge, selectedEdge = null, fontScale = 1 }: Props) {
  if (plane.points.length < 3 || result.columns.length === 0) return null

  const FS = fontScale

  const view = computeSheetLayoutView(plane, result, profile)
  const { SVG_W, SVG_H, PAD, minX, maxX, maxY, startX, totalSheetW, overhangLeft, overhangRight, viewLeft, viewRight, scale, ox, oy, usedH } = view
  const manualSplits = plane.manualSplits ?? []

  // World coords → SVG (y flipped; viewLeft offset)
  function toSvg(wx: number, wy: number): [number, number] {
    return [ox + (wx - viewLeft) * scale, oy + usedH - wy * scale]
  }

  const polyPtStr = plane.points.map(([wx, wy]) => toSvg(wx, wy).join(',')).join(' ')
  const clipId = `lc-${plane.id}-${fontScale}`
  const OVERLAP_HATCH_ID = `ohatch-${plane.id}-${fontScale}`
  const EXCLUDED_HATCH_ID = `xhatch-${plane.id}-${fontScale}`

  function colWorldX(col: PlaneResult['columns'][number]) {
    const x1 = startX + col.index * profile.effectiveWidthM
    return { x1, x2: x1 + profile.effectiveWidthM }
  }

  const edges = polyEdges(plane.points)
  const alignLabel = plane.alignment === 'left' ? 'Bal' : plane.alignment === 'right' ? 'Jobb' : 'Közép'
  const totalWidthMm = Math.round((maxX - minX) * 1000)
  const totalSheetWidthMm = Math.round(totalSheetW * 1000)

  // Collect unique segment lengths for legend — a kihagyott (hulladékból
  // pótolt) oszlopok nem számítanak bele a rendelési összesítőbe.
  const allSegments = result.columns.filter(c => !c.excluded).flatMap(c => c.segments)
  const uniqueLengths = [...new Set(allSegments.map(s => s.lengthM))].sort((a, b) => a - b)
  const hasSplit = result.columns.some(c => c.isSplit)
  const hasExcluded = result.columns.some(c => c.excluded)

  return (
    <div className="mt-4 sheet-layout-wrapper">
      <h3 className="text-slate-500 print:text-black text-sm font-medium mb-2 uppercase tracking-wider">
        Kiosztási rajz — {plane.name}
        {overhangLeft > 0.001 && <span className="ml-2 text-amber-600">◄ {(overhangLeft*100).toFixed(0)} cm túlnyúlás bal</span>}
        {overhangRight > 0.001 && <span className="ml-2 text-amber-600">► {(overhangRight*100).toFixed(0)} cm túlnyúlás jobb</span>}
        {hasSplit && <span className="ml-2 text-rose-500">⚠ toldott lemez ({Math.round(profile.overlapM * 1000)} mm átfedés)</span>}
        {hasExcluded && <span className="ml-2 text-slate-400">⊘ kihagyott oszlop (hulladékból pótolva)</span>}
      </h3>

      <div className="rounded-xl overflow-hidden border border-slate-200 print:border-gray-300 print:rounded-none bg-white">
        <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ background: 'white' }}>
          <defs>
            {/* Hatch for sheet-to-sheet overlap */}
            <pattern id={OVERLAP_HATCH_ID} patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(-45)">
              <line x1={0} y1={0} x2={0} y2={6} stroke="#d97706" strokeWidth={1.4} />
            </pattern>
            {/* Hatch for excluded (rendelésből kihagyott) columns */}
            <pattern id={EXCLUDED_HATCH_ID} patternUnits="userSpaceOnUse" width={7} height={7} patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={7} stroke="#cbd5e1" strokeWidth={2} />
            </pattern>
            {/* Clip to polygon (only for separator lines) */}
            <clipPath id={clipId}>
              <polygon points={polyPtStr} />
            </clipPath>
          </defs>

          {/* ── Title ── */}
          <text x={SVG_W / 2} y={16} textAnchor="middle" fill="#333" fontSize={10 * FS} fontFamily="Arial,sans-serif" fontWeight="bold">
            {plane.name}  ·  Igazítás: {alignLabel}
            {profile.moduleM !== null && `  ·  Modul: ${profile.moduleM * 1000} mm`}
            {`  ·  Hasznos szélesség: ${profile.effectiveWidthM * 1000} mm`}
          </text>

          {/* ── SHEET COLUMNS ── */}
          {result.columns.map((col) => {
            const { x1: wx1, x2: wx2 } = colWorldX(col)
            const [sx1] = toSvg(wx1, 0)
            const [sx2] = toSvg(wx2, 0)
            const colPx = sx2 - sx1
            const cx = (sx1 + sx2) / 2
            const isManualSplit = manualSplits.some(s => s.col === col.index)
            const isSelected = selectedCol === col.index
            const colBottomM = col.segments.length ? col.segments[0].startM : 0
            const colTopM = col.segments.length ? col.segments[col.segments.length - 1].endM : 0
            const [, colSyTop] = toSvg(wx1, colTopM)
            const [, colSyBot] = toSvg(wx1, colBottomM)

            return (
              <g key={col.index}>
                {/* One rect per physical segment */}
                {col.segments.map((seg: SheetSegment) => {
                  const [, segSyTop] = toSvg(wx1, seg.endM)
                  const [, segSyBot] = toSvg(wx1, seg.startM)
                  const segH = segSyBot - segSyTop
                  const cySeg = (segSyTop + segSyBot) / 2
                  const lenMm = Math.round(seg.lengthM * 1000)
                  const fill = col.excluded ? `url(#${EXCLUDED_HATCH_ID})` : isSelected ? '#eff6ff' : 'white'
                  const stroke = col.excluded ? '#94a3b8' : isSelected ? '#2563eb' : '#888'
                  return (
                    <g key={seg.order}>
                      <rect x={sx1} y={segSyTop} width={colPx} height={segH}
                        fill={fill} stroke={stroke} strokeWidth={isSelected ? 1.4 : 0.8} />
                      {colPx > 14 && segH > 12 && (
                        <text
                          x={cx} y={cySeg}
                          textAnchor="middle" dominantBaseline="middle"
                          fill={col.excluded ? '#94a3b8' : '#111'}
                          fontSize={(colPx > 40 ? 11 : colPx > 22 ? 9 : 7) * FS}
                          fontFamily="Arial,sans-serif"
                          transform={`rotate(-90,${cx},${cySeg})`}
                        >
                          {lenMm}
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* Overlap bands between consecutive segments */}
                {col.segments.slice(1).map((seg) => {
                  const overlapStart = seg.startM
                  const overlapEnd = seg.startM + profile.overlapM
                  const [, obTop] = toSvg(wx1, overlapEnd)
                  const [, obBot] = toSvg(wx1, overlapStart)
                  return (
                    <rect key={`ov${seg.order}`} x={sx1} y={obTop} width={colPx} height={obBot - obTop}
                      fill={`url(#${OVERLAP_HATCH_ID})`} stroke="#d97706" strokeWidth={0.6} />
                  )
                })}

                {/* Click-to-select overlay: kiválasztja az oszlopot kézi
                    megosztáshoz vagy a rendelésből való kihagyáshoz */}
                {onSelectColumn && (
                  <rect
                    x={sx1} y={colSyTop} width={colPx} height={colSyBot - colSyTop}
                    fill="transparent"
                    className="cursor-pointer hover:fill-blue-500/10 print:hidden"
                    onClick={() => onSelectColumn(col.index)}
                  >
                    <title>{col.excluded ? 'Kattints a rendelésbe való visszavételhez' : isManualSplit ? 'Kattints a megosztás módosításához' : 'Kattints a lemez megosztásához vagy kihagyásához'}</title>
                  </rect>
                )}
              </g>
            )
          })}

          {/* ── Polygon outline (dotted, on top of columns) ── */}
          <polygon points={polyPtStr} fill="none" stroke="#000" strokeWidth={1.2} strokeDasharray="5 4" />

          {/* ── Column separator lines (clipped inside polygon) ── */}
          {result.columns.map((col) => {
            if (col.index === 0) return null
            const wx = startX + col.index * profile.effectiveWidthM
            const [sx] = toSvg(wx, 0)
            const [, syB] = toSvg(wx, 0)
            const [, syT] = toSvg(wx, maxY * 1.05)
            return (
              <line key={`sep${col.index}`}
                x1={sx} y1={syT} x2={sx} y2={syB}
                stroke="#555" strokeWidth={0.7}
                clipPath={`url(#${clipId})`} />
            )
          })}

          {/* ── Edge length labels + kattintható él-célpontok (kellékekhez) ── */}
          {plane.points.map(([wx1, wy1], i) => {
            const [wx2, wy2] = plane.points[(i + 1) % plane.points.length]
            const [sx1, sy1] = toSvg(wx1, wy1)
            const [sx2, sy2] = toSvg(wx2, wy2)
            const mx = (sx1 + sx2) / 2
            const my = (sy1 + sy2) / 2
            // perpendicular offset (inward)
            const dx = sx2 - sx1
            const dy = sy2 - sy1
            const len = Math.hypot(dx, dy)
            const nx = -dy / len
            const ny =  dx / len
            const OFF = 11 * FS
            const lx = mx + nx * OFF
            const ly = my + ny * OFF
            const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI
            const rotate = Math.abs(angleDeg) > 90 ? angleDeg + 180 : angleDeg
            const edgeLenMm = Math.round(edges[i].lengthM * 1000)
            const isSelectedEdge = selectedEdge === i
            return (
              <g key={`el${i}`}>
                <rect
                  x={lx - 17 * FS} y={ly - 6 * FS} width={34 * FS} height={11 * FS} rx={2}
                  fill={isSelectedEdge ? '#dbeafe' : 'white'} opacity={0.9}
                  transform={`rotate(${rotate},${lx},${ly})`}
                />
                <text
                  x={lx} y={ly + 4 * FS} textAnchor="middle"
                  fill="#1d4ed8" fontSize={9 * FS} fontFamily="Arial,sans-serif" fontWeight="bold"
                  transform={`rotate(${rotate},${lx},${ly})`}
                >
                  {edgeLenMm}
                </text>
                {onSelectEdge && (
                  <line
                    x1={sx1} y1={sy1} x2={sx2} y2={sy2}
                    stroke="transparent" strokeWidth={14}
                    className="cursor-pointer hover:stroke-blue-500/20 print:hidden"
                    onClick={() => onSelectEdge(i)}
                  >
                    <title>Kattints az élhez tartozó kellékek megadásához</title>
                  </line>
                )}
              </g>
            )
          })}

          {/* ── Polygon vertex dots ── */}
          {plane.points.map(([wx, wy], i) => {
            const [sx, sy] = toSvg(wx, wy)
            return <circle key={i} cx={sx} cy={sy} r={4} fill="#000" />
          })}

          {/* ── Eave overhang line — csak modulrácshoz kötött (pl. cserepeslemez)
              profiloknál értelmezett, trapézlemeznél nem használt ── */}
          {profile.moduleM !== null && plane.eaveOverhangM > 0 && (() => {
            const [x0, ey] = toSvg(viewLeft, plane.eaveOverhangM)
            const [x1] = toSvg(viewRight, plane.eaveOverhangM)
            return <line x1={x0} y1={ey} x2={x1} y2={ey}
              stroke="#999" strokeWidth={0.8} strokeDasharray="4 3" />
          })()}

          {/* ── Bottom dimension: polygon width ── */}
          {(() => {
            const [px0, py0] = toSvg(minX, 0)
            const [px1]      = toSvg(maxX, 0)
            const dy = py0 + 28
            return (
              <g>
                <line x1={px0} y1={dy} x2={px1} y2={dy} stroke="#1d4ed8" strokeWidth={1} />
                <line x1={px0} y1={dy - 5} x2={px0} y2={dy + 5} stroke="#1d4ed8" strokeWidth={1} />
                <line x1={px1} y1={dy - 5} x2={px1} y2={dy + 5} stroke="#1d4ed8" strokeWidth={1} />
                {/* leader from baseline */}
                <line x1={px0} y1={py0} x2={px0} y2={dy} stroke="#bbb" strokeWidth={0.5} strokeDasharray="2 3" />
                <line x1={px1} y1={py0} x2={px1} y2={dy} stroke="#bbb" strokeWidth={0.5} strokeDasharray="2 3" />
                <rect x={(px0 + px1) / 2 - 24 * FS} y={dy - 8 * FS} width={48 * FS} height={14 * FS} rx={2} fill="white" />
                <text x={(px0 + px1) / 2} y={dy + 4 * FS} textAnchor="middle"
                  fill="#1d4ed8" fontSize={11 * FS} fontWeight="bold" fontFamily="Arial,sans-serif">
                  {totalWidthMm}
                </text>
              </g>
            )
          })()}

          {/* ── Bottom: total sheet span (if different from polygon width) ── */}
          {totalSheetWidthMm !== totalWidthMm && (() => {
            const [sx0, sy0] = toSvg(startX, 0)
            const [sx1]      = toSvg(startX + totalSheetW, 0)
            const dy = sy0 + 50
            return (
              <g>
                <line x1={sx0} y1={dy} x2={sx1} y2={dy} stroke="#555" strokeWidth={0.8} />
                <line x1={sx0} y1={dy - 4} x2={sx0} y2={dy + 4} stroke="#555" strokeWidth={0.8} />
                <line x1={sx1} y1={dy - 4} x2={sx1} y2={dy + 4} stroke="#555" strokeWidth={0.8} />
                <rect x={(sx0 + sx1) / 2 - 22 * FS} y={dy - 7 * FS} width={44 * FS} height={12 * FS} rx={2} fill="white" />
                <text x={(sx0 + sx1) / 2} y={dy + 3 * FS} textAnchor="middle"
                  fill="#555" fontSize={9 * FS} fontFamily="Arial,sans-serif">
                  {totalSheetWidthMm}
                </text>
              </g>
            )
          })()}

          {/* ── Left: height dimension ── */}
          {(() => {
            const [, yBot] = toSvg(0, 0)
            const [, yTop] = toSvg(0, maxY)
            const dx = ox - 28
            const hMm = Math.round(maxY * 1000)
            const my = (yBot + yTop) / 2
            return (
              <g>
                <line x1={dx} y1={yBot} x2={dx} y2={yTop} stroke="#555" strokeWidth={0.8} />
                <line x1={dx - 4} y1={yBot} x2={dx + 4} y2={yBot} stroke="#555" strokeWidth={0.8} />
                <line x1={dx - 4} y1={yTop} x2={dx + 4} y2={yTop} stroke="#555" strokeWidth={0.8} />
                <rect x={dx - 20 * FS} y={my - 7 * FS} width={40 * FS} height={13 * FS} rx={2} fill="white" />
                <text x={dx} y={my + 4 * FS} textAnchor="middle"
                  fill="#555" fontSize={10 * FS} fontFamily="Arial,sans-serif"
                  transform={`rotate(-90,${dx},${my})`}>{hMm}</text>
              </g>
            )
          })()}

          {/* ── Legend (bottom-right) ── */}
          {(() => {
            const legendX = SVG_W - PAD.right + 4
            const legendY0 = SVG_H - 10
            return (
              <g>
                {uniqueLengths.map((len, i) => {
                  const cnt = allSegments.filter(s => s.lengthM === len).length
                  const seg = allSegments.find(s => s.lengthM === len)!
                  const ly = legendY0 - (uniqueLengths.length - 1 - i) * 14 * FS
                  const overLimit = len > profile.maxSingleLengthM
                  const moduleInfo = profile.moduleM !== null
                    ? ` (${seg.modules}×${profile.moduleM * 1000}+${Math.round((len - seg.modules * profile.moduleM) * 1000)})`
                    : ''
                  return (
                    <g key={len}>
                      <rect x={legendX} y={ly - 9 * FS} width={9 * FS} height={9 * FS} fill={overLimit ? '#fecaca' : '#ddd'} stroke={overLimit ? '#dc2626' : '#888'} strokeWidth={0.6} rx={1} />
                      <text x={legendX + 13 * FS} y={ly} fill="#333" fontSize={8.5 * FS} fontFamily="Arial,sans-serif">
                        {Math.round(len * 1000)} mm — {cnt} db{moduleInfo}
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}
