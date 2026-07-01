import { Fragment } from 'react'
import { Trash2, Plus } from 'lucide-react'

interface Props {
  points: [number, number][]
  onChange: (points: [number, number][]) => void
}

const CW = 320
const CH = 200
const PAD = { top: 16, right: 16, bottom: 24, left: 32 }
const DW = CW - PAD.left - PAD.right
const DH = CH - PAD.top - PAD.bottom

function getScale(points: [number, number][]) {
  const maxX = points.length ? Math.max(...points.map(p => p[0])) : 0
  const maxY = points.length ? Math.max(...points.map(p => p[1])) : 0
  const viewW = Math.max(maxX + 0.5, 5)
  const viewH = Math.max(maxY + 0.5, 3)
  return Math.min(DW / viewW, DH / viewH)
}

function toSvg(wx: number, wy: number, scale: number): [number, number] {
  return [PAD.left + wx * scale, PAD.top + DH - wy * scale]
}

export function PolygonEditor({ points, onChange }: Props) {
  const scale = getScale(points)
  const svgPts = points.map(([x, y]) => toSvg(x, y, scale))
  const closed = points.length >= 3
  const pathD = svgPts.map(([sx, sy], i) => `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`).join(' ') + (closed ? ' Z' : '')

  // Grid
  const maxX = points.length ? Math.max(...points.map(p => p[0])) : 0
  const maxY = points.length ? Math.max(...points.map(p => p[1])) : 0
  const viewW = Math.max(maxX + 0.5, 5)
  const viewH = Math.max(maxY + 0.5, 3)
  const gridLines: React.ReactNode[] = []
  for (let x = 0; x <= Math.ceil(viewW); x++) {
    const [sx] = toSvg(x, 0, scale)
    if (sx > PAD.left + DW + 1) continue
    gridLines.push(
      <line key={`gx${x}`} x1={sx} y1={PAD.top} x2={sx} y2={PAD.top + DH} stroke="rgba(15,23,42,0.06)" strokeWidth={1} />,
      <text key={`tx${x}`} x={sx} y={PAD.top + DH + 13} textAnchor="middle" fill="rgba(15,23,42,0.32)" fontSize={8}>{x}m</text>
    )
  }
  for (let y = 0; y <= Math.ceil(viewH); y++) {
    const [, sy] = toSvg(0, y, scale)
    if (sy < PAD.top - 1) continue
    gridLines.push(
      <line key={`gy${y}`} x1={PAD.left} y1={sy} x2={PAD.left + DW} y2={sy} stroke="rgba(15,23,42,0.06)" strokeWidth={1} />,
      <text key={`ty${y}`} x={PAD.left - 4} y={sy + 3} textAnchor="end" fill="rgba(15,23,42,0.32)" fontSize={8}>{y}m</text>
    )
  }

  const addPoint = () => onChange([...points, [0, 0]])
  const deletePoint = (i: number) => onChange(points.filter((_, j) => j !== i))
  const updateX = (i: number, v: number) => onChange(points.map((p, j) => j === i ? [Math.max(0, v), p[1]] : p) as [number,number][])
  const updateY = (i: number, v: number) => onChange(points.map((p, j) => j === i ? [p[0], Math.max(0, v)] : p) as [number,number][])

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
            <circle cx={sx} cy={sy} r={5}
              fill={i === 0 ? 'rgba(16,185,129,0.9)' : 'rgba(37,99,235,0.85)'}
              stroke="white" strokeWidth={1.2}
            />
            <text x={sx + 7} y={sy - 4} fill="rgba(15,23,42,0.55)" fontSize={8}>{i + 1}</text>
          </g>
        ))}

        {points.length === 0 && (
          <text x={CW / 2} y={CH / 2} textAnchor="middle" fill="rgba(15,23,42,0.25)" fontSize={10}>
            Add meg a pontokat alul
          </text>
        )}
      </svg>

      {/* Coordinate table */}
      <div className="mt-2 text-xs">
        <div className="grid grid-cols-[1.2rem_1fr_1fr_1.4rem] gap-x-2 gap-y-1.5 items-center">
          <span className="text-slate-400 text-center">#</span>
          <span className="text-slate-400">X (m) — szélesség</span>
          <span className="text-slate-400">Y (m) — magasság</span>
          <span />
          {points.map(([wx, wy], i) => (
            <Fragment key={i}>
              <span className="text-slate-500 text-center font-mono">{i + 1}</span>
              <input
                type="number" step={0.1} min={0}
                value={wx === 0 && points[i][0] === 0 ? '' : wx}
                placeholder="0.0"
                onChange={e => updateX(i, parseFloat(e.target.value) || 0)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 outline-none focus:border-blue-400 w-full"
              />
              <input
                type="number" step={0.1} min={0}
                value={wy === 0 && points[i][1] === 0 ? '' : wy}
                placeholder="0.0"
                onChange={e => updateY(i, parseFloat(e.target.value) || 0)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 outline-none focus:border-blue-400 w-full"
              />
              <button onClick={() => deletePoint(i)} className="text-slate-300 hover:text-red-500 transition-colors flex justify-center">
                <Trash2 size={12} />
              </button>
            </Fragment>
          ))}
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={addPoint}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs transition-colors"
          >
            <Plus size={13} /> Új pont
          </button>
          {points.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="flex items-center gap-1 text-slate-300 hover:text-red-500 text-xs transition-colors ml-auto"
            >
              <Trash2 size={12} /> Törlés
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
