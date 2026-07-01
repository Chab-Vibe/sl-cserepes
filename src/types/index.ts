export type Alignment = 'left' | 'center' | 'right'

export interface RoofPlane {
  id: string
  name: string
  points: [number, number][]   // [x, y] méterben, y=0 a csurgónál
  eaveOverhangM: number
  alignment: Alignment
}

export interface ColumnResult {
  index: number
  heightM: number
  modules: number
  sheetLengthM: number
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
