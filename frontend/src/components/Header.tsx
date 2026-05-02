import { useEffect, useState } from 'react'
import { GraduationCap, Database, Users, Calendar } from 'lucide-react'

interface Stats {
  total_records: number
  total_professors: number
  total_ciclos: number
}

export function Header() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  return (
    <header className="border-b border-navy-600 bg-navy-900/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-5 h-5 text-navy-900" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 leading-tight tracking-tight">
                Facultad de Ingenieria
              </h1>
              <p className="text-xs text-slate-500">Certificados Docentes · 2016–2026</p>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="hidden sm:flex items-center gap-6">
              <Stat icon={<Database className="w-3.5 h-3.5" />} value={stats.total_records.toLocaleString()} label="Registros" />
              <Stat icon={<Users className="w-3.5 h-3.5" />} value={stats.total_professors.toLocaleString()} label="Profesores" />
              <Stat icon={<Calendar className="w-3.5 h-3.5" />} value={stats.total_ciclos.toString()} label="Periodos" />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-400">
      <span className="text-gold-500">{icon}</span>
      <span className="text-sm font-semibold text-slate-200">{value}</span>
      <span className="text-xs">{label}</span>
    </div>
  )
}
