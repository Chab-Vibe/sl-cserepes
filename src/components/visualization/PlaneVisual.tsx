import type { RoofPlane, PlaneResult } from '../../types'
import { polyWidth, polyHeight, SHEET } from '../../utils/calculations'

interface Props {
  plane: RoofPlane
  result: PlaneResult
  width?: number
  height?: number
}

export function PlaneVisual({ plane, result, width = 240, height = 140 }: Props) {
  if (plane.points.length < 3) return null

  const PAD = { top: 8, right: 10, bottom: 18, left: 22 }
  const DW = width - PAD.left - PAD.right
  const DH = height - PAD.top - PAD.bottom

  const maxX = polyWidth(plane.points) || 1
  const maxY = polyHeight(plane.points) || 1
  const scaleX = DW / maxX
  const scaleY = DH / maxY
  const scale = Math.min(scaleX, scaleY)

  const toSvg = (wx: number, wy: number): [number, number] => [
    PAD.left + wx * scale,
    PAD.top + DH - wy * scale,
  ]

  const polyPts = plane.points.map(([wx, wy]) => toSvg(wx, wy).join(',')).join(' ')

  const uniqueLengths = [...new Set(result.columns.map(c => c.sheetLengthM))].sort((a, b) => a - b)
  const palette = [
    ['rgba(96,165,250,0.65)', 'rgba(147,197,253,0.5)'],
    ['rgba(52,211,153,0.65)', 'rgba(110,231,183,0.5)'],
    ['rgba(251,146,60,0.65)', 'rgba(253,186,116,0.5)'],
    ['rgba(167,139,250,0.65)', 'rgba(196,181,253,0.5)'],
  ]
  const colorFor = (len: number, odd: boolean) => {
    const idx = uniqueLengths.indexOf(len) % palette.length
    return odd ? palette[idx][1] : palette[idx][0]
  }

  const maxSheetH = Math.max(...result.columns.map(c => c.sheetLengthM), 0.001)

  return (
    <svg width={width} height={height} className="rounded">
      <rect x={0} y={0} width={width} height={height} fill="rgba(0,0,0,0.2)" rx={6} />
      <defs>
        <clipPath id={`cp-${plane.id}`}>
          <polygon points={polyPts} />
        </clipPath>
      </defs>

      {/* Column bars clipped to polygon */}
      <g clipPath={`url(#cp-${plane.id})`}>
        {result.columns.map(col => {
          const x1 = col.index * SHEET.EFFECTIVE_WIDTH_M
          const [sx] = toSvg(x1, 0)
          const colPx = SHEET.EFFECTIVE_WIDTH_M * scale
          const sheetPx = (col.sheetLengthM / maxSheetH) * DH
          const [, sy] = toSvg(0, col.sheetLengthM)
          return (
            <rect
              key={col.index}
              x={sx} y={sy}
              width={colPx - 0.5} height={sheetPx}
              fill={colorFor(col.sheetLengthM, col.index % 2 === 1)}
              stroke="rgba(255,255,255,0.1)" strokeWidth={0.4}
            />
          )
        })}
      </g>

      {/* Eave overhang dashed line */}
      {plane.eaveOverhangM > 0 && (
        (() => {
          const eaveRatio = plane.eaveOverhangM / maxSheetH
          const [, eaveSy] = toSvg(0, eaveRatio * maxSheetH)
          return (
            <line
              x1={PAD.left} y1={eaveSy}
              x2={PAD.left + DW} y2={eaveSy}
              stroke="rgba(251,191,36,0.6)" strokeWidth={1} strokeDasharray="4 3"
            />
          )
        })()
      )}

      {/* Polygon outline */}
      <polygon points={polyPts} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.2} />

      {/* Width label */}
      <text x={PAD.left + maxX * scale / 2} y={height - 4}
        textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={8}>
        {maxX.toFixed(2)} m
      </text>

      {/* Height label */}
      <text
        x={PAD.left - 7} y={PAD.top + DH / 2}
        textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={8}
        transform={`rotate(-90,${PAD.left - 7},${PAD.top + DH / 2})`}
      >
        {maxY.toFixed(2)} m
      </text>

      {/* Sheet count badge */}
      {result.totalSheets > 0 && (
        <>
          <rect x={width - 42} y={PAD.top} width={34} height={15} rx={4} fill="rgba(37,99,235,0.8)" />
          <text x={width - 25} y={PAD.top + 10} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">
            {result.totalSheets} db
          </text>
        </>
      )}
    </svg>
  )
}
