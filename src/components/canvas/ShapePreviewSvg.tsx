import { useRef, useState } from 'react'

export interface ShapeExtent {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export const SHAPE_CANVAS_W = 900
export const SHAPE_CANVAS_H = 560
export const SHAPE_CANVAS_PAD = { top: 24, right: 24, bottom: 40, left: 50 }

const DW = SHAPE_CANVAS_W - SHAPE_CANVAS_PAD.left - SHAPE_CANVAS_PAD.right
const DH = SHAPE_CANVAS_H - SHAPE_CANVAS_PAD.top - SHAPE_CANVAS_PAD.bottom

// Nézeti tartomány: mindig tartalmazza az origót, hogy a 0-vonalak
// (tengelyek) mindig láthatók legyenek negatív koordináták esetén is.
export function getShapeExtent(points: [number, number][]): ShapeExtent {
  const xs = points.map(p => p[0])
  const ys = points.map(p => p[1])
  let minX = Math.min(0, ...xs)
  let maxX = Math.max(0, ...xs)
  let minY = Math.min(0, ...ys)
  let maxY = Math.max(0, ...ys)
  maxX = Math.max(maxX, minX + 4.5)
  maxY = Math.max(maxY, minY + 2.7)
  minX -= 0.3; maxX += 0.3
  minY -= 0.3; maxY += 0.3
  return { minX, maxX, minY, maxY }
}

export function getShapeScale(ext: ShapeExtent): number {
  const viewW = ext.maxX - ext.minX
  const viewH = ext.maxY - ext.minY
  return Math.min(DW / viewW, DH / viewH)
}

function clientToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const transformed = pt.matrixTransform(ctm.inverse())
  return { x: transformed.x, y: transformed.y }
}

interface Props {
  points: [number, number][]
  // Nézeti tartomány/lépték a szülőtől (ShapeWorkspace) — húzás közben a
  // szülő "befagyasztja" ezt, hogy az auto-fit nézet ne csússzon el a
  // húzott pont alól (és a RulerCanvas vonalzói is ugyanezt lássák).
  ext: ShapeExtent
  scale: number
  onChange?: (points: [number, number][]) => void
  onDragStateChange?: (dragging: boolean) => void
}

export function ShapePreviewSvg({ points, ext, scale, onChange, onDragStateChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragIndexRef = useRef<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  const project = (wx: number, wy: number): [number, number] =>
    [SHAPE_CANVAS_PAD.left + (wx - ext.minX) * scale, SHAPE_CANVAS_PAD.top + DH - (wy - ext.minY) * scale]
  const toWorld = (sx: number, sy: number): [number, number] => [
    Math.round((ext.minX + (sx - SHAPE_CANVAS_PAD.left) / scale) * 100) / 100,
    Math.round((ext.minY + (SHAPE_CANVAS_PAD.top + DH - sy) / scale) * 100) / 100,
  ]

  const handlePointDown = (i: number) => (e: React.PointerEvent) => {
    if (!onChange) return
    e.stopPropagation()
    const svg = svgRef.current
    if (!svg) return
    dragIndexRef.current = i
    setDraggingIndex(i)
    onDragStateChange?.(true)
    const onMove = (ev: PointerEvent) => {
      const idx = dragIndexRef.current
      if (idx === null) return
      const { x: sx, y: sy } = clientToSvgPoint(svg, ev.clientX, ev.clientY)
      const [wx, wy] = toWorld(sx, sy)
      onChange(points.map((p, j) => j === idx ? [wx, wy] : p) as [number, number][])
    }
    const onUp = () => {
      dragIndexRef.current = null
      setDraggingIndex(null)
      onDragStateChange?.(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const svgPts = points.map(([x, y]) => project(x, y))
  const closed = points.length >= 3
  const pathD = svgPts.map(([sx, sy], i) => `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`).join(' ') + (closed ? ' Z' : '')

  const gridLines: React.ReactNode[] = []
  for (let x = Math.floor(ext.minX); x <= Math.ceil(ext.maxX); x++) {
    const [sx] = project(x, 0)
    if (sx < SHAPE_CANVAS_PAD.left - 1 || sx > SHAPE_CANVAS_PAD.left + DW + 1) continue
    const isOrigin = x === 0
    gridLines.push(
      <line key={`gx${x}`} x1={sx} y1={SHAPE_CANVAS_PAD.top} x2={sx} y2={SHAPE_CANVAS_PAD.top + DH}
        stroke={isOrigin ? 'rgba(15,23,42,0.22)' : 'rgba(15,23,42,0.06)'} strokeWidth={isOrigin ? 1.2 : 1} />,
      <text key={`tx${x}`} x={sx} y={SHAPE_CANVAS_PAD.top + DH + 15} textAnchor="middle" fill="rgba(15,23,42,0.4)" fontSize={10}>{x}m</text>
    )
  }
  for (let y = Math.floor(ext.minY); y <= Math.ceil(ext.maxY); y++) {
    const [, sy] = project(0, y)
    if (sy < SHAPE_CANVAS_PAD.top - 1 || sy > SHAPE_CANVAS_PAD.top + DH + 1) continue
    const isOrigin = y === 0
    gridLines.push(
      <line key={`gy${y}`} x1={SHAPE_CANVAS_PAD.left} y1={sy} x2={SHAPE_CANVAS_PAD.left + DW} y2={sy}
        stroke={isOrigin ? 'rgba(15,23,42,0.22)' : 'rgba(15,23,42,0.06)'} strokeWidth={isOrigin ? 1.2 : 1} />,
      <text key={`ty${y}`} x={SHAPE_CANVAS_PAD.left - 4} y={sy + 3} textAnchor="end" fill="rgba(15,23,42,0.4)" fontSize={10}>{y}m</text>
    )
  }

  return (
    <svg ref={svgRef} width={SHAPE_CANVAS_W} height={SHAPE_CANVAS_H} style={{ background: '#f8fafc' }}>
      {gridLines}
      <line x1={SHAPE_CANVAS_PAD.left} y1={SHAPE_CANVAS_PAD.top} x2={SHAPE_CANVAS_PAD.left} y2={SHAPE_CANVAS_PAD.top + DH} stroke="rgba(15,23,42,0.15)" strokeWidth={1} />
      <line x1={SHAPE_CANVAS_PAD.left} y1={SHAPE_CANVAS_PAD.top + DH} x2={SHAPE_CANVAS_PAD.left + DW} y2={SHAPE_CANVAS_PAD.top + DH} stroke="rgba(15,23,42,0.15)" strokeWidth={1} />

      {points.length >= 2 && (
        <path d={pathD} fill={closed ? 'rgba(37,99,235,0.12)' : 'none'}
          stroke="rgba(37,99,235,0.85)" strokeWidth={1.5}
          strokeDasharray={closed ? undefined : '6 3'}
        />
      )}

      {svgPts.map(([sx, sy], i) => {
        const isDragging = draggingIndex === i
        return (
          <g key={i}>
            <circle cx={sx} cy={sy} r={6}
              fill={i === 0 ? 'rgba(16,185,129,0.9)' : isDragging ? '#1d4ed8' : 'rgba(37,99,235,0.85)'}
              stroke="white" strokeWidth={1.4}
            />
            {onChange && (
              <circle
                cx={sx} cy={sy} r={13}
                fill="transparent"
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointDown(i)}
              />
            )}
            <text x={sx + 8} y={sy - 5} fill="rgba(15,23,42,0.65)" fontSize={10} fontWeight="600">{i + 1}</text>
            {isDragging && (
              <text x={sx + 10} y={sy + 18} fill="#1d4ed8" fontSize={11} fontWeight="bold">
                {points[i][0].toFixed(2)}, {points[i][1].toFixed(2)} m
              </text>
            )}
          </g>
        )
      })}

      {points.length === 0 && (
        <text x={SHAPE_CANVAS_W / 2} y={SHAPE_CANVAS_H / 2} textAnchor="middle" fill="rgba(15,23,42,0.3)" fontSize={13}>
          Add meg a pontokat a jobb oldali táblázatban
        </text>
      )}
    </svg>
  )
}
