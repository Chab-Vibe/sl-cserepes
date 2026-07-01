import type { RoofPlane, PlaneResult } from '../../types'
import { polyWidth, polyHeight, SHEET, getStartOffset } from '../../utils/calculations'

interface Props {
  plane: RoofPlane
  result: PlaneResult
}

export function SheetLayout({ plane, result }: Props) {
  if (plane.points.length < 3 || result.columns.length === 0) return null

  const maxX = polyWidth(plane.points) || 1
  const maxY = polyHeight(plane.points) || 1
  const startX = getStartOffset(plane)
  const numCols = result.columns.length
  const totalSheetW = numCols * SHEET.EFFECTIVE_WIDTH_M
  const overhangLeft  = Math.max(0, -startX)
  const overhangRight = Math.max(0, startX + totalSheetW - maxX)

  // Drawing canvas
  const SVG_W = 700
  const SVG_H = 440
  const PAD = { top: 40, right: 60, bottom: 70, left: 60 }
  const DW = SVG_W - PAD.left - PAD.right
  const DH = SVG_H - PAD.top - PAD.bottom

  // View includes overhangs
  const viewLeft  = Math.min(startX, 0)
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

  // World coords → SVG (y flipped; viewLeft offset)
  function toSvg(wx: number, wy: number): [number, number] {
    return [ox + (wx - viewLeft) * scale, oy + usedH - wy * scale]
  }

  const polyPtStr = plane.points.map(([wx, wy]) => toSvg(wx, wy).join(',')).join(' ')
  const clipId = `lc-${plane.id}`
  const HATCH_ID = `hatch-${plane.id}`

  function colWorldX(col: PlaneResult['columns'][number]) {
    const x1 = startX + col.index * SHEET.EFFECTIVE_WIDTH_M
    return { x1, x2: x1 + SHEET.EFFECTIVE_WIDTH_M }
  }

  const alignLabel = plane.alignment === 'left' ? 'Bal' : plane.alignment === 'right' ? 'Jobb' : 'Közép'
  const totalWidthMm = Math.round(maxX * 1000)
  const totalSheetWidthMm = Math.round(totalSheetW * 1000)

  // Collect unique sheet lengths for legend
  const uniqueLengths = [...new Set(result.columns.map(c => c.sheetLengthM))].sort((a, b) => a - b)

  return (
    <div className="mt-4 sheet-layout-wrapper">
      <h3 className="text-white/60 print:text-black text-xs font-medium mb-2 uppercase tracking-wider">
        Kiosztási rajz — {plane.name}
        {overhangLeft > 0.001 && <span className="ml-2 text-amber-400">◄ {(overhangLeft*100).toFixed(0)} cm túlnyúlás bal</span>}
        {overhangRight > 0.001 && <span className="ml-2 text-amber-400">► {(overhangRight*100).toFixed(0)} cm túlnyúlás jobb</span>}
      </h3>

      <div className="rounded-xl overflow-hidden border border-white/10 print:border-gray-300 print:rounded-none bg-white">
        <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ background: 'white' }}>
          <defs>
            {/* Hatch for overhang */}
            <pattern id={HATCH_ID} patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={6} stroke="#aaa" strokeWidth={1.2} />
            </pattern>
            {/* Clip to polygon */}
            <clipPath id={clipId}>
              <polygon points={polyPtStr} />
            </clipPath>
          </defs>

          {/* ── Title ── */}
          <text x={SVG_W / 2} y={16} textAnchor="middle" fill="#333" fontSize={10} fontFamily="Arial,sans-serif" fontWeight="bold">
            {plane.name}  ·  Igazítás: {alignLabel}  ·  Modul: {SHEET.MODULE_M * 1000} mm  ·  Hasznos szélesség: {SHEET.EFFECTIVE_WIDTH_M * 1000} mm
          </text>

          {/* ── SHEET COLUMNS ── */}
          {result.columns.map((col) => {
            const { x1: wx1, x2: wx2 } = colWorldX(col)
            const [sx1] = toSvg(wx1, 0)
            const [sx2] = toSvg(wx2, 0)
            const colPx = sx2 - sx1
            const [, syTop] = toSvg(wx1, col.sheetLengthM)
            const [, syBot] = toSvg(wx1, 0)
            const colH = syBot - syTop

            const leftOH  = Math.max(0, 0 - wx1)
            const rightOH = Math.max(0, wx2 - maxX)

            const lenMm = Math.round(col.sheetLengthM * 1000)
            const cx = (sx1 + sx2) / 2
            const cy = (syTop + syBot) / 2

            return (
              <g key={col.index}>
                {/* Column background — white, thin gray border */}
                <rect x={sx1} y={syTop} width={colPx} height={colH}
                  fill="white" stroke="#888" strokeWidth={0.8} />

                {/* Overhang hatch (outside polygon) */}
                {leftOH > 0.001 && (
                  <rect x={sx1} y={syTop} width={leftOH * scale} height={colH}
                    fill={`url(#${HATCH_ID})`} />
                )}
                {rightOH > 0.001 && (
                  <rect x={sx2 - rightOH * scale} y={syTop} width={rightOH * scale} height={colH}
                    fill={`url(#${HATCH_ID})`} />
                )}

                {/* Sheet length label — rotated, centered in column */}
                {colPx > 14 && (
                  <text
                    x={cx} y={cy}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#111"
                    fontSize={colPx > 40 ? 11 : colPx > 22 ? 9 : 7}
                    fontFamily="Arial,sans-serif"
                    transform={`rotate(-90,${cx},${cy})`}
                  >
                    {lenMm}
                  </text>
                )}
              </g>
            )
          })}

          {/* ── Polygon outline (dotted, on top of columns) ── */}
          <polygon points={polyPtStr} fill="none" stroke="#000" strokeWidth={1.2} strokeDasharray="5 4" />

          {/* ── Column separator lines (clipped inside polygon) ── */}
          {result.columns.map((col) => {
            if (col.index === 0) return null
            const wx = startX + col.index * SHEET.EFFECTIVE_WIDTH_M
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

          {/* ── Polygon vertex dots ── */}
          {plane.points.map(([wx, wy], i) => {
            const [sx, sy] = toSvg(wx, wy)
            return <circle key={i} cx={sx} cy={sy} r={4} fill="#000" />
          })}

          {/* ── Eave overhang line ── */}
          {plane.eaveOverhangM > 0 && (() => {
            const [x0, ey] = toSvg(viewLeft, plane.eaveOverhangM)
            const [x1] = toSvg(viewRight, plane.eaveOverhangM)
            return <line x1={x0} y1={ey} x2={x1} y2={ey}
              stroke="#999" strokeWidth={0.8} strokeDasharray="4 3" />
          })()}

          {/* ── Bottom dimension: polygon width ── */}
          {(() => {
            const [px0, py0] = toSvg(0, 0)
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
                <rect x={(px0 + px1) / 2 - 24} y={dy - 8} width={48} height={14} rx={2} fill="white" />
                <text x={(px0 + px1) / 2} y={dy + 4} textAnchor="middle"
                  fill="#1d4ed8" fontSize={11} fontWeight="bold" fontFamily="Arial,sans-serif">
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
                <rect x={(sx0 + sx1) / 2 - 22} y={dy - 7} width={44} height={12} rx={2} fill="white" />
                <text x={(sx0 + sx1) / 2} y={dy + 3} textAnchor="middle"
                  fill="#555" fontSize={9} fontFamily="Arial,sans-serif">
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
                <rect x={dx - 20} y={my - 7} width={40} height={13} rx={2} fill="white" />
                <text x={dx} y={my + 4} textAnchor="middle"
                  fill="#555" fontSize={10} fontFamily="Arial,sans-serif"
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
                  const cnt = result.columns.filter(c => c.sheetLengthM === len).length
                  const col = result.columns.find(c => c.sheetLengthM === len)!
                  const ly = legendY0 - (uniqueLengths.length - 1 - i) * 14
                  return (
                    <g key={len}>
                      <rect x={legendX} y={ly - 9} width={9} height={9} fill="#ddd" stroke="#888" strokeWidth={0.6} rx={1} />
                      <text x={legendX + 13} y={ly} fill="#333" fontSize={8.5} fontFamily="Arial,sans-serif">
                        {Math.round(len * 1000)} mm — {cnt} db  ({col.modules}×350+50+{Math.round(plane.eaveOverhangM * 1000)})
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
