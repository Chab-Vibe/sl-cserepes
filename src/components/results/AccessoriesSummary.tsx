import type { AccessoryGroup } from '../../types'

interface Props {
  groups: AccessoryGroup[]
}

export function AccessoriesSummary({ groups }: Props) {
  if (groups.length === 0) return null

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 mt-3 print:hidden">
      <h2 className="text-slate-800 font-semibold text-sm mb-3">Élenkénti kellékek összesítve</h2>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400 border-b border-slate-100">
            <th className="text-left pb-1 font-normal">Kellék</th>
            <th className="text-right pb-1 font-normal">Darabszám</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(g => (
            <tr key={g.name} className="border-b border-slate-50 last:border-0">
              <td className="py-1 text-slate-700">{g.name}</td>
              <td className="py-1 text-right text-emerald-700 font-semibold">{g.totalCount} db</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
