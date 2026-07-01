import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { OrderGroup } from '../../types'
import { totalSheets, SHEET } from '../../utils/calculations'

interface Props {
  groups: OrderGroup[]
}

export function ResultsSummary({ groups }: Props) {
  const [copied, setCopied] = useState(false)
  const total = totalSheets(groups)

  const handleCopy = () => {
    const lines = groups.map(g =>
      `${g.lengthM.toFixed(3)} m-es lemez: ${g.totalSheets} db  (${g.planeNames.join(', ')})`
    )
    lines.push(`ÖSSZESEN: ${total} db`)
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
        <h2 className="text-slate-800 font-semibold text-sm">Rendelési összesítő</h2>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-xs transition-colors print:hidden"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          {copied ? 'Másolva' : 'Másolás'}
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {groups.map(g => (
          <div key={g.lengthM} className="flex justify-between items-start">
            <div>
              <span className="text-slate-700 font-medium">{g.lengthM.toFixed(3)} m-es lemez</span>
              {g.lengthM > SHEET.MAX_SINGLE_LENGTH_M && (
                <span className="ml-1.5 text-rose-500 text-[10px] font-semibold align-middle">6M+</span>
              )}
              <div className="text-slate-400 text-xs">{g.planeNames.join(', ')}</div>
            </div>
            <span className="text-blue-600 font-bold text-base ml-4">{g.totalSheets} db</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
        <span className="text-slate-500 text-sm">Összesen</span>
        <span className="text-slate-800 font-bold text-xl">{total} db</span>
      </div>
    </div>
  )
}
