import { Trash2 } from 'lucide-react'
import type { RoofPlane } from '../../types'
import { polyEdges } from '../../utils/calculations'

interface Props {
  plane: RoofPlane
  edgeIndex: number
  onChange: (patch: Partial<RoofPlane>) => void
  onClose: () => void
}

export function EdgeAccessoryEditor({ plane, edgeIndex, onChange, onClose }: Props) {
  const edges = polyEdges(plane.points)
  const edgeLengthM = edges.find(e => e.index === edgeIndex)?.lengthM ?? 0
  const items = (plane.edgeAccessories ?? []).filter(a => a.edgeIndex === edgeIndex)

  const addAccessory = (name: string, unitLengthMm: number) => {
    if (!name.trim() || unitLengthMm <= 0) return
    const others = plane.edgeAccessories ?? []
    onChange({ edgeAccessories: [...others, { edgeIndex, name: name.trim(), unitLengthM: unitLengthMm / 1000 }] })
  }

  const removeAccessory = (idx: number) => {
    const others = plane.edgeAccessories ?? []
    // idx az items (szűrt lista) indexe — meg kell találni az eredeti tömbben.
    const target = items[idx]
    const globalIdx = others.indexOf(target)
    if (globalIdx === -1) return
    onChange({ edgeAccessories: others.filter((_, i) => i !== globalIdx) })
  }

  return (
    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm print:hidden">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-emerald-800 font-medium">
          {edgeIndex + 1}. él — kellékek ({Math.round(edgeLengthM * 1000)} mm hosszú él)
        </span>
        <button type="button" onClick={onClose} className="text-emerald-400 hover:text-emerald-700 shrink-0">Bezár</button>
      </div>

      {items.length > 0 && (
        <div className="space-y-1 mb-2">
          {items.map((acc, idx) => {
            const count = acc.unitLengthM > 1e-9 ? Math.ceil(edgeLengthM / acc.unitLengthM - 1e-9) : 0
            return (
              <div key={idx} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-emerald-100">
                <span className="flex-1 text-slate-700">{acc.name}</span>
                <span className="text-slate-400 text-xs">{Math.round(acc.unitLengthM * 1000)} mm/db</span>
                <span className="text-emerald-700 font-bold">{count} db</span>
                <button type="button" onClick={() => removeAccessory(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <form
        onSubmit={e => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const name = String(fd.get('name') ?? '')
          const unitLengthMm = parseFloat(String(fd.get('unitLengthMm') ?? ''))
          if (name.trim() && unitLengthMm > 0) {
            addAccessory(name, unitLengthMm)
            e.currentTarget.reset()
          }
        }}
        className="flex items-center gap-2 flex-wrap"
      >
        <input
          name="name" type="text" placeholder="Kellék neve (pl. Sarokelem)"
          className="flex-1 min-w-32 bg-white border border-emerald-200 rounded-lg px-2 py-1 text-slate-800 outline-none focus:border-emerald-400"
        />
        <input
          name="unitLengthMm" type="number" min={1} step={1} placeholder="Egységhossz (mm)"
          className="w-36 bg-white border border-emerald-200 rounded-lg px-2 py-1 text-slate-800 outline-none focus:border-emerald-400"
        />
        <button type="submit" className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors">
          Hozzáadás
        </button>
      </form>
    </div>
  )
}
