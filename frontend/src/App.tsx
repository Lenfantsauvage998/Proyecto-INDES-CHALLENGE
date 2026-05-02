import { useState } from 'react'
import { Header } from '@/components/Header'
import { UploadSection } from '@/components/UploadSection'
import { QuerySection } from '@/components/QuerySection'
import { ToastContainer } from '@/components/Toast'
import type { ToastData } from '@/components/Toast'
import { Search, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'query' | 'upload'

export default function App() {
  const [tab, setTab] = useState<Tab>('query')
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const addToast = (t: Omit<ToastData, 'id'>) =>
    setToasts((prev) => [...prev, { ...t, id: Date.now() }])

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id))

  const handleUploadSuccess = () => {
    setRefreshKey((k) => k + 1)
    setTimeout(() => setTab('query'), 1500)
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'query', label: 'Consultar', icon: <Search className="w-4 h-4" /> },
    { id: 'upload', label: 'Cargar Datos', icon: <UploadCloud className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-navy-900 text-slate-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-navy-800/60 border border-navy-600 rounded-xl p-1 w-fit mb-8">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                tab === t.id
                  ? 'bg-gold-500 text-navy-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-700/60',
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="card gold-border p-6 sm:p-8 min-h-[520px] animate-fade-in">
          {tab === 'query' && <QuerySection refreshKey={refreshKey} />}
          {tab === 'upload' && (
            <UploadSection onSuccess={handleUploadSuccess} addToast={addToast} refreshKey={refreshKey} />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-700 mt-8">
          Facultad de Ingenieria · Sistema de Certificacion Docente · 2016–2026
        </p>
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
