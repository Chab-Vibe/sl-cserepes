import { RotateCcw } from 'lucide-react'
import { useStore } from '../store/useStore'
import { SHEET } from '../utils/calculations'

export function Header() {
  const reset = useStore(s => s.reset)

  const handleReset = () => {
    if (confirm('Biztosan törlöd az összes tetősíkot?')) reset()
  }

  return (
    <header className="flex items-center justify-between py-4 print:hidden">
      <div>
        <h1 className="text-white font-bold text-lg leading-tight">Cserepeslemez Kalkulátor</h1>
        <p className="text-white/40 text-xs mt-0.5">
          Hasznos szélesség: {SHEET.EFFECTIVE_WIDTH_M * 1000} mm · Modul osztás: {SHEET.MODULE_M * 1000} mm · Orr: {SHEET.NOSE_M * 1000} mm
        </p>
      </div>
      <button
        onClick={handleReset}
        className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs transition-colors"
      >
        <RotateCcw size={13} />
        Törlés
      </button>
    </header>
  )
}
