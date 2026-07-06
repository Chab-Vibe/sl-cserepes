import { useState } from 'react'
import { Trash2, Copy, FlipHorizontal2, AlignLeft, AlignCenter, AlignRight, AlertTriangle, Ban } from 'lucide-react'
import type { RoofPlane, PlaneResult, Alignment } from '../../types'
import { PolygonEditor } from './PolygonEditor'
import { SheetLayout } from '../visualization/SheetLayout'
import { isPlaneValid, polyWidth, polyHeight, splitBoundsMm, type SheetProfile } from '../../utils/calculations'

interface Props {
  plane: RoofPlane
  result: PlaneResult
  profile: SheetProfile
  onChange: (patch: Partial<RoofPlane>) => void
  onRemove: () => void
  onDuplicate: () => void
  onMirror: () => void
}

const ALIGN_OPTS: { value: Alignment; icon: React.ReactNode; label: string }[] = [
  { value: 'left',   icon: <AlignLeft size={16} />,   label: 'Bal' },
  { value: 'center', icon: <AlignCenter size={16} />, label: 'Közép' },
  { value: 'right',  icon: <AlignRight size={16} />,  label: 'Jobb' },
]

export function PlaneCard({ plane, result, profile, onChange, onRemove, onDuplicate, onMirror }: Props) {
  const valid = isPlaneValid(plane)
  const [selectedCol, setSelectedCol] = useState<number | null>(null)

  const lengthMap = new Map<number, number>()
  for (const col of result.columns) {
    if (col.excluded) continue
    for (const seg of col.segments) {
      lengthMap.set(seg.lengthM, (lengthMap.get(seg.lengthM) ?? 0) + 1)
    }
  }
  const lengthEntries = [...lengthMap.entries()].sort((a, b) => a[0] - b[0])
  const w = polyWidth(plane.points)
  const h = polyHeight(plane.points)
  const splitCount = result.columns.filter(c => !c.excluded && c.isSplit).length
  const oversizeCount = result.columns.filter(c => !c.excluded && c.segments.some(s => s.lengthM > profile.maxSingleLengthM)).length
  const excludedCount = result.columns.filter(c => c.excluded).length

  const selectColumn = (colIndex: number) => setSelectedCol(prev => prev === colIndex ? null : colIndex)
  const selectedColResult = selectedCol !== null ? result.columns.find(c => c.index === selectedCol) : undefined

  const applySplit = (colIndex: number, mm: number) => {
    const others = (plane.manualSplits ?? []).filter(s => s.col !== colIndex)
    onChange({ manualSplits: [...others, { col: colIndex, atM: mm / 1000 }] })
  }
  const removeSplit = (colIndex: number) => {
    const others = (plane.manualSplits ?? []).filter(s => s.col !== colIndex)
    onChange({ manualSplits: others })
  }
  const toggleExclude = (colIndex: number) => {
    const cur = plane.excludedCols ?? []
    const next = cur.includes(colIndex) ? cur.filter(i => i !== colIndex) : [...cur, colIndex]
    onChange({ excludedCols: next })
  }

  return (
    <div className={`relative rounded-2xl p-4 bg-white border shadow-sm transition-colors print:rounded-none print:border-0 print:p-0 print:shadow-none ${
      valid ? 'border-slate-200' : 'border-amber-300'
    }`}>
      <div className="absolute top-3 right-3 flex items-center gap-1 print:hidden">
        <button onClick={onDuplicate} title="Másolás" className="text-slate-300 hover:text-blue-500 transition-colors">
          <Copy size={17} />
        </button>
        <button onClick={onMirror} title="Tükrözés" className="text-slate-300 hover:text-blue-500 transition-colors">
          <FlipHorizontal2 size={17} />
        </button>
        <button onClick={onRemove} title="Törlés" className="text-slate-300 hover:text-red-500 transition-colors">
          <Trash2 size={17} />
        </button>
      </div>

      {/* Sík neve */}
      <div className="flex items-center gap-2 mb-3 pr-20 print:hidden">
        <span className="text-slate-400 text-sm shrink-0">Név:</span>
        <input
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-semibold text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          value={plane.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="Sík neve..."
        />
      </div>
      {/* Nyomtatásban a név fejlécként jelenik meg */}
      <div className="hidden print:block text-gray-900 font-bold text-sm mb-1">{plane.name}</div>

      {/* Polygon editor */}
      <div className="print:hidden">
        <PolygonEditor points={plane.points} onChange={pts => onChange({ points: pts })} />
      </div>

      {/* Controls row: csurgó + igazítás */}
      <div className="flex items-center gap-4 mt-3 flex-wrap print:hidden">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Csurgó (m)</span>
          <input
            type="number" min={0} step={0.01}
            value={plane.eaveOverhangM || ''}
            onChange={e => onChange({ eaveOverhangM: parseFloat(e.target.value) || 0 })}
            className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 text-sm outline-none focus:border-blue-400"
            placeholder="0.05"
          />
        </label>

        {/* Alignment toggle */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400 text-sm mr-1">Igazítás:</span>
          {ALIGN_OPTS.map(opt => (
            <button
              key={opt.value}
              title={opt.label}
              onClick={() => onChange({ alignment: opt.value })}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-colors ${
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
          <span className="text-slate-400 text-sm ml-auto">
            {w.toFixed(2)} m × {h.toFixed(2)} m
          </span>
        )}
      </div>

      {/* Split / oversize / excluded notices */}
      {(splitCount > 0 || oversizeCount > 0 || excludedCount > 0) && (
        <div className="mt-3 flex flex-col gap-1.5 print:hidden">
          {splitCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              <AlertTriangle size={15} className="shrink-0" />
              {splitCount} oszlop toldva ({Math.round(profile.overlapM * 1000)} mm átfedéssel)
            </div>
          )}
          {oversizeCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
              <AlertTriangle size={15} className="shrink-0" />
              {oversizeCount} egybefüggő lemez {profile.maxSingleLengthM} m fölött — egyeztess a gyártóval
            </div>
          )}
          {excludedCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Ban size={15} className="shrink-0" />
              {excludedCount} oszlop kihagyva a rendelésből (hulladékból pótolva)
            </div>
          )}
        </div>
      )}

      {/* Sheet layout drawing — képernyőn nagyobb betűkkel, nyomtatva az
          eredeti (változatlan) mérettel */}
      {valid && (
        <div className="print:hidden">
          <SheetLayout plane={plane} result={result} profile={profile} onSelectColumn={selectColumn} selectedCol={selectedCol} fontScale={1.4} />
        </div>
      )}
      {valid && (
        <div className="hidden print:block">
          <SheetLayout plane={plane} result={result} profile={profile} />
        </div>
      )}
      {valid && (
        <p className="text-slate-300 text-xs mt-1 print:hidden">
          Kattints egy lemezre a rajzon a kézi megosztásához vagy a rendelésből való kihagyásához
          {profile.moduleM !== null ? ' (a méretet a rendszer a legközelebbi modulhoz igazítja).' : '.'}
        </p>
      )}

      {/* Manual split / exclude editor panel */}
      {valid && selectedCol !== null && selectedColResult && (() => {
        const col = selectedColResult
        const isExcluded = col.excluded
        const isAutoLocked = col.segments.length > 1 && !plane.manualSplits?.some(s => s.col === selectedCol)
        const existing = plane.manualSplits?.find(s => s.col === selectedCol)

        const excludeRow = (
          <div className={`mt-2 rounded-lg border px-3 py-2 flex items-center justify-between gap-2 text-sm print:hidden ${
            isExcluded ? 'border-slate-300 bg-slate-100' : 'border-slate-200 bg-slate-50'
          }`}>
            <span className="text-slate-600">
              {selectedCol + 1}. oszlop{isExcluded ? ' — kihagyva a rendelésből (hulladékból pótolva)' : ''}
            </span>
            <button
              type="button"
              onClick={() => toggleExclude(selectedCol)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                isExcluded
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200'
              }`}
            >
              <Ban size={14} />
              {isExcluded ? 'Visszavétel a rendelésbe' : 'Kihagyás a rendelésből'}
            </button>
          </div>
        )

        if (isAutoLocked) {
          return (
            <>
              {excludeRow}
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 flex items-center justify-between gap-2 print:hidden">
                <span>Ez az oszlop automatikusan toldva van ({profile.maxSingleLengthM} m fölötti magasság) — kézi megosztás nem szükséges.</span>
                <button type="button" onClick={() => setSelectedCol(null)} className="text-slate-400 hover:text-slate-700 shrink-0">Bezár</button>
              </div>
            </>
          )
        }

        const bounds = splitBoundsMm(profile, col)
        if (!bounds) {
          return (
            <>
              {excludeRow}
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 flex items-center justify-between gap-2 print:hidden">
                <span>Ez a lemez túl rövid ahhoz, hogy két gyártható darabra osztható legyen.</span>
                <button type="button" onClick={() => setSelectedCol(null)} className="text-slate-400 hover:text-slate-700 shrink-0">Bezár</button>
              </div>
            </>
          )
        }

        // A ténylegesen alkalmazott (nyújtott/kerekített) hosszt az aktuális
        // szegmensekből olvassuk ki, nem a nyers képletből — így a mező
        // Alkalmazás után a valódi gyártási méretet mutatja (pl. 750 → 820).
        const defaultTargetMm = existing && col.segments.length === 2
          ? Math.round(col.segments[0].lengthM * 1000)
          : Math.round((bounds.minMm + bounds.maxMm) / 2)

        return (
          <>
            {excludeRow}
            <form
              key={`${selectedCol}-${existing ? defaultTargetMm : 'new'}`}
              onSubmit={e => {
                e.preventDefault()
                const mm = parseFloat(String(new FormData(e.currentTarget).get('mm')))
                if (!Number.isNaN(mm) && mm > 0) applySplit(selectedCol, mm)
              }}
              className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 flex items-center gap-2 flex-wrap text-sm print:hidden"
            >
              <span className="text-blue-800 font-medium">{selectedCol + 1}. oszlop — alsó darab hossza:</span>
              <input
                name="mm" type="number"
                defaultValue={defaultTargetMm}
                className="w-24 bg-white border border-blue-200 rounded px-2 py-1 text-slate-800 outline-none focus:border-blue-400"
              />
              <span className="text-blue-400">mm ({bounds.minMm}–{bounds.maxMm} között)</span>
              <button type="submit" className="px-2.5 py-1 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
                Alkalmaz
              </button>
              {existing && (
                <button type="button" onClick={() => removeSplit(selectedCol)} className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-red-500 transition-colors">
                  Egyesítés
                </button>
              )}
              <button type="button" onClick={() => setSelectedCol(null)} className="ml-auto text-blue-400 hover:text-blue-700">
                Bezár
              </button>
            </form>
          </>
        )
      })()}

      {/* Result summary */}
      {valid && lengthEntries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 print:hidden">
          <div className="flex gap-4 flex-wrap text-sm">
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
        <p className="text-amber-600 text-sm mt-2">Adj meg legalább 3 pontot a sokszöghöz.</p>
      )}
    </div>
  )
}
