import { useStore } from '../../store/useStore'
import { calculatePlane } from '../../utils/calculations'
import { PlaneCard } from './PlaneCard'

export function PlaneList() {
  const { planes, updatePlane, removePlane } = useStore()

  if (planes.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center text-white/40 text-sm">
        Még nincs tetősík megadva.<br />Kattints a „+ Tetősík hozzáadása" gombra a kezdéshez.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {planes.map(plane => (
        <PlaneCard
          key={plane.id}
          plane={plane}
          result={calculatePlane(plane)}
          onChange={patch => updatePlane(plane.id, patch)}
          onRemove={() => removePlane(plane.id)}
        />
      ))}
    </div>
  )
}
