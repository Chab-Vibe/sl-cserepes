import type { PlaneResult } from '../../types'
import type { SheetProfile } from '../../utils/calculations'

interface Props {
  results: PlaneResult[]
  profile: SheetProfile
}

export function ResultsTable({ results, profile }: Props) {
  if (results.length === 0) return null

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 mt-3 print:hidden">
      <h2 className="text-slate-800 font-semibold text-sm mb-3">Részletes bontás</h2>
      {results.map(r => {
        const lengthMap = new Map<number, { count: number; modules: number }>()
        for (const col of r.columns) {
          if (col.excluded) continue
          for (const seg of col.segments) {
            const existing = lengthMap.get(seg.lengthM)
            if (existing) existing.count++
            else lengthMap.set(seg.lengthM, { count: 1, modules: seg.modules })
          }
        }
        const entries = [...lengthMap.entries()].sort((a, b) => a[0] - b[0])
        return (
          <div key={r.planeId} className="mb-3 last:mb-0">
            <div className="text-slate-500 text-xs font-medium mb-1">{r.planeName}</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="text-left pb-1 font-normal">Lemezhossz</th>
                  {profile.moduleM !== null && <th className="text-left pb-1 font-normal">Modul</th>}
                  <th className="text-right pb-1 font-normal">Lemez</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([len, info]) => (
                  <tr key={len} className="border-b border-slate-50 last:border-0">
                    <td className="py-1 text-slate-700">{len.toFixed(3)} m</td>
                    {profile.moduleM !== null && (
                      <td className="py-1 text-slate-400">{info.modules} × {profile.moduleM * 1000} mm</td>
                    )}
                    <td className="py-1 text-right text-blue-600 font-semibold">{info.count} db</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
