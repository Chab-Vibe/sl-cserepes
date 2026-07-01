# Cserepeslemez Kalkulátor — kész, futtatható verzió

Ez a mappa a kalkulátor **lebuildelt**, csak-használatra kész változata
(statikus HTML/CSS/JS). Nincs hozzá szükség Node.js-re, `npm install`-ra
vagy fejlesztői szerverre — csak egy egyszerű statikus fájlszerverre, mert
a böngészők `file://`-ból nem engedik betölteni az ES module szkripteket.

## Indítás lokálisan

Egy paranccsal, ha van Node.js a gépen:

```
npx serve .
```

(vagy Python 3-mal: `python -m http.server 8000`)

Utána nyisd meg a böngészőben a kiírt címet (pl. `http://localhost:3000`).

## Frissítés

Ha a forráskód (`src/`) változik, a friss verziót
```
npm run build
```
generálja le a `dist/` mappába — annak tartalmát kell ide (`kalkulator-app/`)
átmásolni és commitolni.
