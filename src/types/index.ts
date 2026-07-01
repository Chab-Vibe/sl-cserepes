export type Alignment = 'left' | 'center' | 'right'

export interface RoofPlane {
  id: string
  name: string
  points: [number, number][]   // [x, y] méterben, y=0 a csurgónál
  eaveOverhangM: number
  alignment: Alignment
}

// Egy fizikailag legyártott/rendelhető lemezdarab egy oszlopon belül.
// Egy oszlophoz normál esetben 1 szegmens tartozik; 6 m fölött (ha nincs
// engedélyezve az egybefüggő lemez) a rendszer 2+ szegmensre bontja,
// átfedéssel a toldásnál.
export interface SheetSegment {
  order: number       // 0 = csurgóhoz legközelebbi (alsó) darab
  modules: number      // a szegmensben lévő modulok száma (informatív)
  lengthM: number      // a szegmens tényleges gyártási hossza
  startM: number       // hol kezdődik a szegmensben (oszlop-koordináta, m)
  endM: number         // hol végződik a szegmensben (oszlop-koordináta, m)
}

export interface ColumnResult {
  index: number
  heightM: number
  segments: SheetSegment[]
  isSplit: boolean
}

export interface PlaneResult {
  planeId: string
  planeName: string
  columns: ColumnResult[]
  totalSheets: number
}

export interface OrderGroup {
  lengthM: number
  totalSheets: number
  planeNames: string[]
}
