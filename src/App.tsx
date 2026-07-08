import { useMemo } from 'react'
import { useStore } from './store/useStore'
import { calculatePlane, groupByLength, groupAccessories, isPlaneValid, SHEET_PROFILES } from './utils/calculations'
import { SheetLayout } from './components/visualization/SheetLayout'
import { ShellRoot } from './components/shell/ShellRoot'
import { PrintReport } from './components/results/PrintReport'

function App() {
  const planes = useStore(s => s.planes)
  const allowOversize = useStore(s => s.allowOversize)
  const sheetType = useStore(s => s.sheetType)
  const customerInfo = useStore(s => s.customerInfo)
  const profile = SHEET_PROFILES[sheetType]

  const validPlanes = useMemo(() => planes.filter(isPlaneValid), [planes])
  const results = useMemo(() => validPlanes.map(p => calculatePlane(p, profile, allowOversize)), [validPlanes, profile, allowOversize])
  const groups = useMemo(() => groupByLength(results), [results])
  const accessoryGroups = useMemo(() => groupAccessories(validPlanes), [validPlanes])

  return (
    <>
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-gray-900">Cserepeslemez Rendelési Összesítő</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <PrintReport results={results} profile={profile} customerInfo={customerInfo} accessoryGroups={accessoryGroups} />

      {/* Nyomtatáshoz minden érvényes sík kiosztási rajza — az interaktív
          shell mindig csak az AKTÍV síkot mutatja, ezért ez a lista
          függetlenül, mindig mountolva van, hogy a nyomtatás mindegyiket
          tartalmazza (nem csak az épp kijelöltet). */}
      {validPlanes.map(p => {
        const result = results.find(r => r.planeId === p.id)
        if (!result) return null
        return (
          <div key={p.id} className="hidden print:block">
            <SheetLayout plane={p} result={result} profile={profile} />
          </div>
        )
      })}

      <ShellRoot results={results} groups={groups} accessoryGroups={accessoryGroups} />
    </>
  )
}

export default App
