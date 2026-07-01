import { RotateCcw } from 'lucide-react'
import { useStore } from '../store/useStore'
import { SHEET } from '../utils/calculations'

export function Header() {
  const reset = useStore(s => s.reset)
  const allowOversize = useStore(s => s.allowOversize)
  const setAllowOversize = useStore(s => s.setAllowOversize)

  const handleReset = () => {
    if (confirm('Biztosan törlöd az összes tetősíkot?')) reset()
  }

  return (
    <header className="py-4 print:hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-800 font-bold text-lg leading-tight">Cserepeslemez Kalkulátor</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Hasznos szélesség: {SHEET.EFFECTIVE_WIDTH_M * 1000} mm · Modul osztás: {SHEET.MODULE_M * 1000} mm · Orr: {SHEET.NOSE_M * 1000} mm
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-xs transition-colors"
        >
          <RotateCcw size={13} />
          Törlés
        </button>
      </div>

      <label className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 shadow-sm px-3.5 py-2.5 cursor-pointer select-none">
        <span className="text-xs text-slate-600 leading-snug">
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
