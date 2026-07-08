import { useStore } from '../../store/useStore'
import { Modal } from '../Modal'

interface Props {
  open: boolean
  onClose: () => void
}

const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-sm outline-none focus:border-blue-400"
const labelClass = "text-xs text-slate-500 block mb-1"

export function CustomerInfoForm({ open, onClose }: Props) {
  const customerInfo = useStore(s => s.customerInfo)
  const setCustomerInfo = useStore(s => s.setCustomerInfo)

  return (
    <Modal open={open} onClose={onClose} title="Ügyfél adatai">
      <div className="space-y-4">
        <label className="block">
          <span className={labelClass}>Név</span>
          <input
            className={inputClass}
            value={customerInfo.name}
            onChange={e => setCustomerInfo({ name: e.target.value })}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Megjegyzés</span>
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            value={customerInfo.description}
            onChange={e => setCustomerInfo({ description: e.target.value })}
          />
        </label>

        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          Kész
        </button>
      </div>
    </Modal>
  )
}
