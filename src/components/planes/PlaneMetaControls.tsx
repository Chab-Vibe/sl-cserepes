import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import type { RoofPlane, Alignment } from '../../types'
import { isPlaneValid, polyWidth, polyHeight, type SheetProfile } from '../../utils/calculations'

interface Props {
  plane: RoofPlane
  profile: SheetProfile
  onChange: (patch: Partial<RoofPlane>) => void
}

const ALIGN_OPTS: { value: Alignment; icon: React.ReactNode; label: string }[] = [
  { value: 'left',   icon: <AlignLeft size={16} />,   label: 'Bal' },
  { value: 'center', icon: <AlignCenter size={16} />, label: 'Közép' },
  { value: 'right',  icon: <AlignRight size={16} />,  label: 'Jobb' },
]

const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-sm outline-none focus:border-blue-400"
const labelClass = "text-xs text-slate-500 block mb-1"

export function PlaneMetaControls({ plane, profile, onChange }: Props) {
  const valid = isPlaneValid(plane)
  const w = polyWidth(plane.points)
  const h = polyHeight(plane.points)

  return (
    <div className="space-y-3">
      <label className="block">
        <span className={labelClass}>Név</span>
        <input
          className={`${inputClass} font-semibold`}
          value={plane.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="Sík neve..."
        />
      </label>

      <label className="block">
        <span className={labelClass}>Csurgó (mm)</span>
        <input
          type="number" min={0} step={10}
          value={plane.eaveOverhangM ? Math.round(plane.eaveOverhangM * 1000) : ''}
          onChange={e => onChange({ eaveOverhangM: (parseFloat(e.target.value) || 0) / 1000 })}
          className={inputClass}
          placeholder="50"
        />
      </label>

      <div>
        <span className={labelClass}>Igazítás</span>
        <div className="flex items-center gap-1">
          {ALIGN_OPTS.map(opt => (
            <button
              key={opt.value}
              type="button"
              title={opt.label}
              onClick={() => onChange({ alignment: opt.value })}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                plane.alignment === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className={labelClass}>Kerekítés (mm)</span>
        <input
          type="number" min={0} step={1}
          value={plane.roundingOverrideMm ?? ''}
          onChange={e => onChange({ roundingOverrideMm: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
          className={inputClass}
          placeholder={String(profile.roundingMm)}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Váltakozó csatlakoztatás (mm)</span>
        <input
          type="number" min={0} step={1}
          value={plane.alternatingJointOverrideMm ?? ''}
          onChange={e => onChange({ alternatingJointOverrideMm: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
          className={inputClass}
          placeholder={String(profile.alternatingJointDefaultMm)}
        />
      </label>

      {valid ? (
        <div className="text-slate-400 text-sm">{w.toFixed(2)} m × {h.toFixed(2)} m</div>
      ) : (
        <p className="text-amber-600 text-sm">Adj meg legalább 3 pontot a sokszöghöz.</p>
      )}
    </div>
  )
}
