import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, ChevronDown, ChevronRight, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  step: number
  label: string
  description: string
  row_count: number
  columns?: string[]
  rows?: Record<string, unknown>[]
}

export function DebugSection() {
  const [profesor, setProfesor] = useState('')
  const [ciclo, setCiclo] = useState('')
  const [ciclos, setCiclos] = useState<string[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [openStep, setOpenStep] = useState<number | null>(null)

  // Autocomplete
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSugg, setActiveSugg] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggContainerRef = useRef<HTMLDivElement>(null)

  // Period dropdown
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)
  const periodDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/ciclos')
      .then((r) => r.json())
      .then((d) => setCiclos(d.ciclos ?? []))
      .catch(() => {})
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggContainerRef.current && !suggContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false); setActiveSugg(-1)
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setShowPeriodDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Professor autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (profesor.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/professors?q=${encodeURIComponent(profesor.trim())}`)
        const data = await res.json()
        const list: string[] = data.professors ?? []
        setSuggestions(list)
        setShowSuggestions(list.length > 0)
        setActiveSugg(-1)
      } catch { setSuggestions([]) }
    }, 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [profesor])

  const selectSuggestion = (name: string) => {
    setProfesor(name); setSuggestions([]); setShowSuggestions(false); setActiveSugg(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) { if (e.key === 'Enter') handleSearch(); return }
    if (e.key === 'ArrowDown')     { e.preventDefault(); setActiveSugg(v => Math.min(v + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp')  { e.preventDefault(); setActiveSugg(v => Math.max(v - 1, -1)) }
    else if (e.key === 'Enter')    { e.preventDefault(); activeSugg >= 0 ? selectSuggestion(suggestions[activeSugg]) : (setShowSuggestions(false), handleSearch()) }
    else if (e.key === 'Escape')   { setShowSuggestions(false); setActiveSugg(-1) }
  }

  async function handleSearch() {
    if (!profesor.trim() || !ciclo) return
    setLoading(true); setError(''); setSteps([]); setOpenStep(null)
    try {
      const res = await fetch(
        `/api/debug?profesor=${encodeURIComponent(profesor.trim())}&ciclo=${encodeURIComponent(ciclo)}`,
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `Error ${res.status}`)
      }
      const data = await res.json()
      setSteps(data.steps ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10 mt-0.5">
          <Info className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">¿Cómo sacamos esta info?</h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Visualiza paso a paso cómo se transforma el Excel académico en el certificado de carga docente.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-wrap gap-3">
        {/* Professor autocomplete */}
        <div className="relative flex-1 min-w-[220px]" ref={suggContainerRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Nombre del profesor..."
            value={profesor}
            onChange={(e) => setProfesor(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="input w-full pl-9 pr-9"
          />
          {profesor && (
            <button
              onClick={() => { setProfesor(''); setSuggestions([]); setShowSuggestions(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {showSuggestions && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-[#141414] border border-white/[0.14] rounded-xl shadow-2xl z-30 overflow-hidden">
              {suggestions.map((name, i) => (
                <button
                  key={name}
                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(name) }}
                  className={cn(
                    'w-full text-left px-4 py-2.5 text-sm transition-colors',
                    i === activeSugg ? 'bg-white/[0.10] text-white' : 'text-zinc-200 hover:bg-white/[0.08]'
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Styled period dropdown */}
        <div className="relative min-w-[200px]" ref={periodDropdownRef}>
          <button
            onClick={() => setShowPeriodDropdown(v => !v)}
            className={cn(
              'input w-full flex items-center justify-between gap-2',
              ciclo ? 'text-white' : 'text-zinc-400'
            )}
          >
            <span className="truncate">{ciclo || 'Seleccionar período...'}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-200', showPeriodDropdown && 'rotate-180')} />
          </button>

          {showPeriodDropdown && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-[#141414] border border-white/[0.14] rounded-xl shadow-2xl z-30 overflow-hidden">
              <div className="max-h-60 overflow-y-auto py-1">
                {ciclos.length === 0 && (
                  <p className="px-4 py-3 text-sm text-zinc-500">Sin períodos disponibles</p>
                )}
                {ciclos.map((c) => (
                  <button
                    key={c}
                    onMouseDown={(e) => { e.preventDefault(); setCiclo(c); setShowPeriodDropdown(false) }}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm transition-colors',
                      ciclo === c ? 'bg-white/[0.12] text-white font-medium' : 'text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !profesor.trim() || !ciclo}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Trazar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className={cn(
          'rounded-xl px-4 py-3 text-sm',
          error.includes('archivo Excel') || error.includes('fuente')
            ? 'border border-amber-400/20 bg-amber-500/10 text-amber-200'
            : 'border border-red-400/20 bg-red-500/10 text-red-200'
        )}>
          {error.includes('archivo Excel') || error.includes('fuente')
            ? '⚠️ Esta función de trazado ETL requiere el archivo Excel fuente cargado en el servidor. En el entorno desplegado, sube primero el archivo en la pestaña "Cargar Datos".'
            : error}
        </div>
      )}

      {/* Steps */}
      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((s) => (
            <div key={s.step} className="rounded-xl border border-white/[0.12] bg-white/[0.04] overflow-hidden">
              <button
                onClick={() => setOpenStep(openStep === s.step ? null : s.step)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.07] transition-colors"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold flex items-center justify-center">
                  {s.step}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-zinc-100 text-sm">{s.label}</span>
                  <span className="ml-2 text-xs text-zinc-400">{s.row_count} filas</span>
                </div>
                {openStep === s.step
                  ? <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />}
              </button>

              {openStep === s.step && (
                <div className="px-5 pb-5 space-y-3 border-t border-white/[0.08]">
                  <p className="text-xs text-zinc-400 pt-3">{s.description}</p>
                  {s.rows && s.rows.length > 0 && s.columns && (
                    <div className="overflow-x-auto rounded-lg border border-white/[0.12]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white/[0.05]">
                            {s.columns.map((col) => (
                              <th key={col} className="px-3 py-2 text-left text-zinc-300 font-semibold whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {s.rows.slice(0, 20).map((row, i) => (
                            <tr key={i} className="border-t border-white/[0.06]">
                              {s.columns!.map((col) => (
                                <td key={col} className="px-3 py-1.5 text-zinc-300 whitespace-nowrap">
                                  {row[col] == null ? '—' : String(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {s.rows.length > 20 && (
                        <p className="text-xs text-zinc-400 px-3 py-2 border-t border-white/[0.06]">
                          &hellip; y {s.rows.length - 20} filas más
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && steps.length === 0 && !error && (
        <p className="text-center text-sm text-zinc-400 py-12">
          Selecciona un profesor y un período para ver el trazado ETL paso a paso.
        </p>
      )}
    </div>
  )
}
