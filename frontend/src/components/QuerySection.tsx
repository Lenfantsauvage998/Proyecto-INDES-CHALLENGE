import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, Loader2, AlertTriangle, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CertificateTable } from './CertificateTable'
import type { Certificate } from './CertificateTable'

interface Props {
  refreshKey: number
}

export function QuerySection({ refreshKey }: Props) {
  const [profesor, setProfesor] = useState('')
  const [ciclos, setCiclos] = useState<string[]>([])
  const [selectedCiclos, setSelectedCiclos] = useState<string[]>([])
  const [results, setResults] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [missingCiclos, setMissingCiclos] = useState<string[]>([])

  // Autocomplete
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSugg, setActiveSugg] = useState(-1)

  // Period dropdown
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)

  const searchContainerRef = useRef<HTMLDivElement>(null)
  const periodDropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/ciclos')
      .then((r) => r.json())
      .then((data) => {
        const list: string[] = data.ciclos ?? []
        setCiclos(list)
        if (list.length > 0) setSelectedCiclos([list[list.length - 1]])
      })
      .catch(() => {})
  }, [refreshKey])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
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
      const params = new URLSearchParams({ q: profesor.trim() })
      if (selectedCiclos.length) params.set('ciclos', selectedCiclos.join(','))
      try {
        const res = await fetch(`/api/professors?${params}`)
        const data = await res.json()
        const list: string[] = data.professors ?? []
        setSuggestions(list)
        setShowSuggestions(list.length > 0)
        setActiveSugg(-1)
      } catch { setSuggestions([]) }
    }, 280)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [profesor, selectedCiclos])

  const selectSuggestion = (name: string) => {
    setProfesor(name); setSuggestions([]); setShowSuggestions(false); setActiveSugg(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) { if (e.key === 'Enter') search(); return }
    if (e.key === 'ArrowDown')     { e.preventDefault(); setActiveSugg(v => Math.min(v + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp')  { e.preventDefault(); setActiveSugg(v => Math.max(v - 1, -1)) }
    else if (e.key === 'Enter')    { e.preventDefault(); activeSugg >= 0 ? selectSuggestion(suggestions[activeSugg]) : (setShowSuggestions(false), search()) }
    else if (e.key === 'Escape')   { setShowSuggestions(false); setActiveSugg(-1) }
  }

  const toggleCiclo = (c: string) => {
    setSelectedCiclos(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    )
    setMissingCiclos([])
  }

  const toggleAll = () => {
    setSelectedCiclos(prev => prev.length === ciclos.length ? [] : [...ciclos])
    setMissingCiclos([])
  }

  const periodLabel = selectedCiclos.length === 0
    ? 'Seleccionar período...'
    : selectedCiclos.length === 1
    ? selectedCiclos[0]
    : `${selectedCiclos.length} períodos`

  const canSearch = selectedCiclos.length > 0 && profesor.trim() !== ''

  const search = useCallback(async () => {
    if (!canSearch) return
    setShowSuggestions(false); setLoading(true); setSearched(true); setMissingCiclos([])
    try {
      const params = new URLSearchParams()
      params.set('ciclos', selectedCiclos.join(','))
      params.set('profesor', profesor.trim())
      const res = await fetch(`/api/certificates?${params}`)
      const data = await res.json()
      const fetched: Certificate[] = data.results ?? []
      const resultSet = new Set(fetched.map(r => r.ciclo_lectivo))
      const missing = selectedCiclos.filter(c => !resultSet.has(c))
      if (missing.length > 0) { setMissingCiclos(missing); setResults([]) }
      else { setResults(fetched) }
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [profesor, selectedCiclos, canSearch])

  const clear = () => {
    setProfesor(''); setResults([]); setSearched(false); setMissingCiclos([])
    setSuggestions([]); setShowSuggestions(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Consultar Certificados</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Selecciona uno o varios períodos y filtra por nombre del profesor.
        </p>
      </div>

      {/* Search row */}
      <div className="flex flex-wrap gap-3">
        {/* Multi-select period dropdown */}
        <div className="relative min-w-[200px]" ref={periodDropdownRef}>
          <button
            onClick={() => setShowPeriodDropdown(v => !v)}
            className={cn(
              'input w-full flex items-center justify-between gap-2',
              selectedCiclos.length > 0 ? 'text-white' : 'text-zinc-400'
            )}
          >
            <span className="truncate">{periodLabel}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-200', showPeriodDropdown && 'rotate-180')} />
          </button>

          {showPeriodDropdown && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-[#141414] border border-white/[0.14] rounded-xl shadow-2xl z-30 overflow-hidden min-w-[200px]">
              {/* Select all */}
              <button
                onMouseDown={(e) => { e.preventDefault(); toggleAll() }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors border-b border-white/[0.08]"
              >
                <span className="uppercase tracking-widest">
                  {selectedCiclos.length === ciclos.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </span>
                {selectedCiclos.length === ciclos.length && <Check className="w-3 h-3" />}
              </button>
              <div className="max-h-56 overflow-y-auto py-1">
                {ciclos.length === 0 && (
                  <p className="px-4 py-3 text-sm text-zinc-500">Sin períodos disponibles</p>
                )}
                {ciclos.map((c) => {
                  const selected = selectedCiclos.includes(c)
                  return (
                    <button
                      key={c}
                      onMouseDown={(e) => { e.preventDefault(); toggleCiclo(c) }}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                        selected ? 'bg-white/[0.10] text-white font-medium' : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                      )}
                    >
                      {c}
                      {selected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Professor search */}
        <div className="relative flex-1 min-w-[220px]" ref={searchContainerRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none z-10" />
          <input
            type="text"
            value={profesor}
            onChange={(e) => { setProfesor(e.target.value); setMissingCiclos([]) }}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Nombre del profesor (parcial)..."
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

        <div className="flex items-center gap-2">
          <button
            onClick={search}
            disabled={!canSearch || loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-30"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
          {profesor.trim() && (
            <button onClick={clear} className="btn-outline">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Missing semesters alert */}
      {missingCiclos.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">
              No se encontraron registros para {missingCiclos.length === 1 ? 'el semestre' : 'los semestres'}:
            </p>
            <p className="mt-0.5">{missingCiclos.join(', ')}</p>
          </div>
        </div>
      )}

      {searched && !loading && results.length === 0 && missingCiclos.length === 0 && (
        <div className="text-center text-sm text-zinc-400 py-12">
          No se encontraron resultados para los filtros seleccionados.
        </div>
      )}

      <CertificateTable data={results} profesorFilter={profesor} ciclosFilter={selectedCiclos} />
    </div>
  )
}
