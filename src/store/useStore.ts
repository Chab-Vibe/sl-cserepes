import { create } from 'zustand'
import type { RoofPlane, SheetTypeId, Alignment } from '../types'
import { loadPlanes, savePlanes, loadAllowOversize, saveAllowOversize, loadSheetType, saveSheetType } from '../utils/storage'

interface Store {
  planes: RoofPlane[]
  allowOversize: boolean
  sheetType: SheetTypeId
  addPlane: () => void
  duplicatePlane: (id: string) => void
  mirrorPlane: (id: string) => void
  updatePlane: (id: string, patch: Partial<RoofPlane>) => void
  removePlane: (id: string) => void
  setAllowOversize: (value: boolean) => void
  setSheetType: (value: SheetTypeId) => void
  reset: () => void
  importProject: (data: { planes: RoofPlane[]; allowOversize: boolean }) => void
}

export const useStore = create<Store>((set, get) => ({
  planes: loadPlanes(),
  allowOversize: loadAllowOversize(),
  sheetType: loadSheetType(),

  addPlane: () => {
    const planes = get().planes
    const newPlane: RoofPlane = {
      id: crypto.randomUUID(),
      name: `Sík ${planes.length + 1}`,
      points: [],
      eaveOverhangM: 0.05,
      alignment: 'left',
    }
    const updated = [...planes, newPlane]
    savePlanes(updated)
    set({ planes: updated })
  },

  duplicatePlane: (id) => {
    const planes = get().planes
    const src = planes.find(p => p.id === id)
    if (!src) return
    const copy: RoofPlane = {
      ...src,
      id: crypto.randomUUID(),
      name: `${src.name} (másolat)`,
    }
    const idx = planes.findIndex(p => p.id === id)
    const updated = [...planes.slice(0, idx + 1), copy, ...planes.slice(idx + 1)]
    savePlanes(updated)
    set({ planes: updated })
  },

  mirrorPlane: (id) => {
    const planes = get().planes
    const src = planes.find(p => p.id === id)
    if (!src || src.points.length === 0) return
    const xs = src.points.map(p => p[0])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    // Vízszintes tükrözés a sík saját szélességi tartományán belül (a bal/jobb
    // szél helyben marad, csak a pontok sorrendje/oldala fordul meg) — a
    // sarkokhoz kötött kézi megosztás/kihagyás az oszlopindexek megfordulása
    // miatt már nem lenne értelmes, ezért azok törlődnek.
    const mirroredPoints: [number, number][] = src.points.map(([x, y]) => [minX + maxX - x, y])
    const mirroredAlignment: Alignment = src.alignment === 'left' ? 'right' : src.alignment === 'right' ? 'left' : 'center'
    const updated = planes.map(p => p.id === id
      ? { ...p, points: mirroredPoints, alignment: mirroredAlignment, manualSplits: undefined, excludedCols: undefined }
      : p)
    savePlanes(updated)
    set({ planes: updated })
  },

  updatePlane: (id, patch) => {
    const updated = get().planes.map(p => p.id === id ? { ...p, ...patch } : p)
    savePlanes(updated)
    set({ planes: updated })
  },

  removePlane: (id) => {
    const updated = get().planes.filter(p => p.id !== id)
    savePlanes(updated)
    set({ planes: updated })
  },

  setAllowOversize: (value) => {
    saveAllowOversize(value)
    set({ allowOversize: value })
  },

  setSheetType: (value) => {
    saveSheetType(value)
    set({ sheetType: value })
  },

  reset: () => {
    savePlanes([])
    set({ planes: [] })
  },

  importProject: (data) => {
    savePlanes(data.planes)
    saveAllowOversize(data.allowOversize)
    set({ planes: data.planes, allowOversize: data.allowOversize })
  },
}))
