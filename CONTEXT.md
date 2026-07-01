# Cserepeslemez Kalkulátor — Projekt Kontextus

## Cél

Blachdom Plus / RS Dachy 5 programhoz hasonló kalkulátor, de saját típusú
cserepeslemezhez (a Blachdom kínálatában nem szerepel a szükséges méret).
Az app összetett tetőformákhoz számol anyagmennyiséget és vizuálisan ábrázolja
a kiosztást.

---

## Lemez állandók

| Jellemző | Érték |
|---|---|
| Modul osztás | 350 mm |
| Teljes szélesség | 1 100 mm |
| Hasznos szélesség | 1 000 mm |
| Orr (nose) | 50 mm |
| Csurgó (eave) | felhasználó adja meg, alapértelmezett 50 mm |

---

## Számítási logika (`src/utils/calculations.ts`)

### Modulszámítás

```
nettó magasság = oszlopmagasság − csurgó − orr
modulok = ceil(nettó magasság / 350mm)
ha nettó magasság % 350mm == 0 → modulok += 1   (5 cm-es szabály)
lemezhossz = orr + modulok × 350mm + csurgó
```

**Fontos:** Y=0 a csurgó tövénél van (a fascia alatt), tehát az orr és a csurgó
már fedik a tető széleit — a moduloknak csak a kettő közötti részt kell lefedniük.

**5 cm-es szabály:** ha a vágás pontosan modulhatárra esne (nettó magasság
osztható 350-nel), +1 modullal biztosítunk legalább 5 cm pluszt.

### Ellenőrzés a BONA PLUS 350 táblával

| Modulok | BONA (mm) | Saját (eave=70mm) |
|---|---|---|
| 1 | 470 | 50+350+70 = 470 ✓ |
| 12 | 4320 | 50+4200+70 = 4320 ✓ |

Példa: 4 m-es tető, 12 cm csurgóval →
`netH = 4.000 − 0.120 − 0.050 = 3.830m` → 11 modul → `0.050 + 3.850 + 0.120 = 4.020m`

### Szélesség

```
oszlopok száma = ceil(tető szélessége / 1.0m)
igazítás (bal/közép/jobb) → startX eltolás
```

---

## Adatmodell (`src/types/index.ts`)

```typescript
interface RoofPlane {
  id: string
  name: string
  points: [number, number][]   // [x, y] méterben, y=0 a csurgó tövénél
  eaveOverhangM: number        // csurgó mérete méterben
  alignment: 'left' | 'center' | 'right'
}

interface ColumnResult {
  index: number
  heightM: number
  modules: number
  sheetLengthM: number
}

interface PlaneResult {
  planeId: string
  planeName: string
  columns: ColumnResult[]
  totalSheets: number
}

interface OrderGroup {
  lengthM: number
  totalSheets: number
  planeNames: string[]
}
```

---

## Fájlstruktúra

```
src/
├── types/index.ts                          — adatmodell
├── utils/
│   ├── calculations.ts                    — számítási logika
│   └── storage.ts                         — localStorage
├── store/useStore.ts                      — Zustand store
└── components/
    ├── Header.tsx
    ├── planes/
    │   ├── PlaneCard.tsx                  — tetősík kártya
    │   ├── PlaneList.tsx
    │   ├── AddPlaneButton.tsx
    │   └── PolygonEditor.tsx              — koordináta-bevitel (nem kattintásos!)
    ├── visualization/
    │   └── SheetLayout.tsx                — CAD-stílusú SVG kiosztási rajz
    └── results/
        ├── ResultsSummary.tsx             — rendelési összesítő + másolás
        ├── ResultsTable.tsx               — síkonkénti táblázat
        └── PdfExport.tsx                  — nyomtatás gomb
```

---

## SVG kiosztási rajz (`SheetLayout.tsx`)

A `kiosztás.pdf` referencia alapján:
- Fehér oszlopok vékony szürke kerettel
- Lemezhossz mm-ben, 90°-kal elforgatva az oszlopon belül
- Pontozott sokszöghatár kitöltött csúcspontokkal
- Kék alsó méretvonal (sokszög szélessége mm-ben)
- Szürke bal oldali magassági méretvonal
- Sraffozott terület az oszlop polügonon kívüli (túlnyúló) részén
- Jelmagyarázat jobb alul: `XXXX mm — N db (M×350+50+csurgó)`

---

## Nyomtatás / PDF export

`window.print()` + `@media print` CSS stratégia:
- `.print:hidden` osztály: PolygonEditor, vezérlők, gombok, fejléc
- `.sheet-layout-wrapper`: mindig látható nyomtatáskor
- `aside`: teljes szélességű, statikus pozíció nyomtatásban
- SVG fehér háttér, `print-color-adjust: exact`

**Korábbi hiba:** az App.tsx-ben a `<section className="print:hidden">` elrejtette
az egész rajz szekciót. Javítva: a `print:hidden` osztály az egyes input
elemekre kerül, nem a szülő section-ra.

---

## Technológia

- React 19 + Vite + TypeScript
- Tailwind CSS v4
- Zustand (localStorage perzisztencia, kulcs: `cserepeslemez_planes`)
- lucide-react ikonok
- SVG-alapú rajz (nincs külső chart könyvtár)
- Preview: port 5173 (`.claude/launch.json`)

---

## Ismert megoldott problémák

| Probléma | Megoldás |
|---|---|
| NaN SVG-ben | `polyWidth > 0` guard a scale számításban |
| React key warning | `import { Fragment }` + `<Fragment key={i}>` |
| HMR loop szintaktikai hiba után | PolygonEditor.tsx teljes újraírás |
| localStorage inkompatibilitás | `localStorage.removeItem('cserepeslemez_planes')` |
| Port conflict | `Stop-Process -Id XXXX -Force` |
| Rajz nem látszik nyomtatáskor | `print:hidden` áthelyezése section-ről az input elemekre |

---

## GitHub

Repository: [Chab-Vibe/sl-cserepes](https://github.com/Chab-Vibe/sl-cserepes)

Commitok:
1. `83ad573` — Initial commit: teljes app
2. `5a1295f` — Fix sheet length formula and print layout
