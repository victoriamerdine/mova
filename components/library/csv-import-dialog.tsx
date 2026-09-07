'use client'

import { useMemo, useState, useTransition } from 'react'
import { Lock, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { applyCsvImport, type CsvImportItem, type CsvImportSummary } from '@/app/biblioteca/actions'
import { matchCatalogId, rowsFromCsv, type CsvRow } from '@/lib/csv-import'
import {
  DUPLICATE_SIMILARITY_THRESHOLD,
  nameSimilarity,
  normalizeExerciseName,
  type ExerciseFormInput,
  type LibraryItem,
} from '@/lib/library'
import type { LibraryCatalog } from '@/lib/supabase/queries/exercises'

const TEMPLATE = 'nombre,patron,musculo,dificultad,video,descripcion\nSentadilla goblet,Dom. Rodilla,Cuádriceps,intermedio,https://youtube.com/shorts/xxxx,'

type RowDecision = { action: 'create' | 'replace' | 'skip'; targetId: string | null }

function findDuplicates(name: string, exercises: LibraryItem[]): LibraryItem[] {
  const norm = normalizeExerciseName(name)
  if (!norm) return []
  return exercises
    .map((ex) => ({ ex, sim: nameSimilarity(name, ex.name) }))
    .filter(
      ({ ex, sim }) =>
        normalizeExerciseName(ex.name) === norm || sim >= DUPLICATE_SIMILARITY_THRESHOLD,
    )
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 5)
    .map(({ ex }) => ex)
}

export function CsvImportDialog({
  catalog,
  exercises,
  onClose,
  onDone,
}: {
  catalog: LibraryCatalog
  exercises: LibraryItem[]
  onClose: () => void
  onDone: (summary: CsvImportSummary) => void
}) {
  const [text, setText] = useState('')
  const [defaultOwned, setDefaultOwned] = useState(true)
  const [rows, setRows] = useState<CsvRow[] | null>(null)
  const [decisions, setDecisions] = useState<RowDecision[]>([])
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const dupesByRow = useMemo(
    () => (rows ? rows.map((r) => (r.error ? [] : findDuplicates(r.name, exercises))) : []),
    [rows, exercises],
  )

  function analyze(source = text) {
    const parsed = rowsFromCsv(source)
    if (parsed.length === 0) {
      setError('No se reconoció ninguna fila. Necesita un encabezado y al menos una fila.')
      return
    }
    setError(null)
    setRows(parsed)
    setDecisions(
      parsed.map((r) => {
        if (r.error) return { action: 'skip', targetId: null }
        const dups = findDuplicates(r.name, exercises)
        return dups.length > 0
          ? { action: 'replace', targetId: dups[0].id }
          : { action: 'create', targetId: null }
      }),
    )
  }

  function onFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result ?? '')
      setText(content)
      analyze(content)
    }
    reader.readAsText(file)
  }

  function toInput(row: CsvRow): ExerciseFormInput {
    return {
      name: row.name,
      patternId: row.pattern ? matchCatalogId(row.pattern, catalog.patterns) : null,
      muscleId: row.muscle ? matchCatalogId(row.muscle, catalog.muscles) : null,
      difficulty: row.difficulty,
      description: row.description,
      instructions: row.instructions,
      videoUrl: row.videoUrl,
      owned: row.owned ?? defaultOwned,
    }
  }

  function run() {
    if (!rows) return
    setError(null)
    const items: CsvImportItem[] = rows.map((row, i) => {
      const d = decisions[i]
      return {
        input: toInput(row),
        action: row.error ? 'skip' : d.action,
        targetId: d.action === 'replace' ? (d.targetId ?? undefined) : undefined,
      }
    })
    startTransition(async () => {
      const summary = await applyCsvImport(items)
      onDone(summary)
    })
  }

  const stats = useMemo(() => {
    let create = 0
    let replace = 0
    let review = 0
    let skip = 0
    decisions.forEach((d, i) => {
      if (rows?.[i]?.error || d.action === 'skip') return skip++
      if (d.action === 'create') return create++
      const target = exercises.find((e) => e.id === d.targetId)
      if (target && target.ownerId && !target.isMine) review++
      else replace++
    })
    return { create, replace, review, skip }
  }, [decisions, rows, exercises])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Importar ejercicios desde CSV"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Importar ejercicios desde CSV</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-md"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!rows ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">
                Pegá el CSV (o subí un archivo). Encabezados reconocidos:{' '}
                <code>nombre</code>, <code>patron</code>, <code>musculo</code>,{' '}
                <code>dificultad</code>, <code>video</code>, <code>descripcion</code>,{' '}
                <code>instrucciones</code>, <code>propiedad</code> (mio/publico). Delimitador{' '}
                <code>,</code> o <code>;</code>.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder={TEMPLATE}
                className="border-input w-full rounded-lg border bg-transparent p-2 font-mono text-xs outline-none dark:bg-input/30"
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs">
                  <input
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                    className="text-xs"
                  />
                </label>
                <div className="ml-auto flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">Los nuevos:</span>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      checked={defaultOwned}
                      onChange={() => setDefaultOwned(true)}
                    />
                    mi nombre
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      checked={!defaultOwned}
                      onChange={() => setDefaultOwned(false)}
                    />
                    público
                  </label>
                </div>
              </div>
              {error ? <p className="text-destructive text-xs">{error}</p> : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>{stats.create} nuevos</span>
                <span>{stats.replace} reemplazan</span>
                {stats.review > 0 ? (
                  <span className="text-warning-foreground font-medium">
                    {stats.review} van a revisión del dueño
                  </span>
                ) : null}
                <span>{stats.skip} se omiten</span>
              </div>

              <ul className="divide-border divide-y rounded-lg border border-border">
                {rows.map((row, i) => {
                  const dups = dupesByRow[i]
                  const d = decisions[i]
                  const target = exercises.find((e) => e.id === d.targetId)
                  const goesToReview =
                    d.action === 'replace' && !!target && !!target.ownerId && !target.isMine
                  return (
                    <li key={i} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {row.name || <span className="text-destructive">— fila {row.line} —</span>}
                        </p>
                        <p className="text-muted-foreground truncate">
                          {row.error
                            ? row.error
                            : dups.length > 0
                              ? `ya existe: ${dups.map((x) => x.name).join(', ')}`
                              : 'nuevo'}
                        </p>
                      </div>

                      {goesToReview ? (
                        <span className="bg-warning/15 text-warning-foreground flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                          <Lock className="size-3" />a revisión
                        </span>
                      ) : null}

                      {row.error ? (
                        <span className="text-muted-foreground">se omite</span>
                      ) : dups.length > 0 ? (
                        <select
                          value={d.action === 'replace' ? `r:${d.targetId}` : d.action}
                          onChange={(e) => {
                            const v = e.target.value
                            setDecisions((prev) => {
                              const next = [...prev]
                              if (v === 'create') next[i] = { action: 'create', targetId: null }
                              else if (v === 'skip') next[i] = { action: 'skip', targetId: null }
                              else next[i] = { action: 'replace', targetId: v.slice(2) }
                              return next
                            })
                          }}
                          className="border-input h-7 rounded-md border bg-transparent px-1.5 text-xs outline-none dark:bg-input/30"
                        >
                          {dups.map((x) => (
                            <option key={x.id} value={`r:${x.id}`}>
                              Reemplazar «{x.name.slice(0, 28)}»
                            </option>
                          ))}
                          <option value="create">Crear nuevo</option>
                          <option value="skip">Omitir</option>
                        </select>
                      ) : (
                        <select
                          value={d.action}
                          onChange={(e) =>
                            setDecisions((prev) => {
                              const next = [...prev]
                              next[i] = {
                                action: e.target.value as RowDecision['action'],
                                targetId: null,
                              }
                              return next
                            })
                          }
                          className="border-input h-7 rounded-md border bg-transparent px-1.5 text-xs outline-none dark:bg-input/30"
                        >
                          <option value="create">Crear</option>
                          <option value="skip">Omitir</option>
                        </select>
                      )}
                    </li>
                  )
                })}
              </ul>
              {error ? <p className="text-destructive text-xs">{error}</p> : null}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          {rows ? (
            <Button variant="ghost" size="sm" onClick={() => setRows(null)} disabled={pending}>
              ← Volver
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          {!rows ? (
            <Button size="sm" onClick={() => analyze()} disabled={!text.trim()}>
              Analizar
            </Button>
          ) : (
            <Button size="sm" onClick={run} disabled={pending}>
              {pending ? 'Importando…' : 'Importar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
