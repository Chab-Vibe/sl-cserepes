import { Plus } from 'lucide-react'
import { useStore } from '../../store/useStore'

export function AddPlaneButton() {
  const addPlane = useStore(s => s.addPlane)
  return (
    <button
      onClick={addPlane}
      className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-3 text-slate-500 hover:text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition-all text-base print:hidden"
    >
      <Plus size={18} />
      Tetősík hozzáadása
    </button>
  )
}
