import { create } from 'zustand'
import type { RoofPlane } from '../types'
import { loadPlanes, savePlanes } from '../utils/storage'

interface Store {
  planes: RoofPlane[]
  addPlane: () => void
  updatePlane: (id: string, patch: Partial<RoofPlane>) => void
  removePlane: (id: string) => void
  reset: () => void
}

export const useStore = create<Store>((set, get) => ({
  planes: loadPlanes(),

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

  reset: () => {
    savePlanes([])
    set({ planes: [] })
  },
}))
