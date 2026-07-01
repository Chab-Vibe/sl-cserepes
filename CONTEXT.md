# Cserepeslemez Kalkulátor — Projekt Kontextus

## Cél

Blachdom Plus / RS Dachy 5 programhoz hasonló kalkulátor, de saját típusú
cserepeslemezhez (a Blachdom kínálatában nem szerepel a szükséges méret).
Az app összetett tetőformákhoz számol anyagmennyiséget és vizuálisan ábrázolja
a kiosztást.

A modul-rugalmassági rendszer forrása: `Bilka-Module-07-01-2026_09_41_PM.png`
(BILKA/RECOPY KFT admin felület, Modul_35 tábla) — lásd „Számítási logika".

---

## Lemez állandók

| Jellemző | Érték |
|---|---|
| Modul osztás | 350 mm |
| Teljes szélesség | 1 100 mm |
| Hasznos szélesség | 1 000 mm |
| Orr (nose) | 50 mm |
| Csurgó (eave) | felhasználó adja meg, alapértelmezett 50 mm |
| Rövid modul (kompresszió) | max −30 mm modulonként |
| Hosszú modul (nyújtás) | max +250 mm modulonként |
| Max. egybefüggő lemezhossz | 6 000 mm (felhasználói jóváhagyással felette is) |
| Toldási átfedés | 120 mm |

---

## Számítási logika (`src/utils/calculations.ts`)

### Modulszámítás — BILKA rugalmas modulrendszer

A `Bilka-Module-07-01-2026_09_41_PM.png` (BILKA/RECOPY admin felület, Modul_35
fül) alapján: minden modulszámhoz (Mn) tartozik egy **rövid** tartomány
(1–3. oszlop, −1..−3 cm), egy **teljes** modul érték (4. oszlop) és egy
**hosszú** tartomány (5. oszloptól, +1..+25 cm). A lemez tehát modulonként
kis mértékben összenyomható/nyújtható, hogy pontosan a szükséges magasságra
álljon, extra modul (és anyagpazarlás) nélkül.

```
nettó magasság (netH) = oszlopmagasság − csurgó − orr

// minimális modulszám n, amivel netH még lefedhető a nyújtási határon belül:
n = legkisebb egész, amire  n × 350mm + 250mm ≥ netH

// tényleges modulhossz: netH, de legalább a rövidítési határ (kompresszió max 30mm)
modulhossz = max(netH, n × 350mm − 30mm)

lemezhossz = orr + modulhossz + csurgó
```

**Fontos:** Y=0 a csurgó tövénél van (a fascia alatt), tehát az orr és a csurgó
már fedik a tető széleit — a moduloknak csak a kettő közötti részt kell lefedniük.

A régi „mindig felfelé kerekítés + 5 cm szabály” logikát ez a rugalmas
illesztés váltotta fel: a legtöbb esetben a lemezhossz pontosan a nettó
magasságra áll (nulla pazarlás), csak a ritka „rés-zónában" (kb. 7 cm sáv
két modulszám tartománya között) kerül a hossz kicsit a szükséges fölé.

### 6 méter fölötti lemezek — toldás átfedéssel

Egy lemez gyártási hossza jellemzően max. 6 m. Ha a fenti számítás ennél
hosszabb eredményt adna:

- **alapértelmezett (`allowOversize=false`):** a rendszer a lemezt
  **szegmensekre bontja** modulhatáron: az első (csurgóhoz legközelebbi)
  darab a lehető legtöbb teljes modult tartalmazza 6 m-en belül; minden
  további darab 120 mm-rel ráépül (átfedés) az előzőre, az utolsó darab a
  fenti rugalmas illesztéssel pontosan a maradék magasságra áll.
- **felhasználói jóváhagyással (`allowOversize=true`, `Header.tsx` kapcsoló):**
  egyetlen egybefüggő lemez, akkor is, ha 6 m fölötti — ilyenkor az
  eredménylistában és a rajz jelmagyarázatában piros „6M+” jelzés figyelmeztet,
  hogy egyedi gyártást igényel.

A kapcsoló globális (`useStore.allowOversize`, localStorage:
`cserepeslemez_allow_oversize`), minden tetősíkra egyszerre vonatkozik.

A kiosztási rajzon (`SheetLayout.tsx`) a toldott oszlopoknál minden
szegmens saját téglalapként jelenik meg a saját hosszával, az átfedési sáv
sárga sraffozással van kiemelve.

### Ellenőrzés a BONA PLUS 350 táblával

| Modulok | BONA (mm) | Saját (eave=70mm, régi logika) |
|---|---|---|
| 1 | 470 | 50+350+70 = 470 ✓ |
| 12 | 4320 | 50+4200+70 = 4320 ✓ |

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

// Egy fizikailag legyártott/rendelhető lemezdarab egy oszlopon belül.
interface SheetSegment {
  order: number       // 0 = csurgóhoz legközelebbi (alsó) darab
  modules: number
  lengthM: number
  startM: number       // oszlop-koordináta, m
  endM: number
}

interface ColumnResult {
  index: number
  heightM: number
  segments: SheetSegment[]   // normál esetben 1 elem, 6m+ toldásnál 2+
  isSplit: boolean
}

interface PlaneResult {
  planeId: string
  planeName: string
  columns: ColumnResult[]
  totalSheets: number   // Σ segments.length minden oszlopon
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
        ├── ResultsSummary.tsx             — rendelési összesítő + másolás (képernyőn)
        ├── ResultsTable.tsx               — síkonkénti táblázat (képernyőn)
        ├── PrintReport.tsx                — nyomtatás 1. oldala (pozíciótáblázat)
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
- Jelmagyarázat jobb alul: `XXXX mm — N db (M×350+50+csurgó)`, 6 m fölötti
  hosszaknál piros kerettel/szöveggel kiemelve

Toldott oszlopoknál (`col.isSplit`) minden `SheetSegment` saját téglalapként
rajzolódik ki a saját `startM`–`endM` tartományában; a szomszédos szegmensek
közötti 120 mm-es átfedési sávot narancssárga sraffozás (`OVERLAP_HATCH_ID`
pattern) jelzi.

---

## Nyomtatás / PDF export

`window.print()` + `@media print` CSS stratégia. A `kiosztás.pdf` referencia
(BLACHDOM PLUS / RS Dachy 5 "MÉRETSPECIFIKÁCIÓ") felépítését követi:

1. **1. oldal — `PrintReport.tsx`** (`hidden print:block`, az App tetején,
   a `Header` előtt): síkonkénti táblázat — pozíció szám, hossz (mm),
   darabszám, terület (m² = hossz × darabszám × hasznos szélesség),
   sík-összefoglalás sor, majd „Mindösszesen" sáv az összes sík összesítve.
   Az on-screen `ResultsSummary`/`ResultsTable` ezért `print:hidden` (nyomtatva
   duplikáció lenne).
2. **2. oldaltól — kiosztási rajzok**: minden `.sheet-layout-wrapper`
   (`SheetLayout.tsx`, `index.css`) `break-before: page`-t kap, így minden
   tetősík rajza saját oldalon indul, a PrintReport táblázata után.

Egyéb szabályok:
- `.print:hidden` osztály: PolygonEditor, vezérlők, gombok, fejléc,
  `AddPlaneButton`, a split/oversize figyelmeztető sávok (`PlaneCard.tsx`)
- `aside`: teljes szélességű, statikus pozíció nyomtatásban (de tartalma
  `print:hidden`, csak a layout-öröklés miatt maradt a szabály)
- SVG fehér háttér, `print-color-adjust: exact`

**Korábbi hiba:** az App.tsx-ben a `<section className="print:hidden">` elrejtette
az egész rajz szekciót. Javítva: a `print:hidden` osztály az egyes input
elemekre kerül, nem a szülő section-ra.

---

## UI design

Világos, letisztult felület (2026-07 óta): `#f1f5f9` (slate-100) háttér,
fehér kártyák (`bg-white`, `border-slate-200`, `shadow-sm`), sötétszürke
szöveg (`text-slate-800`/`slate-500`), kék (`blue-600`) elsődleges akcentus.
Korábban sötétkék gradiens háttér + üveg (`backdrop-blur-xl`, `bg-white/10`)
kártyák voltak — ez teljesen le lett cserélve.

## Terjesztés — mezei felhasználónak

`Cserepeslemez-Kalkulator.html` (repo gyökér): egyetlen, önmagában futtatható
HTML fájl — a `vite-plugin-singlefile` minden JS-t és CSS-t inline-ol bele
(`SINGLEFILE=1 npm run build`, kimenet: `dist-singlefile/`, gitignore-olva).
Nincs benne külső `<script src>`/`<link rel=stylesheet>`, ezért `file://`-ból,
dupla kattintással is megnyílik, szerver és Node.js nélkül (az inline
`<script type="module">` nem esik a modul-CORS korlátozás alá, csak a
külön fájlból betöltött modulok). Letöltés: GitHub → fájl → "Download raw file".

A `kalkulator-app/` (lásd lent) ezzel szemben több fájlos statikus build,
ahhoz kell egy minimális fájlszerver (`npx serve` / `python -m http.server`).

## Technológia

- React 19 + Vite + TypeScript
- Tailwind CSS v4
- Zustand (localStorage perzisztencia, kulcsok: `cserepeslemez_planes`,
  `cserepeslemez_allow_oversize`)
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
