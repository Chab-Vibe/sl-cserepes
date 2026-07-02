import { Trash2, Copy, AlignLeft, AlignCenter, AlignRight, AlertTriangle } from 'lucide-react'
import type { RoofPlane, PlaneResult, Alignment } from '../../types'
import { PolygonEditor } from './PolygonEditor'
import { SheetLayout } from '../visualization/SheetLayout'
import { isPlaneValid, polyWidth, polyHeight, SHEET } from '../../utils/calculations'

interface Props {
  plane: RoofPlane
  result: PlaneResult
  onChange: (patch: Partial<RoofPlane>) => void
  onRemove: () => void
  onDuplicate: () => void
}

const ALIGN_OPTS: { value: Alignment; icon: React.ReactNode; label: string }[] = [
  { value: 'left',   icon: <AlignLeft size={14} />,   label: 'Bal' },
  { value: 'center', icon: <AlignCenter size={14} />, label: 'Közép' },
  { value: 'right',  icon: <AlignRight size={14} />,  label: 'Jobb' },
]

export function PlaneCard({ plane, result, onChange, onRemove, onDuplicate }: Props) {
  const valid = isPlaneValid(plane)
  const lengthMap = new Map<number, number>()
  for (const col of result.columns) {
    for (const seg of col.segments) {
      lengthMap.set(seg.lengthM, (lengthMap.get(seg.lengthM) ?? 0) + 1)
    }
  }
  const lengthEntries = [...lengthMap.entries()].sort((a, b) => a[0] - b[0])
  const w = polyWidth(plane.points)
  const h = polyHeight(plane.points)
  const splitCount = result.columns.filter(c => c.isSplit).length
  const oversizeCount = result.columns.filter(c => c.segments.some(s => s.lengthM > SHEET.MAX_SINGLE_LENGTH_M)).length

  return (
    <div className={`relative rounded-2xl p-4 bg-white border shadow-sm transition-colors print:rounded-none print:border-0 print:p-0 print:shadow-none ${
      valid ? 'border-slate-200' : 'border-amber-300'
    }`}>
      <div className="absolute top-3 right-3 flex items-center gap-1 print:hidden">
        <button onClick={onDuplicate} title="Másolás" className="text-slate-300 hover:text-blue-500 transition-colors">
          <Copy size={15} />
        </button>
        <button onClick={onRemove} title="Törlés" className="text-slate-300 hover:text-red-500 transition-colors">
          <Trash2 size={15} />
        </button>
      </div>

      {/* Name — shown as heading in print */}
      <input
        className="w-full bg-transparent text-slate-800 font-semibold text-sm mb-3 outline-none border-b border-slate-200 pb-1 pr-6 print:hidden focus:border-blue-400"
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
          <span className="text-slate-500">Csurgó (m)</span>
          <input
            type="number" min={0} step={0.01}
            value={plane.eaveOverhangM || ''}
            onChange={e => onChange({ eaveOverhangM: parseFloat(e.target.value) || 0 })}
            className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 text-xs outline-none focus:border-blue-400"
            placeholder="0.05"
          />
        </label>

        {/* Alignment toggle */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400 text-xs mr-1">Igazítás:</span>
          {ALIGN_OPTS.map(opt => (
            <button
              key={opt.value}
              title={opt.label}
              onClick={() => onChange({ alignment: opt.value })}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                plane.alignment === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {opt.icon}
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>

        {valid && (
          <span className="text-slate-400 text-xs ml-auto">
            {w.toFixed(2)} m × {h.toFixed(2)} m
          </span>
        )}
      </div>

      {/* Split / oversize notices */}
      {(splitCount > 0 || oversizeCount > 0) && (
        <div className="mt-3 flex flex-col gap-1.5 print:hidden">
          {splitCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              <AlertTriangle size={13} className="shrink-0" />
              {splitCount} oszlop toldva (6 m fölötti magasság, {Math.round(SHEET.OVERLAP_M * 1000)} mm átfedéssel)
            </div>
          )}
          {oversizeCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
              <AlertTriangle size={13} className="shrink-0" />
              {oversizeCount} egybefüggő lemez 6 m fölött — egyeztess a gyártóval
            </div>
          )}
        </div>
      )}

      {/* Sheet layout drawing */}
      {valid && <SheetLayout plane={plane} result={result} />}

      {/* Result summary */}
      {valid && lengthEntries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 print:hidden">
          <div className="flex gap-4 flex-wrap text-xs">
            {lengthEntries.map(([len, cnt]) => (
              <div key={len}>
                <span className="text-slate-500">{len.toFixed(3)} m: </span>
                <span className="text-slate-800 font-bold">{cnt} db</span>
              </div>
            ))}
            <div className="ml-auto">
              <span className="text-slate-500">Összesen: </span>
              <span className="text-blue-600 font-bold">{result.totalSheets} db</span>
            </div>
          </div>
        </div>
      )}
      {!valid && (
        <p className="text-amber-600 text-xs mt-2">Adj meg legalább 3 pontot a sokszöghöz.</p>
      )}
    </div>
  )
}
