import { Ban } from 'lucide-react'
import type { RoofPlane, ColumnResult } from '../../types'
import { splitBoundsMm, type SheetProfile } from '../../utils/calculations'

interface Props {
  plane: RoofPlane
  profile: SheetProfile
  col: ColumnResult
  onChange: (patch: Partial<RoofPlane>) => void
  onClose: () => void
}

export function ColumnSplitEditor({ plane, profile, col, onChange, onClose }: Props) {
  const colIndex = col.index
  const isExcluded = col.excluded
  const isAutoLocked = col.segments.length > 1 && !plane.manualSplits?.some(s => s.col === colIndex)
  const existing = plane.manualSplits?.find(s => s.col === colIndex)

  const applySplit = (mm: number) => {
    const others = (plane.manualSplits ?? []).filter(s => s.col !== colIndex)
    onChange({ manualSplits: [...others, { col: colIndex, atM: mm / 1000 }] })
  }
  const removeSplit = () => {
    const others = (plane.manualSplits ?? []).filter(s => s.col !== colIndex)
    onChange({ manualSplits: others })
  }
  const toggleExclude = () => {
    const cur = plane.excludedCols ?? []
    const next = cur.includes(colIndex) ? cur.filter(i => i !== colIndex) : [...cur, colIndex]
    onChange({ excludedCols: next })
  }

  const excludeRow = (
    <div className={`rounded-lg border px-3 py-2 flex items-center justify-between gap-2 text-sm ${
      isExcluded ? 'border-slate-300 bg-slate-100' : 'border-slate-200 bg-slate-50'
    }`}>
      <span className="text-slate-600">
        {colIndex + 1}. oszlop{isExcluded ? ' — kihagyva a rendelésből (hulladékból pótolva)' : ''}
      </span>
      <button
        type="button"
        onClick={toggleExclude}
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
      <div className="space-y-2">
        {excludeRow}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 flex items-center justify-between gap-2">
          <span>Ez az oszlop automatikusan toldva van ({profile.maxSingleLengthM} m fölötti magasság) — kézi megosztás nem szükséges.</span>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">Bezár</button>
        </div>
      </div>
    )
  }

  const bounds = splitBoundsMm(profile, col)
  if (!bounds) {
    return (
      <div className="space-y-2">
        {excludeRow}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 flex items-center justify-between gap-2">
          <span>Ez a lemez túl rövid ahhoz, hogy két gyártható darabra osztható legyen.</span>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">Bezár</button>
        </div>
      </div>
    )
  }

  // A ténylegesen alkalmazott (nyújtott/kerekített) hosszt az aktuális
  // szegmensekből olvassuk ki, nem a nyers képletből — így a mező
  // Alkalmazás után a valódi gyártási méretet mutatja (pl. 750 → 820).
  const defaultTargetMm = existing && col.segments.length === 2
    ? Math.round(col.segments[0].lengthM * 1000)
    : Math.round((bounds.minMm + bounds.maxMm) / 2)

  return (
    <div className="space-y-2">
      {excludeRow}
      <form
        key={`${colIndex}-${existing ? defaultTargetMm : 'new'}`}
        onSubmit={e => {
          e.preventDefault()
          const mm = parseFloat(String(new FormData(e.currentTarget).get('mm')))
          if (!Number.isNaN(mm) && mm > 0) applySplit(mm)
        }}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 flex flex-col gap-2 text-sm"
      >
        <span className="text-blue-800 font-medium">{colIndex + 1}. oszlop — alsó darab hossza:</span>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            name="mm" type="number"
            defaultValue={defaultTargetMm}
            className="w-24 bg-white border border-blue-200 rounded px-2 py-1 text-slate-800 outline-none focus:border-blue-400"
          />
          <span className="text-blue-400">mm ({bounds.minMm}–{bounds.maxMm} között)</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" className="px-2.5 py-1 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
            Alkalmaz
          </button>
          {existing && (
            <button type="button" onClick={removeSplit} className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-red-500 transition-colors">
              Egyesítés
            </button>
          )}
          <button type="button" onClick={onClose} className="ml-auto text-blue-400 hover:text-blue-700">
            Bezár
          </button>
        </div>
      </form>
    </div>
  )
}
