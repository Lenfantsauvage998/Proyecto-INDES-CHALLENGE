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
    <div className="space-y-3 animate-slide-up">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          <span className="text-gold-400 font-semibold">{data.length}</span> registro(s) ·{' '}
          <span className="text-gold-400 font-semibold">{totalSesiones}</span> sesiones totales
        </p>
        <div className="flex gap-2">
          <button onClick={() => exportData('csv')} className="btn-outline flex items-center gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={() => exportData('excel')} className="btn-gold flex items-center gap-1.5 text-xs">
            <FileSpreadsheet className="w-3 h-3" />
            <Download className="w-3 h-3" /> Excel
          </button>
        </div>
      </div>

      {/* Certificate table */}
      <div className="rounded-xl border border-navy-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-navy-700/80 border-b border-navy-600">
                {showCiclo && (
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-36">
                    Semestre
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Asignatura
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-300 uppercase tracking-wider w-24">
                  Sesiones
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider hidden lg:table-cell">
                  Departamento
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr
                  key={`${row.ciclo_lectivo}-${row.nombre_curso || row.materia}-${i}`}
                  className={
                    'hover:bg-gold-500/5 transition-colors duration-100 border-b border-navy-700/40 last:border-b-0 ' +
                    (i % 2 === 0 ? 'table-row-even' : 'table-row-odd')
                  }
                >
                  {showCiclo && (
                    <td className="px-4 py-2.5 text-xs text-gold-400 whitespace-nowrap font-medium">
                      {row.ciclo_lectivo}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-slate-200 font-medium uppercase" title={row.nombre_curso || row.materia}>
                    {row.nombre_curso || row.materia}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-100">
                    {row.horas_semestre}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs hidden lg:table-cell uppercase" title={row.departamento}>
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
