import type { PlaneResult } from '../../types'
import { SHEET } from '../../utils/calculations'

interface Props {
  results: PlaneResult[]
}

// Csak nyomtatáskor/PDF-exportnál látszik: a rendelés első oldala, síkonkénti
// pozíciótáblázattal (pozíció szám, hossz, darabszám, terület), a
// `kiosztás.pdf` referencia (BLACHDOM PLUS / RS Dachy 5 "MÉRETSPECIFIKÁCIÓ"
// oldala) mintájára. A kiosztási rajzok (felületek) ez után, oldaltörésekkel
// tagolva következnek — lásd `index.css` `.sheet-layout-wrapper` szabályát.
export function PrintReport({ results }: Props) {
  if (results.length === 0) return null

  let grandTotalSheets = 0
  let grandTotalArea = 0

  const planeRows = results.map(r => {
    const lengthMap = new Map<number, number>()
    for (const col of r.columns) {
      for (const seg of col.segments) {
        lengthMap.set(seg.lengthM, (lengthMap.get(seg.lengthM) ?? 0) + 1)
      }
    }
    const entries = [...lengthMap.entries()].sort((a, b) => b[0] - a[0])
    const planeArea = entries.reduce((s, [len, cnt]) => s + len * cnt * SHEET.EFFECTIVE_WIDTH_M, 0)
    const planeSheets = entries.reduce((s, [, cnt]) => s + cnt, 0)
    grandTotalSheets += planeSheets
    grandTotalArea += planeArea
    return { plane: r, entries, planeArea, planeSheets }
  })

  return (
    <div className="hidden print:block">
      {planeRows.map(({ plane, entries, planeArea, planeSheets }) => (
        <div key={plane.planeId} className="mb-5 print:break-inside-avoid">
          <div className="flex items-baseline justify-between border border-slate-400 bg-slate-100 px-2 py-1">
            <span className="font-semibold text-sm text-gray-900">{plane.planeName}</span>
            <span className="text-xs text-gray-700">{planeArea.toFixed(2)} m²</span>
          </div>
          <table className="w-full text-xs border-collapse border border-slate-300 border-t-0">
            <thead>
              <tr className="bg-slate-50 text-gray-600">
                <th className="border border-slate-300 px-2 py-1 text-left font-medium w-12">Pozíció</th>
                <th className="border border-slate-300 px-2 py-1 text-left font-medium">Hossz (mm)</th>
                <th className="border border-slate-300 px-2 py-1 text-right font-medium">Darabszám</th>
                <th className="border border-slate-300 px-2 py-1 text-right font-medium">Terület (m²)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([len, cnt], i) => (
                <tr key={len}>
                  <td className="border border-slate-200 px-2 py-1 text-gray-500">#{i + 1}</td>
                  <td className="border border-slate-200 px-2 py-1 text-gray-900">{Math.round(len * 1000)}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right text-gray-900">{cnt}</td>
                  <td className="border border-slate-200 px-2 py-1 text-right text-gray-900">{(len * cnt * SHEET.EFFECTIVE_WIDTH_M).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-semibold bg-slate-50">
                <td className="border border-slate-300 px-2 py-1" colSpan={2}>Összefoglalás</td>
                <td className="border border-slate-300 px-2 py-1 text-right">{planeSheets} db</td>
                <td className="border border-slate-300 px-2 py-1 text-right">{planeArea.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      <div className="flex items-center justify-between border-2 border-slate-500 px-3 py-2 mt-4">
        <span className="font-bold text-sm text-gray-900">Mindösszesen</span>
        <span className="font-bold text-sm text-gray-900">{grandTotalSheets} db · {grandTotalArea.toFixed(2)} m²</span>
      </div>
    </div>
  )
}
