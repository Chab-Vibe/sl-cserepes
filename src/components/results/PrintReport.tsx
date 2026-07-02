import type { PlaneResult, OrderGroup } from '../../types'
import { groupByLength, totalSheets, SHEET } from '../../utils/calculations'

interface Props {
  results: PlaneResult[]
}

export function PrintReport({ results }: Props) {
  if (results.length === 0) return null

  // Összesített rendelési tábla (minden sík együtt)
  const groups: OrderGroup[] = groupByLength(results)
  const total = totalSheets(groups)
  const totalArea = groups.reduce((s, g) => s + g.lengthM * g.totalSheets * SHEET.EFFECTIVE_WIDTH_M, 0)

  return (
    <div className="hidden print:block">

      {/* ── 1. oldal: összesített rendelési táblázat ── */}
      <div className="mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-400 pb-1">
          Rendelési összesítő
        </h2>
        <table className="w-full text-xs border-collapse border border-slate-400">
          <thead>
            <tr className="bg-slate-100 text-gray-700">
              <th className="border border-slate-400 px-2 py-1 text-left font-semibold w-12">#</th>
              <th className="border border-slate-400 px-2 py-1 text-left font-semibold">Hossz (mm)</th>
              <th className="border border-slate-400 px-2 py-1 text-right font-semibold">Darabszám</th>
              <th className="border border-slate-400 px-2 py-1 text-right font-semibold">Terület (m²)</th>
              <th className="border border-slate-400 px-2 py-1 text-left font-semibold">Síkok</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g, i) => (
              <tr key={g.lengthM} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 px-2 py-1 text-gray-500">#{i + 1}</td>
                <td className="border border-slate-300 px-2 py-1 text-gray-900 font-medium">
                  {Math.round(g.lengthM * 1000)}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right text-gray-900 font-bold">
                  {g.totalSheets}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right text-gray-700">
                  {(g.lengthM * g.totalSheets * SHEET.EFFECTIVE_WIDTH_M).toFixed(2)}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-gray-500">
                  {g.planeNames.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold">
              <td className="border border-slate-400 px-2 py-1" colSpan={2}>Mindösszesen</td>
              <td className="border border-slate-400 px-2 py-1 text-right">{total} db</td>
              <td className="border border-slate-400 px-2 py-1 text-right">{totalArea.toFixed(2)}</td>
              <td className="border border-slate-400 px-2 py-1"></td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  )
}
