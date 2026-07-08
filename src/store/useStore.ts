import { create } from 'zustand'
import type { RoofPlane, SheetTypeId, Alignment, CustomerInfo } from '../types'
import { loadPlanes, savePlanes, loadAllowOversize, saveAllowOversize, loadSheetType, saveSheetType, loadCustomerInfo, saveCustomerInfo } from '../utils/storage'

interface Store {
  planes: RoofPlane[]
  allowOversize: boolean
  sheetType: SheetTypeId
  customerInfo: CustomerInfo
  // Tranziens UI-navigáció (nem perzisztált): melyik sík aktív a
  // munkaterületen, és alakzat- vagy kiosztás-nézetben vagyunk-e.
  // null = "Összesítő" nézet.
  activePlaneId: string | null
  viewMode: 'shape' | 'layout'
  addPlane: () => void
  duplicatePlane: (id: string) => void
  mirrorPlane: (id: string) => void
  updatePlane: (id: string, patch: Partial<RoofPlane>) => void
  removePlane: (id: string) => void
  setAllowOversize: (value: boolean) => void
  setSheetType: (value: SheetTypeId) => void
  setCustomerInfo: (patch: Partial<CustomerInfo>) => void
  setActivePlane: (id: string | null, mode?: 'shape' | 'layout') => void
  setViewMode: (mode: 'shape' | 'layout') => void
  reset: () => void
  importProject: (data: { planes: RoofPlane[]; allowOversize: boolean; sheetType?: SheetTypeId; customerInfo?: CustomerInfo }) => void
}

export const useStore = create<Store>((set, get) => ({
  planes: loadPlanes(),
  allowOversize: loadAllowOversize(),
  sheetType: loadSheetType(),
  customerInfo: loadCustomerInfo(),
  activePlaneId: null,
  viewMode: 'shape',

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
    set({ planes: updated, activePlaneId: newPlane.id, viewMode: 'shape' })
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
    set({ planes: updated, activePlaneId: copy.id })
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
    // miatt már nem lenne értelmes, ezért azok törlődnek. Az élenkénti
    // kellékek (edgeAccessories) viszont NEM törlődnek: az élek indexe és
    // hossza tükrözés után is ugyanaz marad (csak az X koordináta tükröződik).
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
    const patch: Partial<Store> = { planes: updated }
    if (get().activePlaneId === id) patch.activePlaneId = null
    set(patch)
  },

  setAllowOversize: (value) => {
    saveAllowOversize(value)
    set({ allowOversize: value })
  },

  setSheetType: (value) => {
    saveSheetType(value)
    set({ sheetType: value })
  },

  setCustomerInfo: (patch) => {
    const updated = { ...get().customerInfo, ...patch }
    saveCustomerInfo(updated)
    set({ customerInfo: updated })
  },

  setActivePlane: (id, mode) => {
    set(mode ? { activePlaneId: id, viewMode: mode } : { activePlaneId: id })
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  reset: () => {
    savePlanes([])
    set({ planes: [], activePlaneId: null, viewMode: 'shape' })
  },

  importProject: (data) => {
    savePlanes(data.planes)
    saveAllowOversize(data.allowOversize)
    const patch: Partial<Store> = { planes: data.planes, allowOversize: data.allowOversize, activePlaneId: null }
    if (data.sheetType) {
      saveSheetType(data.sheetType)
      patch.sheetType = data.sheetType
    }
    if (data.customerInfo) {
      saveCustomerInfo(data.customerInfo)
      patch.customerInfo = data.customerInfo
    }
    set(patch)
  },
}))
