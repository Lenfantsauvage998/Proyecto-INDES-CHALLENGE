import { Download, FileSpreadsheet, FileText } from 'lucide-react'

export interface Certificate {
  profesor: string
  componente: string
  materia: string
  nombre_curso: string
  ciclo_lectivo: string
  horas_semestre: number
  num_grupos: number
  departamento: string
  fecha_inicio: string
  fecha_fin: string
}

interface Props {
  data: Certificate[]
  profesorFilter: string
  ciclosFilter: string[]
}

export function CertificateTable({ data, profesorFilter, ciclosFilter }: Props) {
  const sorted = [...data].sort((a, b) => {
    const byC = a.ciclo_lectivo.localeCompare(b.ciclo_lectivo)
    if (byC !== 0) return byC
    return (a.nombre_curso || a.materia).localeCompare(b.nombre_curso || b.materia, 'es')
  })

  const totalSesiones = sorted.reduce((s, r) => s + r.horas_semestre, 0)
  const showCiclo = ciclosFilter.length > 1

  const exportData = async (format: 'csv' | 'excel') => {
    const params = new URLSearchParams()
    if (profesorFilter) params.set('profesor', profesorFilter)
    if (ciclosFilter.length) params.set('ciclos', ciclosFilter.join(','))
    params.set('format', format)
    const res = await fetch(`/api/export?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `certificado_${(profesorFilter || ciclosFilter[0] || 'todos').replace(/\s+/g, '_')}.${format === 'excel' ? 'xlsx' : 'csv'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (data.length === 0) return null

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-zinc-400">
          <span className="text-white font-semibold">{data.length}</span> registro(s) &middot;{' '}
          <span className="text-white font-semibold">{totalSesiones}</span> sesiones totales
        </p>
        <div className="flex gap-2">
          <button onClick={() => exportData('csv')} className="btn-outline flex items-center gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={() => exportData('excel')} className="btn-primary flex items-center gap-1.5 text-xs">
            <FileSpreadsheet className="w-3 h-3" />
            <Download className="w-3 h-3" /> Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.12] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-white/[0.06] border-b border-white/[0.10]">
                {showCiclo && (
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-zinc-300 uppercase tracking-wider w-36">
                    Semestre
                  </th>
                )}
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                  Asignatura
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold text-zinc-300 uppercase tracking-wider w-24">
                  Sesiones
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-zinc-300 uppercase tracking-wider hidden lg:table-cell">
                  Departamento
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr
                  key={`${row.ciclo_lectivo}-${row.nombre_curso || row.materia}-${i}`}
                  className="hover:bg-white/[0.04] transition-colors duration-100 border-b border-white/[0.06] last:border-b-0"
                >
                  {showCiclo && (
                    <td className="px-5 py-3 text-xs text-zinc-200 whitespace-nowrap font-medium">
                      {row.ciclo_lectivo}
                    </td>
                  )}
                  <td className="px-5 py-3 text-zinc-100 font-medium uppercase tracking-wide">
                    {row.nombre_curso || row.materia}
                  </td>
                  <td className="px-5 py-3 text-center font-mono font-semibold text-white text-xs">
                    {row.horas_semestre}
                  </td>
                  <td className="px-5 py-3 text-zinc-400 text-xs hidden lg:table-cell uppercase tracking-wide">
                    {row.departamento || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
