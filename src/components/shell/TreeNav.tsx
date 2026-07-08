import { Plus, FileText, ClipboardList } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { PlaneTreeItem } from './PlaneTreeItem'

interface Props {
  onOpenCustomerInfo: () => void
}

export function TreeNav({ onOpenCustomerInfo }: Props) {
  const planes = useStore(s => s.planes)
  const activePlaneId = useStore(s => s.activePlaneId)
  const addPlane = useStore(s => s.addPlane)
  const removePlane = useStore(s => s.removePlane)
  const duplicatePlane = useStore(s => s.duplicatePlane)
  const mirrorPlane = useStore(s => s.mirrorPlane)
  const setActivePlane = useStore(s => s.setActivePlane)

  return (
    <nav className="flex flex-col h-full overflow-y-auto print:hidden">
      <button
        onClick={() => setActivePlane(null)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
          activePlaneId === null ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        <ClipboardList size={15} />
        Összesítő
      </button>

      <button
        onClick={onOpenCustomerInfo}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <FileText size={15} />
        Ügyfél adatai
      </button>

      <div className="mt-3 mb-1 px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">Tetősíkok</div>
      <div className="flex-1 space-y-0.5">
        {planes.length === 0 && (
          <p className="px-3 text-xs text-slate-300">Még nincs tetősík.</p>
        )}
        {planes.map(plane => (
          <PlaneTreeItem
            key={plane.id}
            plane={plane}
            active={activePlaneId === plane.id}
            onSelect={mode => setActivePlane(plane.id, mode)}
            onDuplicate={() => duplicatePlane(plane.id)}
            onMirror={() => mirrorPlane(plane.id)}
            onRemove={() => removePlane(plane.id)}
          />
        ))}
      </div>

      <button
        onClick={addPlane}
        className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2 text-slate-500 hover:text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition-all text-sm"
      >
        <Plus size={15} />
        Új tetősík
      </button>
    </nav>
  )
}
