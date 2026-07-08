import { useRef } from 'react'
import { RotateCcw, Download, Upload, Printer } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { SHEET_PROFILES } from '../../utils/calculations'
import { TypePicker } from '../TypePicker'

export function Ribbon() {
  const planes = useStore(s => s.planes)
  const allowOversize = useStore(s => s.allowOversize)
  const setAllowOversize = useStore(s => s.setAllowOversize)
  const sheetType = useStore(s => s.sheetType)
  const setSheetType = useStore(s => s.setSheetType)
  const customerInfo = useStore(s => s.customerInfo)
  const reset = useStore(s => s.reset)
  const importProject = useStore(s => s.importProject)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profile = SHEET_PROFILES[sheetType]

  const handleReset = () => {
    if (confirm('Biztosan törlöd az összes tetősíkot?')) reset()
  }

  const handleExport = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      sheetType,
      allowOversize,
      planes,
      customerInfo,
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
      importProject({
        planes: data.planes,
        allowOversize: !!data.allowOversize,
        sheetType: data.sheetType && data.sheetType in SHEET_PROFILES ? data.sheetType : undefined,
        customerInfo: data.customerInfo,
      })
    } catch {
      alert('Nem sikerült beolvasni a fájlt — érvénytelen projekt-export.')
    }
  }

  const ribbonBtn = "flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"

  return (
    <div className="flex items-stretch gap-3 rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-2 print:hidden overflow-x-auto">
      <div className="flex flex-col justify-center shrink-0">
        <h1 className="text-slate-800 font-bold text-base leading-tight whitespace-nowrap">Cserepeslemez Kalkulátor</h1>
        <span className="text-slate-400 text-[11px] whitespace-nowrap">
          {profile.totalWidthM * 1000} mm teljes · max. {profile.maxSingleLengthM} m
        </span>
      </div>

      <div className="w-px bg-slate-200 self-stretch shrink-0" />

      <div className="flex flex-col items-center shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={handleExport} title="Projekt mentése JSON fájlba" className={ribbonBtn}>
            <Download size={16} />
          </button>
          <button onClick={handleImportClick} title="Projekt betöltése JSON fájlból" className={ribbonBtn}>
            <Upload size={16} />
          </button>
          <button onClick={handleReset} title="Összes tetősík törlése" className={ribbonBtn}>
            <RotateCcw size={16} />
          </button>
          <button onClick={() => window.print()} title="Nyomtatás / PDF mentés" className={ribbonBtn}>
            <Printer size={16} />
          </button>
        </div>
        <span className="text-[10px] text-slate-400 mt-0.5">Fájl</span>
      </div>
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />

      <div className="w-px bg-slate-200 self-stretch shrink-0" />

      <div className="flex flex-col items-center shrink-0">
        <div className="flex items-center gap-3">
          <TypePicker sheetType={sheetType} onChange={setSheetType} />
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer whitespace-nowrap" title={`Egybefüggő lemez engedélyezése ${profile.maxSingleLengthM} m fölött`}>
            <span className="relative inline-block shrink-0">
              <input
                type="checkbox"
                checked={allowOversize}
                onChange={e => setAllowOversize(e.target.checked)}
                className="sr-only peer"
              />
              <span className="block w-8 h-5 rounded-full bg-slate-200 peer-checked:bg-blue-600 transition-colors" />
              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-3" />
            </span>
            Egybefüggő
          </label>
        </div>
        <span className="text-[10px] text-slate-400 mt-0.5">Termék</span>
      </div>
    </div>
  )
}
