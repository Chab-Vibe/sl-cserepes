import { useStore } from '../../store/useStore'
import { calculatePlane, SHEET_PROFILES } from '../../utils/calculations'
import { PlaneCard } from './PlaneCard'

export function PlaneList() {
  const { planes, allowOversize, sheetType, updatePlane, removePlane, duplicatePlane, mirrorPlane } = useStore()
  const profile = SHEET_PROFILES[sheetType]

  if (planes.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-400 text-sm">
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
          result={calculatePlane(plane, profile, allowOversize)}
          profile={profile}
          onChange={patch => updatePlane(plane.id, patch)}
          onRemove={() => removePlane(plane.id)}
          onDuplicate={() => duplicatePlane(plane.id)}
          onMirror={() => mirrorPlane(plane.id)}
        />
      ))}
    </div>
  )
}
