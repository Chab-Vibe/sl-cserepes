import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { OrderGroup } from '../../types'
import { totalSheets, groupMaterialAreaM2, totalMaterialAreaM2, totalCoverageAreaM2, type SheetProfile } from '../../utils/calculations'

interface Props {
  groups: OrderGroup[]
  profile: SheetProfile
}

export function ResultsSummary({ groups, profile }: Props) {
  const [copied, setCopied] = useState(false)
  const total = totalSheets(groups)

  const handleCopy = () => {
    const lines = groups.map(g =>
      `${Math.round(g.lengthM * 1000)} mm\t${g.totalSheets} db`
    )
    lines.push(`ÖSSZESEN\t${total} db`)
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-5 text-slate-400 text-sm text-center print:hidden">
        Az eredmény itt jelenik meg.
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 print:hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-slate-800 font-semibold text-base">Rendelési összesítő</h2>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm transition-colors"
        >
          {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
          {copied ? 'Másolva' : 'Másolás'}
        </button>
      </div>

      <table className="w-full text-base border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 text-sm">
            <th className="text-left font-medium pb-1.5">Hossz</th>
            <th className="text-right font-medium pb-1.5">Darabszám</th>
            <th className="text-right font-medium pb-1.5 pl-3">Terület</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {groups.map(g => (
            <tr key={g.lengthM}>
              <td className="py-1.5 text-slate-700 font-medium">
                {Math.round(g.lengthM * 1000)} mm
                {g.lengthM > profile.maxSingleLengthM && (
                  <span className="ml-1.5 text-rose-500 text-xs font-semibold">{profile.maxSingleLengthM}M+</span>
                )}
              </td>
              <td className="py-1.5 text-right text-blue-600 font-bold">{g.totalSheets} db</td>
              <td className="py-1.5 text-right text-slate-400 text-sm pl-3">
                {groupMaterialAreaM2(g, profile).toFixed(2)} m²
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200">
            <td className="pt-2 text-slate-500 text-base font-medium">Összesen</td>
            <td className="pt-2 text-right text-slate-800 font-bold text-xl">{total} db</td>
            <td className="pt-2 text-right text-slate-400 text-sm pl-3">
              {totalMaterialAreaM2(groups, profile).toFixed(2)} m²
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-sm">
        <span className="text-slate-400">Tetőfelület szükséglet (hasznos {profile.effectiveWidthM * 1000} mm):</span>
        <span className="text-slate-600 font-semibold">{totalCoverageAreaM2(groups, profile).toFixed(2)} m²</span>
      </div>
    </div>
  )
}
