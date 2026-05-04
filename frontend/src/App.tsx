import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ParticleField } from '@/components/ParticleField'
import { LandingHero } from '@/components/LandingHero'
import { Header } from '@/components/Header'
import { UploadSection } from '@/components/UploadSection'
import { QuerySection } from '@/components/QuerySection'
import { DebugSection } from '@/components/DebugSection'
import { ToastContainer } from '@/components/Toast'
import type { ToastData } from '@/components/Toast'
import { Search, UploadCloud, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'query' | 'upload' | 'debug'

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

  const handleSelectTab = (selected: Tab) => {
    setTab(selected)
    document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' })
  }

  const tabs: { id: Tab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'query',  label: 'Consultar',                shortLabel: 'Consultar', icon: <Search      className="w-4 h-4" /> },
    { id: 'upload', label: 'Cargar Datos',             shortLabel: 'Cargar',    icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'debug',  label: '¿Cómo sacamos esta info?', shortLabel: '¿Cómo?',  icon: <HelpCircle  className="w-4 h-4" /> },
  ]

  return (
    <div className="relative min-h-screen bg-surface-50 text-white overflow-x-hidden selection:bg-white/10 selection:text-white">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.03),_transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.02),_transparent_50%)]" />
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[80px] opacity-[0.05] bg-white" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[80px] opacity-[0.03] bg-white" />
      </div>

      {/* Particle Network Background */}
      <ParticleField />

      {/* Landing Page Hero */}
      <LandingHero onSelectTab={handleSelectTab} />

      {/* Main Application (revealed on scroll) */}
      <div id="app" className="relative z-20">
        <Header />

        <main className="max-w-7xl w-full mx-auto px-5 sm:px-8 py-10">
          {/* Premium Tab Bar */}
          <div className="flex items-center gap-1 p-1 w-full sm:w-fit mb-8 rounded-2xl glass">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                  tab === t.id
                    ? 'text-black'
                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                )}
              >
                {tab === t.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                  {t.icon}
                  <span className="sm:hidden">{t.shortLabel}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="card p-6 sm:p-10 min-h-[520px]"
            >
              {tab === 'query'  && <QuerySection refreshKey={refreshKey} />}
              {tab === 'upload' && (
                <UploadSection onSuccess={handleUploadSuccess} addToast={addToast} refreshKey={refreshKey} />
              )}
              {tab === 'debug' && <DebugSection />}
            </motion.div>
          </AnimatePresence>

          {/* Minimal Footer */}
          <footer className="mt-12 border-t border-white/[0.12] pt-8">
            <p className="text-center text-[11px] tracking-widest uppercase text-zinc-400">
              Facultad de Ingeniería &middot; Universidad de La Sabana &middot; Sistema de Certificación Docente &middot; 2016–2026
            </p>
          </footer>
        </main>

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  )
}
