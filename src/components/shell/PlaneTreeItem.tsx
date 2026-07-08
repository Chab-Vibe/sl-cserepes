import { Copy, FlipHorizontal2, Trash2, PenSquare, LayoutGrid } from 'lucide-react'
import type { RoofPlane } from '../../types'
import { isPlaneValid } from '../../utils/calculations'
import { useStore } from '../../store/useStore'

interface Props {
  plane: RoofPlane
  active: boolean
  onSelect: (mode?: 'shape' | 'layout') => void
  onDuplicate: () => void
  onMirror: () => void
  onRemove: () => void
}

export function PlaneTreeItem({ plane, active, onSelect, onDuplicate, onMirror, onRemove }: Props) {
  const viewMode = useStore(s => s.viewMode)
  const valid = isPlaneValid(plane)

  return (
    <div>
      <div
        onClick={() => onSelect()}
        className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
          active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        <span className={`flex-1 truncate ${!valid ? 'text-amber-600' : ''}`}>{plane.name}</span>
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          <button onClick={e => { e.stopPropagation(); onDuplicate() }} title="Másolás" className="text-slate-300 hover:text-blue-500 transition-colors">
            <Copy size={13} />
          </button>
          <button onClick={e => { e.stopPropagation(); onMirror() }} title="Tükrözés" className="text-slate-300 hover:text-blue-500 transition-colors">
            <FlipHorizontal2 size={13} />
          </button>
          <button onClick={e => { e.stopPropagation(); onRemove() }} title="Törlés" className="text-slate-300 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {active && (
        <div className="ml-4 flex flex-col gap-0.5 mt-0.5 mb-1">
          <button
            onClick={() => onSelect('shape')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs text-left transition-colors ${
              viewMode === 'shape' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <PenSquare size={12} /> Alakzat
          </button>
          <button
            onClick={() => onSelect('layout')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs text-left transition-colors ${
              viewMode === 'layout' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid size={12} /> Kiosztás
          </button>
        </div>
      )}
    </div>
  )
}
