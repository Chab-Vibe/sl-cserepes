import { ClipboardList } from 'lucide-react'

interface Props {
  hasPlanes: boolean
}

export function SummaryWorkspace({ hasPlanes }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-2 p-8">
      <ClipboardList size={32} className="opacity-40" />
      <p className="text-sm max-w-xs">
        {hasPlanes
          ? 'Válassz ki egy tetősíkot a bal oldali listából az alakzat vagy a kiosztás szerkesztéséhez.'
          : 'Még nincs tetősík megadva. Kattints az „Új tetősík" gombra a kezdéshez.'}
      </p>
    </div>
  )
}
