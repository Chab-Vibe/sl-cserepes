import { useRef } from 'react'
import { RotateCcw, Download, Upload } from 'lucide-react'
import { useStore } from '../store/useStore'
import { SHEET } from '../utils/calculations'

export function Header() {
  const planes = useStore(s => s.planes)
  const allowOversize = useStore(s => s.allowOversize)
  const setAllowOversize = useStore(s => s.setAllowOversize)
  const reset = useStore(s => s.reset)
  const importProject = useStore(s => s.importProject)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleReset = () => {
    if (confirm('Biztosan törlöd az összes tetősíkot?')) reset()
  }

  const handleExport = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      allowOversize,
      planes,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `cserepeslemez-projekt-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => fileInputRef.current?.click()

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data || !Array.isArray(data.planes)) throw new Error('invalid')
      if (planes.length > 0 && !confirm('Ez felülírja a jelenlegi tetősíkokat a fájlban lévőkkel. Folytatod?')) return
      importProject({ planes: data.planes, allowOversize: !!data.allowOversize })
    } catch {
      alert('Nem sikerült beolvasni a fájlt — érvénytelen projekt-export.')
    }
  }

  return (
    <header className="py-4 print:hidden">
      <div className="flex items-center justify-between flex-wrap gap-y-2">
        <div>
          <h1 className="text-slate-800 font-bold text-xl leading-tight">Cserepeslemez Kalkulátor</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Hasznos szélesség: {SHEET.EFFECTIVE_WIDTH_M * 1000} mm · Modul osztás: {SHEET.MODULE_M * 1000} mm · Orr: {SHEET.NOSE_M * 1000} mm
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            title="Projekt mentése JSON fájlba"
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm transition-colors"
          >
            <Download size={15} />
            Export
          </button>
          <button
            onClick={handleImportClick}
            title="Projekt betöltése JSON fájlból"
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm transition-colors"
          >
            <Upload size={15} />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm transition-colors"
          >
            <RotateCcw size={15} />
            Törlés
          </button>
        </div>
      </div>

      <label className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 shadow-sm px-3.5 py-2.5 cursor-pointer select-none">
        <span className="text-sm text-slate-600 leading-snug">
          <span className="font-medium text-slate-800">Egybefüggő lemez engedélyezése 6 m fölött</span>
          <br />
          <span className="text-slate-400">Ha ki van kapcsolva, a 6 m-nél magasabb oszlopok automatikusan toldva lesznek ({Math.round(SHEET.OVERLAP_M * 1000)} mm átfedéssel).</span>
        </span>
        <span className="relative shrink-0">
          <input
            type="checkbox"
            checked={allowOversize}
            onChange={e => setAllowOversize(e.target.checked)}
            className="sr-only peer"
          />
          <span className="block w-10 h-6 rounded-full bg-slate-200 peer-checked:bg-blue-600 transition-colors" />
          <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </span>
      </label>
    </header>
  )
}
