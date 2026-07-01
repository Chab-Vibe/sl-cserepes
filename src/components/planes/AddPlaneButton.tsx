import { Plus } from 'lucide-react'
import { useStore } from '../../store/useStore'

export function AddPlaneButton() {
  const addPlane = useStore(s => s.addPlane)
  return (
    <button
      onClick={addPlane}
      className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/30 py-3 text-white/60 hover:text-white hover:border-white/50 hover:bg-white/5 transition-all text-sm"
    >
      <Plus size={16} />
      Tetősík hozzáadása
    </button>
  )
}
