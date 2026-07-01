import { useMemo } from 'react'
import { useStore } from './store/useStore'
import { calculatePlane, groupByLength, isPlaneValid } from './utils/calculations'
import { Header } from './components/Header'
import { PlaneList } from './components/planes/PlaneList'
import { AddPlaneButton } from './components/planes/AddPlaneButton'
import { ResultsSummary } from './components/results/ResultsSummary'
import { ResultsTable } from './components/results/ResultsTable'
import { PrintReport } from './components/results/PrintReport'
import { PdfExport } from './components/results/PdfExport'

function App() {
  const planes = useStore(s => s.planes)
  const allowOversize = useStore(s => s.allowOversize)

  const validPlanes = useMemo(() => planes.filter(isPlaneValid), [planes])
  const results = useMemo(() => validPlanes.map(p => calculatePlane(p, allowOversize)), [validPlanes, allowOversize])
  const groups = useMemo(() => groupByLength(results), [results])

  return (
    <div className="min-h-dvh px-4 pb-10">
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-gray-900">Cserepeslemez Rendelési Összesítő</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <PrintReport results={results} />

      <Header />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-5">
        <section>
          <PlaneList />
          <AddPlaneButton />
        </section>

        <aside className="md:sticky md:top-4 md:self-start">
          <ResultsSummary groups={groups} />
          <ResultsTable results={results} />
          <PdfExport />
        </aside>
      </div>
    </div>
  )
}

export default App
