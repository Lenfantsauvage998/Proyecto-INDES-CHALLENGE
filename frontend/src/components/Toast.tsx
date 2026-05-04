import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastData {
  id: number
  type: ToastType
  title: string
  message?: string
}

interface ToastProps {
  toast: ToastData
  onDismiss: (id: number) => void
}

function Toast({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(toast.id), 300)
    }, 4500)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-white" />,
    error: <XCircle className="w-5 h-5 text-zinc-200" />,
    info: <AlertCircle className="w-5 h-5 text-zinc-300" />,
  }

  const borders = {
    success: 'border-white/10',
    error: 'border-white/10',
    info: 'border-white/10',
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 bg-surface-200 border rounded-xl p-4 shadow-2xl w-80',
        'transition-all duration-300',
        borders[toast.type],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      )}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{toast.title}</p>
        {toast.message && <p className="text-xs text-zinc-400 mt-0.5">{toast.message}</p>}
      </div>
      <button onClick={() => onDismiss(toast.id)} className="text-zinc-400 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastData[]
  onDismiss: (id: number) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
