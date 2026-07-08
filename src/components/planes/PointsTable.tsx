import { Fragment, useEffect, useRef } from 'react'
import { Trash2, Plus } from 'lucide-react'

interface Props {
  points: [number, number][]
  onChange: (points: [number, number][]) => void
}

export function PointsTable({ points, onChange }: Props) {
  const xRefs = useRef<(HTMLInputElement | null)[]>([])
  const yRefs = useRef<(HTMLInputElement | null)[]>([])
  const focusNewRowRef = useRef(false)

  const addPoint = () => onChange([...points, [0, 0]])
  const deletePoint = (i: number) => onChange(points.filter((_, j) => j !== i))
  const updateX = (i: number, v: number) => onChange(points.map((p, j) => j === i ? [v, p[1]] : p) as [number, number][])
  const updateY = (i: number, v: number) => onChange(points.map((p, j) => j === i ? [p[0], v] : p) as [number, number][])

  // Ha az utolsó sor Y mezőjében Enter-t nyomva új pont jött létre, a
  // következő render után fókuszáljuk az új sor X mezőjét.
  useEffect(() => {
    if (focusNewRowRef.current) {
      focusNewRowRef.current = false
      xRefs.current[points.length - 1]?.focus()
    }
  }, [points.length])

  const handleXKeyDown = (i: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      yRefs.current[i]?.focus()
    }
  }
  const handleYKeyDown = (i: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (i + 1 < points.length) {
        xRefs.current[i + 1]?.focus()
      } else {
        focusNewRowRef.current = true
        addPoint()
      }
    }
  }

  return (
    <div className="text-sm">
      <div className="grid grid-cols-[1.4rem_1fr_1fr_1.6rem] gap-x-2 gap-y-1.5 items-center">
        <span className="text-slate-400 text-center">#</span>
        <span className="text-slate-400">X (mm) — szélesség</span>
        <span className="text-slate-400">Y (mm) — magasság</span>
        <span />
        {points.map(([wx, wy], i) => (
          <Fragment key={i}>
            <span className="text-slate-500 text-center font-mono">{i + 1}</span>
            <input
              ref={el => { xRefs.current[i] = el }}
              type="number" step={10}
              value={wx === 0 ? '' : Math.round(wx * 1000)}
              placeholder="0"
              onChange={e => {
                const raw = e.target.value
                if (raw === '') { updateX(i, 0); return }
                const parsed = parseFloat(raw)
                if (!Number.isNaN(parsed)) updateX(i, parsed / 1000)
              }}
              onKeyDown={handleXKeyDown(i)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 outline-none focus:border-blue-400 w-full"
            />
            <input
              ref={el => { yRefs.current[i] = el }}
              type="number" step={10}
              value={wy === 0 ? '' : Math.round(wy * 1000)}
              placeholder="0"
              onChange={e => {
                const raw = e.target.value
                if (raw === '') { updateY(i, 0); return }
                const parsed = parseFloat(raw)
                if (!Number.isNaN(parsed)) updateY(i, parsed / 1000)
              }}
              onKeyDown={handleYKeyDown(i)}
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
  )
}
