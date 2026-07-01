import type { PlaneResult } from '../../types'

interface Props {
  results: PlaneResult[]
}

export function ResultsTable({ results }: Props) {
  if (results.length === 0) return null

  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 mt-3 print-block">
      <h2 className="text-white font-semibold text-sm mb-3">Részletes bontás</h2>
      {results.map(r => {
        const lengthMap = new Map<number, number>()
        for (const col of r.columns) {
          lengthMap.set(col.sheetLengthM, (lengthMap.get(col.sheetLengthM) ?? 0) + 1)
        }
        const entries = [...lengthMap.entries()].sort((a, b) => a[0] - b[0])
        return (
          <div key={r.planeId} className="mb-3 last:mb-0">
            <div className="text-white/60 text-xs font-medium mb-1">{r.planeName}</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/30 border-b border-white/10">
                  <th className="text-left pb-1 font-normal">Lemezhossz</th>
                  <th className="text-left pb-1 font-normal">Modul</th>
                  <th className="text-right pb-1 font-normal">Lemez</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([len, cnt]) => {
                  const col = r.columns.find(c => c.sheetLengthM === len)
                  return (
                    <tr key={len} className="border-b border-white/5 last:border-0">
                      <td className="py-1 text-white/80">{len.toFixed(3)} m</td>
                      <td className="py-1 text-white/50">{col?.modules ?? '—'} × 350 mm</td>
                      <td className="py-1 text-right text-blue-300 font-semibold">{cnt} db</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
