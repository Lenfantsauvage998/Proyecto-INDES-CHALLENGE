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
    <header className="sticky top-0 z-40 border-b border-white/[0.12] bg-[#0c0c0c]/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-[0.15em] leading-none mb-0.5">
              Universidad de La Sabana
            </p>
            <h1 className="text-base font-bold text-white leading-tight tracking-tight">
              Sistema de Certificación Docente
            </h1>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="hidden sm:flex items-center divide-x divide-white/10">
            <Stat icon={<Database className="w-3.5 h-3.5" />} value={stats.total_records.toLocaleString()} label="Registros" />
            <Stat icon={<Users className="w-3.5 h-3.5" />} value={stats.total_professors.toLocaleString()} label="Profesores" />
            <Stat icon={<Calendar className="w-3.5 h-3.5" />} value={stats.total_ciclos.toString()} label="Períodos" />
          </div>
        )}
      </div>
    </header>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 px-5 text-zinc-300">
      <span className="text-zinc-400">{icon}</span>
      <span className="text-sm font-bold text-white tabular-nums">{value}</span>
      <span className="text-xs text-zinc-400 uppercase tracking-wider">{label}</span>
    </div>
  )
}
