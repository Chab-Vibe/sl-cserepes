import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { OrderGroup } from '../../types'
import { totalSheets } from '../../utils/calculations'

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
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-white/30 text-sm text-center">
        Az eredmény itt jelenik meg.
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 print-block">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold text-sm">Rendelési összesítő</h2>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-white/50 hover:text-white text-xs transition-colors print:hidden"
        >
          {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          {copied ? 'Másolva' : 'Másolás'}
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {groups.map(g => (
          <div key={g.lengthM} className="flex justify-between items-start">
            <div>
              <span className="text-white font-medium">{g.lengthM.toFixed(3)} m-es lemez</span>
              <div className="text-white/40 text-xs">{g.planeNames.join(', ')}</div>
            </div>
            <span className="text-blue-300 font-bold text-base ml-4">{g.totalSheets} db</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
        <span className="text-white/60 text-sm">Összesen</span>
        <span className="text-white font-bold text-xl">{total} db</span>
      </div>
    </div>
  )
}
