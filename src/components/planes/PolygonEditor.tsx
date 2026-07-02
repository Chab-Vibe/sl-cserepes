import { Fragment } from 'react'
import { Trash2, Plus } from 'lucide-react'

interface Props {
  points: [number, number][]
  onChange: (points: [number, number][]) => void
}

const CW = 340
const CH = 210
const PAD = { top: 16, right: 16, bottom: 26, left: 34 }
const DW = CW - PAD.left - PAD.right
const DH = CH - PAD.top - PAD.bottom

// Nézeti tartomány: mindig tartalmazza az origót, hogy a 0-vonalak
// (tengelyek) mindig láthatók legyenek negatív koordináták esetén is.
function getExtent(points: [number, number][]) {
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

function getScale(ext: { minX: number; maxX: number; minY: number; maxY: number }) {
  const viewW = ext.maxX - ext.minX
  const viewH = ext.maxY - ext.minY
  return Math.min(DW / viewW, DH / viewH)
}

export function PolygonEditor({ points, onChange }: Props) {
  const ext = getExtent(points)
  const scale = getScale(ext)
  const project = (wx: number, wy: number): [number, number] =>
    [PAD.left + (wx - ext.minX) * scale, PAD.top + DH - (wy - ext.minY) * scale]
  const svgPts = points.map(([x, y]) => project(x, y))
  const closed = points.length >= 3
  const pathD = svgPts.map(([sx, sy], i) => `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`).join(' ') + (closed ? ' Z' : '')

  // Grid
  const gridLines: React.ReactNode[] = []
  for (let x = Math.floor(ext.minX); x <= Math.ceil(ext.maxX); x++) {
    const [sx] = project(x, 0)
    if (sx < PAD.left - 1 || sx > PAD.left + DW + 1) continue
    const isOrigin = x === 0
    gridLines.push(
      <line key={`gx${x}`} x1={sx} y1={PAD.top} x2={sx} y2={PAD.top + DH}
        stroke={isOrigin ? 'rgba(15,23,42,0.22)' : 'rgba(15,23,42,0.06)'} strokeWidth={isOrigin ? 1.2 : 1} />,
      <text key={`tx${x}`} x={sx} y={PAD.top + DH + 15} textAnchor="middle" fill="rgba(15,23,42,0.4)" fontSize={10}>{x}m</text>
    )
  }
  for (let y = Math.floor(ext.minY); y <= Math.ceil(ext.maxY); y++) {
    const [, sy] = project(0, y)
    if (sy < PAD.top - 1 || sy > PAD.top + DH + 1) continue
    const isOrigin = y === 0
    gridLines.push(
      <line key={`gy${y}`} x1={PAD.left} y1={sy} x2={PAD.left + DW} y2={sy}
        stroke={isOrigin ? 'rgba(15,23,42,0.22)' : 'rgba(15,23,42,0.06)'} strokeWidth={isOrigin ? 1.2 : 1} />,
      <text key={`ty${y}`} x={PAD.left - 4} y={sy + 3} textAnchor="end" fill="rgba(15,23,42,0.4)" fontSize={10}>{y}m</text>
    )
  }

  const addPoint = () => onChange([...points, [0, 0]])
  const deletePoint = (i: number) => onChange(points.filter((_, j) => j !== i))
  const updateX = (i: number, v: number) => onChange(points.map((p, j) => j === i ? [v, p[1]] : p) as [number,number][])
  const updateY = (i: number, v: number) => onChange(points.map((p, j) => j === i ? [p[0], v] : p) as [number,number][])

  return (
    <div>
      {/* Polygon preview */}
      <svg width={CW} height={CH} className="rounded-xl border border-slate-200" style={{ background: '#f8fafc' }}>
        {gridLines}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + DH} stroke="rgba(15,23,42,0.15)" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top + DH} x2={PAD.left + DW} y2={PAD.top + DH} stroke="rgba(15,23,42,0.15)" strokeWidth={1} />

        {points.length >= 2 && (
          <path d={pathD} fill={closed ? 'rgba(37,99,235,0.12)' : 'none'}
            stroke="rgba(37,99,235,0.85)" strokeWidth={1.5}
            strokeDasharray={closed ? undefined : '6 3'}
          />
        )}

        {svgPts.map(([sx, sy], i) => (
          <g key={i}>
            <circle cx={sx} cy={sy} r={6}
              fill={i === 0 ? 'rgba(16,185,129,0.9)' : 'rgba(37,99,235,0.85)'}
              stroke="white" strokeWidth={1.4}
            />
            <text x={sx + 8} y={sy - 5} fill="rgba(15,23,42,0.65)" fontSize={10} fontWeight="600">{i + 1}</text>
          </g>
        ))}

        {points.length === 0 && (
          <text x={CW / 2} y={CH / 2} textAnchor="middle" fill="rgba(15,23,42,0.3)" fontSize={12}>
            Add meg a pontokat alul
          </text>
        )}
      </svg>

      {/* Coordinate table */}
      <div className="mt-2 text-sm">
        <div className="grid grid-cols-[1.4rem_1fr_1fr_1.6rem] gap-x-2 gap-y-1.5 items-center">
          <span className="text-slate-400 text-center">#</span>
          <span className="text-slate-400">X (m) — szélesség</span>
          <span className="text-slate-400">Y (m) — magasság</span>
          <span />
          {points.map(([wx, wy], i) => (
            <Fragment key={i}>
              <span className="text-slate-500 text-center font-mono">{i + 1}</span>
              <input
                type="number" step={0.1}
                value={wx === 0 ? '' : wx}
                placeholder="0.0"
                onChange={e => {
                  const raw = e.target.value
                  if (raw === '') { updateX(i, 0); return }
                  const parsed = parseFloat(raw)
                  if (!Number.isNaN(parsed)) updateX(i, parsed)
                }}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 outline-none focus:border-blue-400 w-full"
              />
              <input
                type="number" step={0.1}
                value={wy === 0 ? '' : wy}
                placeholder="0.0"
                onChange={e => {
                  const raw = e.target.value
                  if (raw === '') { updateY(i, 0); return }
                  const parsed = parseFloat(raw)
                  if (!Number.isNaN(parsed)) updateY(i, parsed)
                }}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 outline-none focus:border-blue-400 w-full"
              />
              <button onClick={() => deletePoint(i)} className="text-slate-300 hover:text-red-500 transition-colors flex justify-center">
                <Trash2 size={14} />
              </button>
            </Fragment>
          ))}
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={addPoint}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm transition-colors"
          >
            <Plus size={15} /> Új pont
          </button>
          {points.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="flex items-center gap-1 text-slate-300 hover:text-red-500 text-sm transition-colors ml-auto"
            >
              <Trash2 size={14} /> Törlés
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
