import { Printer } from 'lucide-react'

export function PdfExport() {
  return (
    <button
      onClick={() => window.print()}
      className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600/80 hover:bg-blue-600 border border-blue-400/30 py-2.5 text-white text-sm font-medium transition-colors print:hidden"
    >
      <Printer size={15} />
      Nyomtatás / PDF mentés
    </button>
  )
}
