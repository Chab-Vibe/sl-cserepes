import { useMemo, useState } from 'react'
import { ChevronDown, Search, Layers } from 'lucide-react'
import { Modal } from './Modal'
import { SHEET_PROFILES, SHEET_GROUPS } from '../utils/calculations'
import type { SheetTypeId } from '../types'

interface Props {
  sheetType: SheetTypeId
  onChange: (value: SheetTypeId) => void
}

// Egyszerű, generikus szín-jelölés csoportonként — nincs valódi termékfotó.
const GROUP_COLORS: Record<string, string> = {
  trapez: 'bg-amber-100 text-amber-700',
  cserepeslemez: 'bg-blue-100 text-blue-700',
  modulos_cserepeslemez: 'bg-emerald-100 text-emerald-700',
  roll: 'bg-purple-100 text-purple-700',
}

export function TypePicker({ sheetType, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const profile = SHEET_PROFILES[sheetType]

  const allProfiles = useMemo(() => Object.values(SHEET_PROFILES), [])

  const groupsWithMatches = useMemo(() => {
    const q = search.trim().toLowerCase()
    return SHEET_GROUPS
      .map(g => ({
        group: g,
        profiles: allProfiles.filter(p =>
          p.group === g.id && (q === '' || p.label.toLowerCase().includes(q) || g.label.toLowerCase().includes(q))
        ),
      }))
      .filter(g => g.profiles.length > 0)
  }, [allProfiles, search])

  const select = (id: SheetTypeId) => {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-sm text-slate-700 transition-colors"
      >
        <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${GROUP_COLORS[profile.group] ?? 'bg-slate-100 text-slate-500'}`}>
          <Layers size={13} />
        </span>
        <span className="font-medium">{profile.label}</span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Termék kiválasztása">
        <div className="relative mb-4">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Keress típusra..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:border-blue-400"
          />
        </div>

        <div className="space-y-4">
          {groupsWithMatches.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">Nincs találat.</p>
          )}
          {groupsWithMatches.map(({ group, profiles }) => (
            <div key={group.id}>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">{group.label}</div>
              <div className="space-y-1">
                {profiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => select(p.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors ${
                      p.id === sheetType ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${GROUP_COLORS[p.group] ?? 'bg-slate-100 text-slate-500'}`}>
                      <Layers size={14} />
                    </span>
                    <span className="flex-1">
                      <span className="font-medium block">{p.label}</span>
                      <span className="text-xs text-slate-400">
                        {p.totalWidthM * 1000} mm teljes · {p.effectiveWidthM * 1000} mm hasznos · max. {p.maxSingleLengthM} m
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}
