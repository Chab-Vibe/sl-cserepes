export type Alignment = 'left' | 'center' | 'right'

// A választható lemeztípus azonosítója — a konkrét méreteket/szabályokat a
// SHEET_PROFILES (calculations.ts) tárolja ehhez az azonosítóhoz.
export type SheetTypeId = 'cserepeslemez' | 't35' | 't14' | 't8' | 't18'

export interface ManualSplit {
  col: number    // oszlopindex
  atM: number    // a kívánt alsó darab hossza méterben (a profil dönti el, hogyan illeszkedik rá: modulhatárra kerekítve vagy folytonosan)
}

export interface RoofPlane {
  id: string
  name: string
  points: [number, number][]   // [x, y] méterben, y=0 a csurgónál
  eaveOverhangM: number
  alignment: Alignment
  manualSplits?: ManualSplit[]  // kézi megosztások: oszlopindex + kívánt alsó darab hossz
  excludedCols?: number[]        // oszlopindexek, amelyek lemezét a felhasználó kihagyta a rendelésből (pl. hulladékból pótolható apró darab)
}

// Egy fizikailag legyártott/rendelhető lemezdarab egy oszlopon belül.
// Egy oszlophoz normál esetben 1 szegmens tartozik; a gyártási max. hossz
// fölött (ha nincs engedélyezve az egybefüggő lemez) a rendszer 2+
// szegmensre bontja, átfedéssel a toldásnál. Kézi megosztással is 2
// szegmens jöhet létre.
export interface SheetSegment {
  order: number       // 0 = csurgóhoz legközelebbi (alsó) darab
  modules: number      // a szegmensben lévő modulok száma (informatív; 0, ha a profilnak nincs modulosztása)
  lengthM: number      // a szegmens tényleges gyártási hossza
  startM: number       // hol kezdődik a szegmensben (oszlop-koordináta, m)
  endM: number         // hol végződik a szegmensben (oszlop-koordináta, m)
}

export interface ColumnResult {
  index: number
  heightM: number
  segments: SheetSegment[]
  isSplit: boolean
  totalModules: number   // az oszlop teljes (meg nem osztott) modulszáma (0, ha a profilnak nincs modulosztása)
  bottomExtraM: number    // a legalsó darab alsó ráhagyása (csurgó, vagy 0 emelt aljnál)
  totalLenM: number       // az oszlop teljes (meg nem osztott) gyártási hossza
  excluded: boolean       // a felhasználó kihagyta a rendelésből (a rajzon látszik, de nem számít bele az összesítőbe)
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
