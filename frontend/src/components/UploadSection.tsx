import { useState, useRef, useEffect } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
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
      addToast({ type: 'error', title: 'Formato inválido', message: 'Solo se aceptan archivos .xlsx o .xls' })
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
      // Step 1: start upload — server returns immediately with job_id
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

      // Step 2: poll for job completion (ETL runs in background)
      const jobId = data.job_id
      if (jobId) {
        await new Promise<void>((resolve, reject) => {
          let notFoundStreak = 0
          const interval = setInterval(async () => {
            try {
              const statusRes = await fetch(`/api/upload-status/${jobId}`)
              if (statusRes.status === 404) {
                notFoundStreak++
                // Server restarted (OOM) — job lost after 3 consecutive 404s
                if (notFoundStreak >= 3) {
                  clearInterval(interval)
                  reject(new Error('El servidor reinició durante el procesamiento (memoria insuficiente). Intenta de nuevo; si persiste, contacta al administrador.'))
                }
                return
              }
              notFoundStreak = 0
              const status = await statusRes.json()
              if (status.status === 'done') {
                clearInterval(interval)
                setResult(status.result)
                setState('success')
                addToast({
                  type: 'success',
                  title: `${status.result?.new_records ?? 0} registros nuevos cargados`,
                  message: status.result?.new_ciclos?.length
                    ? `Periodos: ${status.result.new_ciclos.join(', ')}`
                    : 'No había periodos nuevos',
                })
                onSuccess()
                resolve()
              } else if (status.status === 'conflict') {
                clearInterval(interval)
                setConflictCiclos(status.conflicting_ciclos ?? [])
                setState('error')
                setErrorMsg(status.error ?? 'Periodos duplicados detectados.')
                resolve()
              } else if (status.status === 'error') {
                clearInterval(interval)
                reject(new Error(status.error || 'Error en el servidor'))
              }
            } catch (e) {
              clearInterval(interval)
              reject(e)
            }
          }, 2000)
        })
      } else {
        // Legacy sync response (fallback)
        setResult(data)
        setState('success')
        onSuccess()
      }
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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white tracking-tight">Cargar Nuevo Semestre</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Sube el Excel consolidado de un nuevo periodo. Los periodos ya existentes no se duplican.
        </p>
      </div>

      {/* Loaded semesters panel */}
      <div className="rounded-xl border border-white/[0.12] overflow-hidden">
        <button
          onClick={() => setShowLoaded(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.05] hover:bg-white/[0.08] transition-colors text-sm"
        >
          <span className="flex items-center gap-2 text-zinc-200 font-medium">
            <Database className="w-4 h-4 text-zinc-300" />
            Semestres en la base de datos
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-semibold',
              loadedCiclos.length > 0 ? 'bg-white/15 text-white' : 'bg-white/8 text-zinc-400'
            )}>
              {loadedCiclos.length}
            </span>
          </span>
          <ChevronDown className={cn('w-4 h-4 text-zinc-400 transition-transform', showLoaded && 'rotate-180')} />
        </button>

        {showLoaded && (
          <div className="px-4 py-3 border-t border-white/[0.12] bg-white/[0.04] animate-fade-in space-y-3">
            {loadedCiclos.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">Sin datos aún. Sube el primer archivo.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {loadedCiclos.map(c => (
                    <span
                      key={c}
                      className={cn(
                        'flex items-center gap-1 text-xs border px-2 py-0.5 rounded-full transition-colors',
                        pendingDelete === c
                          ? 'bg-red-500/15 text-red-200 border-red-500/40'
                          : 'bg-white/8 text-zinc-200 border-white/15'
                      )}
                    >
                      {c}
                      <button
                        onClick={() => setPendingDelete(pendingDelete === c ? null : c)}
                        className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                        title="Eliminar este periodo"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>

                {pendingDelete && (
                  <div className="flex items-center gap-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2.5 animate-fade-in">
                    <AlertTriangle className="w-4 h-4 text-red-200 shrink-0" />
                    <p className="text-xs text-red-200 flex-1">
                      ¿Eliminar <strong>{pendingDelete}</strong> y todos sus registros?
                    </p>
                    <button
                      onClick={() => deleteCiclo(pendingDelete)}
                      disabled={deletingCiclo}
                      className="flex items-center gap-1 text-xs font-semibold text-red-200 border border-red-400/30 rounded px-2 py-1 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                    >
                      {deletingCiclo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Eliminar
                    </button>
                    <button
                      onClick={() => setPendingDelete(null)}
                      disabled={deletingCiclo}
                      className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
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
                className="flex items-center gap-1.5 text-xs text-red-300/70 hover:text-red-200 transition-colors mt-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar base de datos
              </button>
            )}

            {confirmReset && (
              <div className="flex items-center gap-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2.5 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-red-200 shrink-0" />
                <p className="text-xs text-red-200 flex-1">
                  Se eliminarán <strong>todos los datos</strong>. ¿Confirmas?
                </p>
                <button
                  onClick={resetDb}
                  disabled={resetting}
                  className="flex items-center gap-1 text-xs font-semibold text-red-200 border border-red-400/30 rounded px-2 py-1 hover:bg-red-500/15 transition-colors disabled:opacity-50"
                >
                  {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Eliminar
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  disabled={resetting}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
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
            ? 'border-white/40 bg-white/[0.04] scale-[1.01]'
            : file
            ? 'border-white/15 bg-white/[0.02] cursor-default'
            : 'border-white/15 hover:border-white/35 hover:bg-white/[0.04] bg-transparent',
        )}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={onSelect} />

        {!file ? (
          <>
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300',
              isDragging ? 'bg-white/10' : 'bg-white/5',
            )}>
              <UploadCloud className={cn('w-8 h-8 transition-colors duration-300', isDragging ? 'text-white' : 'text-zinc-400')} />
            </div>
            <p className="text-base font-medium text-zinc-100">
              {isDragging ? 'Suelta el archivo aquí' : 'Arrastra el Excel aquí'}
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              o <span className="text-white font-medium">selecciona el archivo</span>
            </p>
            <p className="text-xs text-zinc-500 mt-3">Acepta .xlsx · .xls</p>
          </>
        ) : (
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-3 bg-white/[0.06] rounded-xl p-4 border border-white/[0.12]">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-zinc-200" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-zinc-100 truncate">{file.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{formatSize(file.size)}</p>
              </div>
              {state === 'idle' && (
                <button onClick={(e) => { e.stopPropagation(); reset() }} className="text-zinc-400 hover:text-red-300 transition-colors p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
              {state === 'success' && <CheckCircle className="w-5 h-5 text-white flex-shrink-0" />}
              {state === 'error' && <XCircle className="w-5 h-5 text-red-300 flex-shrink-0" />}
              {state === 'uploading' && <Loader2 className="w-5 h-5 text-zinc-300 animate-spin flex-shrink-0" />}
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
            className="btn-primary flex items-center gap-2"
          >
            {state === 'uploading' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</>
            ) : (
              <><UploadCloud className="w-4 h-4" /> Procesar y Cargar</>
            )}
          </button>
          {state !== 'uploading' && (
            <button onClick={reset} className="btn-outline">Cancelar</button>
          )}
          {state === 'uploading' && (
            <p className="text-xs text-zinc-400 animate-pulse">Esto puede tardar unos segundos…</p>
          )}
        </div>
      )}

      {/* Duplicate conflict error */}
      {state === 'error' && conflictCiclos.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-white/[0.14] bg-white/[0.05] px-4 py-3 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-zinc-200 mt-0.5 shrink-0" />
          <div className="text-sm text-zinc-200">
            <p className="font-medium text-white">{errorMsg}</p>
            <p className="text-zinc-400 text-xs mt-1 mb-2">
              {conflictCiclos.length === 1 ? 'El siguiente periodo ya existe:' : 'Los siguientes periodos ya existen:'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {conflictCiclos.map(c => (
                <span key={c} className="text-xs bg-white/8 text-zinc-200 border border-white/15 px-2 py-0.5 rounded-full">
                  {c}
                </span>
              ))}
            </div>
            <p className="mt-2.5 text-zinc-400 text-xs">
              Si deseas reemplazar estos datos, contacta al administrador para limpiar la base primero.
            </p>
            <button onClick={reset} className="mt-3 btn-outline text-xs">Seleccionar otro archivo</button>
          </div>
        </div>
      )}

      {/* Generic error */}
      {state === 'error' && conflictCiclos.length === 0 && errorMsg && (
        <div className="flex items-start gap-2 text-sm text-red-300 bg-red-500/5 border border-red-500/10 rounded-lg p-3">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success summary */}
      {state === 'success' && result && (
        <div className="bg-white/[0.05] border border-white/[0.12] rounded-xl p-5 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <CheckCircle className="w-4 h-4" />
            Carga completada
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.10]">
              <p className="text-2xl font-bold text-white tabular-nums">{result.new_records}</p>
              <p className="text-xs text-zinc-400 mt-1">Nuevos registros</p>
            </div>
            <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.10]">
              <p className="text-2xl font-bold text-white tabular-nums">{result.new_ciclos.length}</p>
              <p className="text-xs text-zinc-400 mt-1">Periodos nuevos</p>
            </div>
          </div>
          {result.new_ciclos.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 mb-1.5">Periodos agregados:</p>
              <div className="flex flex-wrap gap-1.5">
                {result.new_ciclos.map((c) => (
                  <span key={c} className="text-xs bg-white/8 text-zinc-100 border border-white/15 px-2 py-0.5 rounded-full">
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
