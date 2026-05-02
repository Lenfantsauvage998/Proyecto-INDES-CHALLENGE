import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Filter, X, Loader2, ChevronDown, Check, AlertTriangle } from 'lucide-react'
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
  const [showCicloDropdown, setShowCicloDropdown] = useState(false)
  const [missingCiclos, setMissingCiclos] = useState<string[]>([])

  // autocomplete
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSugg, setActiveSugg] = useState(-1)

  const cicloDropdownRef = useRef<HTMLDivElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/ciclos')
      .then((r) => r.json())
      .then((data) => setCiclos(data.ciclos ?? []))
      .catch(() => {})
  }, [refreshKey])

  // close ciclo dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cicloDropdownRef.current && !cicloDropdownRef.current.contains(e.target as Node))
        setShowCicloDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
        setActiveSugg(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // debounced autocomplete fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (profesor.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

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
      } catch {
        setSuggestions([])
      }
    }, 280)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [profesor, selectedCiclos])

  const selectSuggestion = (name: string) => {
    setProfesor(name)
    setSuggestions([])
    setShowSuggestions(false)
    setActiveSugg(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') search()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSugg(v => Math.min(v + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSugg(v => Math.max(v - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeSugg >= 0) {
        selectSuggestion(suggestions[activeSugg])
      } else {
        setShowSuggestions(false)
        search()
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setActiveSugg(-1)
    }
  }

  const toggleCiclo = (c: string) => {
    setSelectedCiclos(prev => {
      const next = prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
      return next.sort()
    })
    setMissingCiclos([])
  }

  const allSelected = ciclos.length > 0 && ciclos.every(c => selectedCiclos.includes(c))
  const toggleAll = () => {
    setSelectedCiclos(allSelected ? [] : [...ciclos])
    setMissingCiclos([])
  }

  const cicloLabel =
    selectedCiclos.length === 0
      ? 'Selecciona semestre(s)…'
      : selectedCiclos.length === 1
        ? selectedCiclos[0]
        : `${selectedCiclos.length} semestres seleccionados`

  const canSearch = selectedCiclos.length > 0 && profesor.trim() !== ''

  const search = useCallback(async () => {
    if (!canSearch) return
    setShowSuggestions(false)
    setLoading(true)
    setSearched(true)
    setMissingCiclos([])
    try {
      const params = new URLSearchParams()
      params.set('ciclos', selectedCiclos.join(','))
      params.set('profesor', profesor.trim())
      const res = await fetch(`/api/certificates?${params}`)
      const data = await res.json()
      const fetched: Certificate[] = data.results ?? []

      const resultSet = new Set(fetched.map(r => r.ciclo_lectivo))
      const missing = selectedCiclos.filter(c => !resultSet.has(c))

      if (missing.length > 0) {
        setMissingCiclos(missing)
        setResults([])
      } else {
        setResults(fetched)
      }
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [profesor, selectedCiclos, canSearch])

  const clear = () => {
    setProfesor('')
    setSelectedCiclos([])
    setResults([])
    setSearched(false)
    setMissingCiclos([])
    setSuggestions([])
    setShowSuggestions(false)
  }

  const hasFilters = profesor.trim() || selectedCiclos.length > 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Consultar Certificados</h2>
        <p className="text-sm text-slate-500 mt-1">
          Selecciona uno o varios semestres y filtra por nombre del profesor.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Multi-select ciclo dropdown */}
        <div className="relative" ref={cicloDropdownRef}>
          <button
            onClick={() => setShowCicloDropdown(v => !v)}
            className={cn(
              'input-dark flex items-center gap-2 min-w-[210px] justify-between',
              selectedCiclos.length > 0 ? 'text-gold-400 border-gold-500/40' : 'text-slate-400',
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Filter className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{cicloLabel}</span>
            </span>
            <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform', showCicloDropdown && 'rotate-180')} />
          </button>

          {showCicloDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-navy-700 border border-navy-500 rounded-xl shadow-2xl z-30 overflow-hidden animate-fade-in" style={{ width: '17rem' }}>
              <button
                onClick={toggleAll}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm border-b border-navy-600 hover:bg-navy-600 transition-colors text-slate-300"
              >
                <span className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                  allSelected ? 'bg-gold-500 border-gold-500' : 'border-slate-500'
                )}>
                  {allSelected && <Check className="w-2.5 h-2.5 text-navy-900" />}
                </span>
                Todos los semestres
              </button>
              <div className="max-h-60 overflow-y-auto py-1">
                {ciclos.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleCiclo(c)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-navy-600',
                      selectedCiclos.includes(c) ? 'text-gold-400' : 'text-slate-300',
                    )}
                  >
                    <span className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                      selectedCiclos.includes(c) ? 'bg-gold-500 border-gold-500' : 'border-slate-500'
                    )}>
                      {selectedCiclos.includes(c) && <Check className="w-2.5 h-2.5 text-navy-900" />}
                    </span>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Professor search with autocomplete */}
        <div className="relative flex-1 min-w-[220px]" ref={searchContainerRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />
          <input
            type="text"
            value={profesor}
            onChange={(e) => { setProfesor(e.target.value); setMissingCiclos([]) }}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Nombre del profesor (parcial)..."
            className="input-dark w-full pl-9 pr-4"
            autoComplete="off"
          />

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-navy-700 border border-navy-500 rounded-xl shadow-2xl z-30 overflow-hidden animate-fade-in">
              <div className="max-h-60 overflow-y-auto py-1">
                {suggestions.map((name, idx) => (
                  <button
                    key={name}
                    onMouseDown={(e) => { e.preventDefault(); selectSuggestion(name) }}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm transition-colors',
                      idx === activeSugg
                        ? 'bg-gold-500/20 text-gold-300'
                        : 'text-slate-200 hover:bg-navy-600',
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={search}
          disabled={!canSearch || loading}
          className="btn-gold flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Buscar
        </button>

        {hasFilters && (
          <button onClick={clear} className="btn-outline flex items-center gap-1.5">
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* Missing ciclos warning */}
      {missingCiclos.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-300">
              El profesor no tiene registros en {missingCiclos.length === 1 ? 'el semestre' : 'los semestres'}:
            </p>
            <ul className="mt-1.5 space-y-0.5 text-amber-400/80">
              {missingCiclos.map(c => <li key={c}>· {c}</li>)}
            </ul>
            <p className="mt-2 text-amber-300/60 text-xs">Ajusta los semestres seleccionados y vuelve a buscar.</p>
          </div>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-gold-500" />
          <span className="text-sm">Buscando registros...</span>
        </div>
      )}

      {!loading && searched && results.length === 0 && missingCiclos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-600">
          <Search className="w-8 h-8 opacity-30" />
          <p className="text-sm">Sin resultados. Intenta con otro nombre o periodo.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <CertificateTable
          data={results}
          profesorFilter={profesor}
          ciclosFilter={selectedCiclos}
        />
      )}

      {!searched && !loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-700 select-none">
          <Search className="w-10 h-10 opacity-20" />
          <p className="text-sm opacity-50">Selecciona un semestre e ingresa un nombre para buscar</p>
        </div>
      )}
    </div>
  )
}
