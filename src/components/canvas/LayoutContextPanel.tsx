import { AlertTriangle, Ban } from 'lucide-react'
import type { RoofPlane, PlaneResult } from '../../types'
import { calculateEdgeAccessories, type SheetProfile } from '../../utils/calculations'
import { ColumnSplitEditor } from '../planes/ColumnSplitEditor'
import { EdgeAccessoryEditor } from '../planes/EdgeAccessoryEditor'

interface Props {
  plane: RoofPlane
  result: PlaneResult
  profile: SheetProfile
  selectedCol: number | null
  selectedEdge: number | null
  onChange: (patch: Partial<RoofPlane>) => void
  onCloseCol: () => void
  onCloseEdge: () => void
}

export function LayoutContextPanel({ plane, result, profile, selectedCol, selectedEdge, onChange, onCloseCol, onCloseEdge }: Props) {
  const splitCount = result.columns.filter(c => !c.excluded && c.isSplit).length
  const oversizeCount = result.columns.filter(c => !c.excluded && c.segments.some(s => s.lengthM > profile.maxSingleLengthM)).length
  const excludedCount = result.columns.filter(c => c.excluded).length

  const lengthMap = new Map<number, number>()
  for (const col of result.columns) {
    if (col.excluded) continue
    for (const seg of col.segments) {
      lengthMap.set(seg.lengthM, (lengthMap.get(seg.lengthM) ?? 0) + 1)
    }
  }
  const lengthEntries = [...lengthMap.entries()].sort((a, b) => a[0] - b[0])
  const edgeAccessoryResults = calculateEdgeAccessories(plane)
  const selectedColResult = selectedCol !== null ? result.columns.find(c => c.index === selectedCol) : undefined

  return (
    <div className="space-y-3">
      {(splitCount > 0 || oversizeCount > 0 || excludedCount > 0) && (
        <div className="flex flex-col gap-1.5">
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

      {selectedCol !== null && selectedColResult ? (
        <ColumnSplitEditor plane={plane} profile={profile} col={selectedColResult} onChange={onChange} onClose={onCloseCol} />
      ) : selectedEdge !== null ? (
        <EdgeAccessoryEditor plane={plane} edgeIndex={selectedEdge} onChange={onChange} onClose={onCloseEdge} />
      ) : (
        <>
          {lengthEntries.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <div className="text-slate-400 text-xs mb-1.5">Lemezhosszak</div>
              <div className="flex flex-col gap-1 text-sm">
                {lengthEntries.map(([len, cnt]) => (
                  <div key={len} className="flex justify-between">
                    <span className="text-slate-500">{len.toFixed(3)} m</span>
                    <span className="text-slate-800 font-bold">{cnt} db</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Összesen</span>
                  <span className="text-blue-600 font-bold">{result.totalSheets} db</span>
                </div>
              </div>
            </div>
          )}
          {edgeAccessoryResults.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <div className="text-slate-400 text-xs mb-1.5">Élenkénti kellékek</div>
              <div className="flex flex-col gap-1 text-sm">
                {edgeAccessoryResults.map((acc, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-slate-500">{acc.name} ({acc.edgeIndex + 1}. él)</span>
                    <span className="text-emerald-700 font-bold">{acc.count} db</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lengthEntries.length === 0 && edgeAccessoryResults.length === 0 && (
            <p className="text-slate-300 text-xs">
              Kattints egy lemezre a rajzon a kézi megosztásához vagy a rendelésből való kihagyásához, vagy egy élre a szegélyhez tartozó kellékek megadásához.
            </p>
          )}
        </>
      )}
    </div>
  )
}
