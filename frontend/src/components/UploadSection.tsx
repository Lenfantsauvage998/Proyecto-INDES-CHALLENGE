import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react'
import { UploadCloud, FileSpreadsheet, CheckCircle, XCircle, Loader2, X, Database, AlertTriangle, ChevronDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToastData } from './Toast'

interface UploadResult {
  new_ciclos: string[]
  new_records: number
  skipped_ciclos: string[]
}

interface Props {
  onSuccess: () => void
  addToast: (t: Omit<ToastData, 'id'>) => void
  refreshKey: number
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export function UploadSection({ onSuccess, addToast, refreshKey }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [conflictCiclos, setConflictCiclos] = useState<string[]>([])
  const [loadedCiclos, setLoadedCiclos] = useState<string[]>([])
  const [showLoaded, setShowLoaded] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [deletingCiclo, setDeletingCiclo] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/ciclos')
      .then(r => r.json())
      .then(d => setLoadedCiclos(d.ciclos ?? []))
      .catch(() => setLoadedCiclos([]))
  }, [refreshKey, result])

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      addToast({ type: 'error', title: 'Formato invalido', message: 'Solo se aceptan archivos .xlsx o .xls' })
      return
    }
    setFile(f)
    setState('idle')
    setResult(null)
    setErrorMsg('')
    setConflictCiclos([])
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }

  const onSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
  }

  const upload = async () => {
    if (!file) return
    setState('uploading')
    setErrorMsg('')
    setConflictCiclos([])
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409 && data.detail?.conflicting_ciclos) {
          setConflictCiclos(data.detail.conflicting_ciclos)
          setState('error')
          setErrorMsg(data.detail.message ?? 'Periodos duplicados detectados.')
          return
        }
        throw new Error(data.detail || 'Error en el servidor')
      }
      setResult(data)
      setState('success')
      addToast({
        type: 'success',
        title: `${data.new_records} registros nuevos cargados`,
        message: data.new_ciclos.length ? `Periodos: ${data.new_ciclos.join(', ')}` : 'No habia periodos nuevos',
      })
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setState('error')
      setErrorMsg(msg)
      addToast({ type: 'error', title: 'Error al cargar', message: msg })
    }
  }

  const reset = () => {
    setFile(null)
    setState('idle')
    setResult(null)
    setErrorMsg('')
    setConflictCiclos([])
    if (inputRef.current) inputRef.current.value = ''
  }

  const deleteCiclo = async (ciclo: string) => {
    setDeletingCiclo(true)
    try {
      const res = await fetch(`/api/ciclos/${encodeURIComponent(ciclo)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Error al eliminar')
      setLoadedCiclos(prev => prev.filter(c => c !== ciclo))
      setPendingDelete(null)
      addToast({ type: 'success', title: `Periodo eliminado`, message: `${ciclo} ha sido removido.` })
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      addToast({ type: 'error', title: 'Error al eliminar', message: msg })
    } finally {
      setDeletingCiclo(false)
    }
  }

  const resetDb = async () => {
    setResetting(true)
    try {
      const res = await fetch('/api/db', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Error al eliminar')
      setLoadedCiclos([])
      reset()
      setConfirmReset(false)
      addToast({ type: 'success', title: 'Base de datos eliminada', message: 'Puedes cargar archivos desde cero.' })
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      addToast({ type: 'error', title: 'Error al eliminar', message: msg })
    } finally {
      setResetting(false)
    }
  }

  const formatSize = (b: number) => {
    if (b < 1024) return `${b} B`
    if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 ** 2).toFixed(1)} MB`
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Cargar Nuevo Semestre</h2>
        <p className="text-sm text-slate-500 mt-1">
          Sube el Excel consolidado de un nuevo periodo. Los periodos ya existentes no se duplican.
        </p>
      </div>

      {/* Loaded semesters panel */}
      <div className="rounded-xl border border-navy-600 overflow-hidden">
        <button
          onClick={() => setShowLoaded(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-navy-700/50 hover:bg-navy-700/80 transition-colors text-sm"
        >
          <span className="flex items-center gap-2 text-slate-300 font-medium">
            <Database className="w-4 h-4 text-gold-400" />
            Semestres en la base de datos
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-semibold',
              loadedCiclos.length > 0 ? 'bg-gold-500/20 text-gold-400' : 'bg-navy-600 text-slate-500'
            )}>
              {loadedCiclos.length}
            </span>
          </span>
          <ChevronDown className={cn('w-4 h-4 text-slate-500 transition-transform', showLoaded && 'rotate-180')} />
        </button>

        {showLoaded && (
          <div className="px-4 py-3 border-t border-navy-600 bg-navy-800/30 animate-fade-in space-y-3">
            {loadedCiclos.length === 0 ? (
              <p className="text-xs text-slate-600 italic">Sin datos aún. Sube el primer archivo.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {loadedCiclos.map(c => (
                    <span
                      key={c}
                      className={cn(
                        'flex items-center gap-1 text-xs border px-2 py-0.5 rounded-full transition-colors',
                        pendingDelete === c
                          ? 'bg-red-500/15 text-red-300 border-red-500/40'
                          : 'bg-gold-500/10 text-gold-400 border-gold-500/20'
                      )}
                    >
                      {c}
                      <button
                        onClick={() => setPendingDelete(pendingDelete === c ? null : c)}
                        className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                        title="Eliminar este periodo"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>

                {pendingDelete && (
                  <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/8 px-3 py-2.5 animate-fade-in">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-300 flex-1">
                      ¿Eliminar <strong>{pendingDelete}</strong> y todos sus registros?
                    </p>
                    <button
                      onClick={() => deleteCiclo(pendingDelete)}
                      disabled={deletingCiclo}
                      className="flex items-center gap-1 text-xs font-semibold text-red-400 border border-red-500/40 rounded px-2 py-1 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                    >
                      {deletingCiclo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Eliminar
                    </button>
                    <button
                      onClick={() => setPendingDelete(null)}
                      disabled={deletingCiclo}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </>
            )}

            {loadedCiclos.length > 0 && !confirmReset && (
              <button
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors mt-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar base de datos
              </button>
            )}

            {confirmReset && (
              <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/8 px-3 py-2.5 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-300 flex-1">
                  Se eliminarán <strong>todos los datos</strong>. ¿Confirmas?
                </p>
                <button
                  onClick={resetDb}
                  disabled={resetting}
                  className="flex items-center gap-1 text-xs font-semibold text-red-400 border border-red-500/40 rounded px-2 py-1 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                >
                  {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Eliminar
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  disabled={resetting}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer',
          'flex flex-col items-center justify-center text-center py-14 px-6',
          isDragging
            ? 'border-gold-500 bg-gold-500/5 scale-[1.01]'
            : file
            ? 'border-navy-500 bg-navy-700/30 cursor-default'
            : 'border-navy-500 hover:border-gold-500/50 hover:bg-navy-700/20 bg-navy-800/30',
        )}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={onSelect} />

        {!file ? (
          <>
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300',
              isDragging ? 'bg-gold-500/20' : 'bg-navy-700',
            )}>
              <UploadCloud className={cn('w-8 h-8 transition-colors duration-300', isDragging ? 'text-gold-400' : 'text-slate-400')} />
            </div>
            <p className="text-base font-medium text-slate-200">
              {isDragging ? 'Suelta el archivo aqui' : 'Arrastra el Excel aqui'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              o <span className="text-gold-400 font-medium">selecciona el archivo</span>
            </p>
            <p className="text-xs text-slate-600 mt-3">Acepta .xlsx · .xls</p>
          </>
        ) : (
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-3 bg-navy-700/60 rounded-xl p-4 border border-navy-500">
              <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-gold-400" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatSize(file.size)}</p>
              </div>
              {state === 'idle' && (
                <button onClick={(e) => { e.stopPropagation(); reset() }} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
              {state === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
              {state === 'error' && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
              {state === 'uploading' && <Loader2 className="w-5 h-5 text-gold-400 animate-spin flex-shrink-0" />}
            </div>
          </div>
        )}
      </div>

      {/* Action row */}
      {file && state !== 'success' && (
        <div className="flex gap-3 items-center">
          <button
            onClick={upload}
            disabled={state === 'uploading'}
            className="btn-gold flex items-center gap-2"
          >
            {state === 'uploading' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
            ) : (
              <><UploadCloud className="w-4 h-4" /> Procesar y Cargar</>
            )}
          </button>
          {state !== 'uploading' && (
            <button onClick={reset} className="btn-outline">Cancelar</button>
          )}
          {state === 'uploading' && (
            <p className="text-xs text-slate-500 animate-pulse">Esto puede tardar unos segundos…</p>
          )}
        </div>
      )}

      {/* Duplicate conflict error */}
      {state === 'error' && conflictCiclos.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-300">{errorMsg}</p>
            <p className="text-amber-400/70 text-xs mt-1 mb-2">
              {conflictCiclos.length === 1 ? 'El siguiente periodo ya existe:' : 'Los siguientes periodos ya existen:'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {conflictCiclos.map(c => (
                <span key={c} className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-2.5 text-amber-300/60 text-xs">
              Si deseas reemplazar estos datos, contacta al administrador para limpiar la base primero.
            </p>
            <button onClick={reset} className="mt-3 btn-outline text-xs">Seleccionar otro archivo</button>
          </div>
        </div>
      )}

      {/* Generic error */}
      {state === 'error' && conflictCiclos.length === 0 && errorMsg && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success summary */}
      {state === 'success' && result && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <CheckCircle className="w-4 h-4" />
            Carga completada
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-navy-800/60 rounded-lg p-3">
              <p className="text-2xl font-bold text-slate-100">{result.new_records}</p>
              <p className="text-xs text-slate-500 mt-1">Nuevos registros</p>
            </div>
            <div className="bg-navy-800/60 rounded-lg p-3">
              <p className="text-2xl font-bold text-slate-100">{result.new_ciclos.length}</p>
              <p className="text-xs text-slate-500 mt-1">Periodos nuevos</p>
            </div>
          </div>
          {result.new_ciclos.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Periodos agregados:</p>
              <div className="flex flex-wrap gap-1.5">
                {result.new_ciclos.map((c) => (
                  <span key={c} className="text-xs bg-gold-500/10 text-gold-400 border border-gold-500/20 px-2 py-0.5 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          <button onClick={reset} className="btn-outline text-xs">Cargar otro archivo</button>
        </div>
      )}
    </div>
  )
}
