import { Trash2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import type { RoofPlane, PlaneResult, Alignment } from '../../types'
import { PolygonEditor } from './PolygonEditor'
import { SheetLayout } from '../visualization/SheetLayout'
import { isPlaneValid, polyWidth, polyHeight } from '../../utils/calculations'

interface Props {
  plane: RoofPlane
  result: PlaneResult
  onChange: (patch: Partial<RoofPlane>) => void
  onRemove: () => void
}

const ALIGN_OPTS: { value: Alignment; icon: React.ReactNode; label: string }[] = [
  { value: 'left',   icon: <AlignLeft size={14} />,   label: 'Bal' },
  { value: 'center', icon: <AlignCenter size={14} />, label: 'Közép' },
  { value: 'right',  icon: <AlignRight size={14} />,  label: 'Jobb' },
]

export function PlaneCard({ plane, result, onChange, onRemove }: Props) {
  const valid = isPlaneValid(plane)
  const lengthMap = new Map<number, number>()
  for (const col of result.columns) {
    lengthMap.set(col.sheetLengthM, (lengthMap.get(col.sheetLengthM) ?? 0) + 1)
  }
  const lengthEntries = [...lengthMap.entries()].sort((a, b) => a[0] - b[0])
  const w = polyWidth(plane.points)
  const h = polyHeight(plane.points)

  return (
    <div className={`relative rounded-2xl p-4 backdrop-blur-xl border transition-colors print:rounded-none print:border-0 print:p-0 print:bg-transparent ${
      valid ? 'bg-white/10 border-white/20' : 'bg-white/10 border-orange-400/40'
    }`}>
      <button onClick={onRemove} className="absolute top-3 right-3 text-white/40 hover:text-red-400 transition-colors print:hidden">
        <Trash2 size={16} />
      </button>

      {/* Name — shown as heading in print */}
      <input
        className="w-full bg-transparent text-white font-semibold text-sm mb-3 outline-none border-b border-white/20 pb-1 pr-6 print:hidden"
        value={plane.name}
        onChange={e => onChange({ name: e.target.value })}
        placeholder="Sík neve"
      />

      {/* Polygon editor */}
      <div className="print:hidden">
        <PolygonEditor points={plane.points} onChange={pts => onChange({ points: pts })} />
      </div>

      {/* Controls row: csurgó + igazítás */}
      <div className="flex items-center gap-4 mt-3 flex-wrap print:hidden">
        <label className="flex items-center gap-2 text-xs">
          <span className="text-white/50">Csurgó (m)</span>
          <input
            type="number" min={0} step={0.01}
            value={plane.eaveOverhangM || ''}
            onChange={e => onChange({ eaveOverhangM: parseFloat(e.target.value) || 0 })}
            className="w-20 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-blue-400"
            placeholder="0.05"
          />
        </label>

        {/* Alignment toggle */}
        <div className="flex items-center gap-1">
          <span className="text-white/40 text-xs mr-1">Igazítás:</span>
          {ALIGN_OPTS.map(opt => (
            <button
              key={opt.value}
              title={opt.label}
              onClick={() => onChange({ alignment: opt.value })}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                plane.alignment === opt.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
              }`}
            >
              {opt.icon}
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>

        {valid && (
          <span className="text-white/30 text-xs ml-auto">
            {w.toFixed(2)} m × {h.toFixed(2)} m
          </span>
        )}
      </div>

      {/* Sheet layout drawing */}
      {valid && <SheetLayout plane={plane} result={result} />}

      {/* Result summary */}
      {valid && lengthEntries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10 print:hidden">
          <div className="flex gap-4 flex-wrap text-xs">
            {lengthEntries.map(([len, cnt]) => (
              <div key={len}>
                <span className="text-white/50">{len.toFixed(3)} m: </span>
                <span className="text-white font-bold">{cnt} db</span>
              </div>
            ))}
            <div className="ml-auto">
              <span className="text-white/50">Összesen: </span>
              <span className="text-blue-300 font-bold">{result.totalSheets} db</span>
            </div>
          </div>
        </div>
      )}
      {!valid && (
        <p className="text-orange-300/70 text-xs mt-2">Adj meg legalább 3 pontot a sokszöghöz.</p>
      )}
    </div>
  )
}
