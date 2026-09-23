'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, GripVertical, Layers, Pause, Play, RotateCcw, Search, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Demo animada para la guía de profesores: arma una sesión arrastrando
 * ejercicios desde el panel de la biblioteca hasta el día del plan.
 *
 * NO es una captura real de la app — es una maqueta con los mismos
 * componentes visuales del editor (`ExerciseLibraryPanel` + `DayEditor`),
 * con nombres de ejercicios de ejemplo. Así no hace falta sesión, no se
 * expone ningún alumno real y no pesa como un archivo de video.
 *
 * Todo el cuadro se calcula como función pura del tiempo `t` (segundos):
 * pausar, saltar a un paso o repetir es solo cambiar `t`.
 */

const DURATION = 18
const STAGE_W = 760
const STAGE_H = 470

const STEPS = [
  {
    start: 0,
    title: 'Abrí el día que vas a armar',
    body: 'Dentro del plan elegís la semana y el día. Al costado siempre tenés la biblioteca a mano.',
  },
  {
    start: 1.7,
    title: 'Buscá en la biblioteca',
    body: 'Más de 1.360 ejercicios con video. Escribí el nombre y se filtra al instante.',
  },
  {
    start: 3.5,
    title: 'Arrastrá cada ejercicio hasta el día',
    body: 'Agarralo del panel de la derecha y soltalo en el bloque. También podés tocar ＋ para sumarlo.',
  },
  {
    start: 9.3,
    title: 'Completá series, reps, carga y pausa',
    body: 'Cada ejercicio trae su video y sus campos de prescripción. Vos decidís los números.',
  },
  {
    start: 13.5,
    title: 'Guardá y listo',
    body: 'Se guarda toda la semana junta. El alumno lo ve en su celular.',
  },
] as const

const LIBRARY = [
  'Sentadilla libre',
  'Peso muerto rumano',
  'Press de banca',
  'Remo con barra',
  'Dominadas',
  'Hip thrust',
  'Plancha frontal',
]
const LIBRARY_FILTERED = ['Sentadilla libre', 'Sentadilla búlgara', 'Sentadilla frontal']
const QUERY = 'sent'
const QUERY_START = 2.0
const QUERY_CLEAR = 5.0

const FIELD_LABELS = ['Series', 'Reps', 'Carga', 'Intens.', 'Pausa']

// Cada ejercicio: cuándo se agarra, cuándo se suelta, qué fila de la biblioteca
// era, y cuándo aparece cada valor de la prescripción.
const ROWS = [
  {
    name: 'Sentadilla libre',
    libIndex: 0,
    grab: 3.7,
    drop: 4.9,
    values: ['4', '6', '70 kg', 'RPE 8', '2 min'],
    reveal: [9.75, 10.1, 10.45, 10.8, 11.15],
  },
  {
    name: 'Peso muerto rumano',
    libIndex: 1,
    grab: 5.8,
    drop: 7.0,
    values: ['3', '8', '60 kg', 'RPE 7', '90 s'],
    reveal: [11.75, 11.9, 12.05, 12.2, 12.35],
  },
  {
    name: 'Press de banca',
    libIndex: 2,
    grab: 7.4,
    drop: 8.6,
    values: ['3', '10', '45 kg', 'RPE 7', '90 s'],
    reveal: [12.65, 12.8, 12.95, 13.1, 13.25],
  },
] as const

const ROW_TOP0 = 168
const ROW_PITCH = 80
const ROW_H = 74
const LIB_TOP0 = 136
const LIB_PITCH = 42

const SAVE_PRESS: readonly [number, number] = [14.35, 14.55]
const SAVING: readonly [number, number] = [14.5, 15.1]
const TOAST: readonly [number, number] = [15.1, 17.4]

// Trayecto del cursor: [tiempo, x, y] en coordenadas del cuadro.
const CURSOR: readonly (readonly [number, number, number])[] = [
  [0, 400, 440],
  [1.3, 400, 440],
  [1.95, 640, 110],
  [3.0, 640, 110],
  [3.65, 626, 155],
  [3.7, 626, 155],
  [4.5, 330, 225],
  [4.9, 330, 225],
  [5.5, 626, 197],
  [5.8, 626, 197],
  [6.6, 330, 300],
  [7.0, 330, 300],
  [7.3, 626, 239],
  [7.4, 626, 239],
  [8.2, 330, 350],
  [8.6, 330, 350],
  [9.5, 84, 228],
  [10.05, 178, 228],
  [10.4, 272, 228],
  [10.75, 366, 228],
  [11.1, 460, 228],
  [11.7, 84, 308],
  [12.3, 460, 308],
  [12.6, 84, 388],
  [13.2, 460, 388],
  [14.2, 110, 443],
  [15.2, 110, 443],
  [16.0, 400, 440],
  [18, 400, 440],
]

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
const within = (t: number, [a, b]: readonly [number, number]) => t >= a && t < b

function cursorAt(t: number) {
  if (t <= CURSOR[0][0]) return { x: CURSOR[0][1], y: CURSOR[0][2] }
  for (let i = 1; i < CURSOR.length; i++) {
    const [t1, x1, y1] = CURSOR[i]
    if (t <= t1) {
      const [t0, x0, y0] = CURSOR[i - 1]
      const p = t1 === t0 ? 1 : ease((t - t0) / (t1 - t0))
      return { x: x0 + (x1 - x0) * p, y: y0 + (y1 - y0) * p }
    }
  }
  const last = CURSOR[CURSOR.length - 1]
  return { x: last[1], y: last[2] }
}

function stepIndexAt(t: number) {
  let idx = 0
  STEPS.forEach((s, i) => {
    if (t >= s.start) idx = i
  })
  return idx
}

function Thumb({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-muted relative flex shrink-0 items-center justify-center overflow-hidden rounded',
        className,
      )}
    >
      <Play className="size-2.5 fill-white text-white drop-shadow" />
      <div className="absolute inset-0 bg-zinc-500/25" />
    </div>
  )
}

function Stage({ t }: { t: number }) {
  const cursor = cursorAt(t)

  const draggingIdx = ROWS.findIndex((r) => t >= r.grab && t < r.drop)
  const dragging = draggingIdx >= 0 ? ROWS[draggingIdx] : null
  const hoverIdx = ROWS.findIndex((r) => t >= r.drop - 0.5 && t < r.drop)

  const typedCount =
    t >= QUERY_START && t < QUERY_CLEAR
      ? Math.min(QUERY.length, Math.floor((t - QUERY_START) / 0.2) + 1)
      : 0
  const typed = QUERY.slice(0, typedCount)
  const library = typed.length >= 2 ? LIBRARY_FILTERED : LIBRARY

  const pressed =
    within(t, [3.7, 4.9]) ||
    within(t, [5.8, 7.0]) ||
    within(t, [7.4, 8.6]) ||
    within(t, SAVE_PRESS)
  const saving = within(t, SAVING)
  const toast = within(t, TOAST)
  const dropped = ROWS.filter((r) => t >= r.drop).length

  return (
    <div
      className="bg-background text-foreground relative overflow-hidden"
      style={{ width: STAGE_W, height: STAGE_H }}
    >
      {/* Barra de ventana */}
      <div className="border-border bg-muted/60 absolute inset-x-0 top-0 flex h-8 items-center gap-1.5 border-b px-3">
        <span className="size-2.5 rounded-full bg-red-400/70" />
        <span className="size-2.5 rounded-full bg-amber-400/70" />
        <span className="size-2.5 rounded-full bg-emerald-400/70" />
        <div className="bg-background text-muted-foreground mx-auto flex h-5 w-72 items-center justify-center rounded-md text-[10px]">
          mova · Planes · Fuerza general
        </div>
      </div>

      {/* Semana + días */}
      <div className="absolute flex items-center gap-2" style={{ left: 26, top: 48 }}>
        <span className="text-muted-foreground text-[11px] font-medium">Semana</span>
        <div className="border-input flex h-7 w-24 items-center rounded-lg border px-2.5 text-xs">
          Semana 1
        </div>
      </div>
      <div className="absolute flex gap-2" style={{ left: 26, top: 84 }}>
        {['Día 1 · Fuerza A', 'Día 2', 'Día 3'].map((d, i) => (
          <div
            key={d}
            className={cn(
              'flex h-7 items-center rounded-md border px-3 text-xs',
              i === 0
                ? 'border-primary bg-primary/10 text-primary font-semibold'
                : 'border-border text-muted-foreground',
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Día (bloque) */}
      <div
        className={cn(
          'bg-card absolute rounded-xl border transition-colors',
          hoverIdx >= 0 ? 'border-primary bg-primary/5' : 'border-border',
        )}
        style={{ left: 16, top: 124, width: 504, height: 290 }}
      >
        <div className="absolute flex items-center gap-2" style={{ left: 10, top: 8 }}>
          <span className="bg-primary/10 text-primary inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-medium">
            <Layers className="size-3" />
            Bloque individual
          </span>
        </div>
      </div>

      {/* Estado vacío */}
      {dropped === 0 ? (
        <div
          className="border-border text-muted-foreground absolute flex items-center justify-center rounded-lg border border-dashed text-xs"
          style={{ left: 26, top: 168, width: 484, height: 74 }}
        >
          Arrastrá un ejercicio desde la biblioteca
        </div>
      ) : null}

      {/* Marca de dónde va a caer */}
      {hoverIdx >= 0 ? (
        <div
          className="bg-primary absolute rounded-full"
          style={{
            left: 26,
            width: 484,
            height: 3,
            top: ROW_TOP0 + ROW_PITCH * hoverIdx - 5,
          }}
        />
      ) : null}

      {/* Ejercicios ya soltados */}
      {ROWS.map((r, k) => {
        if (t < r.drop) return null
        const a = clamp01((t - r.drop) / 0.35)
        const top = ROW_TOP0 + ROW_PITCH * k
        return (
          <div
            key={r.name}
            className="border-border bg-secondary/30 absolute rounded-lg border"
            style={{
              left: 26,
              top,
              width: 484,
              height: ROW_H,
              opacity: a,
              transform: `translateY(${(1 - a) * -10}px)`,
            }}
          >
            <GripVertical className="text-muted-foreground/50 absolute size-4" style={{ left: 6, top: 7 }} />
            <div className="absolute" style={{ left: 28, top: 5 }}>
              <Thumb className="h-6 w-9" />
            </div>
            <span className="absolute text-[13px] font-medium" style={{ left: 74, top: 7 }}>
              {r.name}
            </span>
            <Trash2 className="text-muted-foreground absolute size-3.5" style={{ right: 10, top: 9 }} />
            {FIELD_LABELS.map((label, i) => {
              const shown = t >= r.reveal[i]
              const active = t >= r.reveal[i] - 0.1 && t < r.reveal[i] + 0.35
              return (
                <div key={label} className="absolute" style={{ left: 14 + i * 94, top: 36, width: 86 }}>
                  <p className="text-muted-foreground text-[9px] leading-3 uppercase">{label}</p>
                  <div
                    className={cn(
                      'mt-0.5 flex h-[22px] items-center rounded-md border px-2 text-xs',
                      active ? 'border-primary ring-primary/30 ring-2' : 'border-input',
                    )}
                  >
                    {shown ? r.values[i] : <span className="text-muted-foreground/40">—</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Guardar plan */}
      <div
        className={cn(
          'bg-primary text-primary-foreground absolute flex h-[30px] items-center justify-center rounded-lg text-xs font-medium transition-transform',
          within(t, SAVE_PRESS) && 'scale-95',
        )}
        style={{ left: 16, top: 428, width: 188 }}
      >
        {saving ? 'Guardando…' : 'Guardar plan'}
      </div>
      {toast ? (
        <div
          className="bg-card border-border absolute flex h-[30px] items-center gap-1.5 rounded-lg border px-3 text-xs shadow-sm"
          style={{
            left: 216,
            top: 428,
            opacity: clamp01((t - TOAST[0]) / 0.25) * clamp01((TOAST[1] - t) / 0.3),
          }}
        >
          <Check className="text-primary size-3.5" />
          Plan guardado
        </div>
      ) : null}

      {/* Biblioteca */}
      <div
        className="border-border bg-card absolute rounded-xl border"
        style={{ left: 544, top: 44, width: 200, height: 410 }}
      >
        <div className="px-3 pt-2.5">
          <p className="text-[13px] font-medium">Biblioteca</p>
          <p className="text-muted-foreground text-[10px]">Arrastrá al día o tocá ＋</p>
        </div>
        <div
          className="border-input absolute flex h-7 items-center gap-1.5 rounded-lg border px-2"
          style={{ left: 12, top: 52, width: 176 }}
        >
          <Search className="text-muted-foreground size-3 shrink-0" />
          <span className="text-xs">
            {typed || <span className="text-muted-foreground/70">Buscar ejercicio…</span>}
          </span>
        </div>
      </div>
      {library.map((name, i) => {
        const beingDragged = dragging && dragging.name === name
        return (
          <div
            key={name}
            className={cn(
              'border-border bg-secondary/40 absolute flex items-center gap-1.5 rounded-lg border px-1.5',
              beingDragged && 'opacity-40',
            )}
            style={{ left: 554, top: LIB_TOP0 + LIB_PITCH * i, width: 180, height: 38 }}
          >
            <GripVertical className="text-muted-foreground/40 size-3 shrink-0" />
            <Thumb className="h-[26px] w-9" />
            <span className="min-w-0 flex-1 truncate text-[11px]">{name}</span>
          </div>
        )
      })}

      {/* Ejercicio "en el aire" mientras se arrastra */}
      {dragging ? (
        <div
          className="border-primary/50 bg-card absolute flex h-9 w-[168px] items-center gap-1.5 rounded-lg border px-2 shadow-xl"
          style={{
            left: cursor.x - 22,
            top: cursor.y - 14,
            transform: 'rotate(-2deg)',
          }}
        >
          <GripVertical className="text-muted-foreground/60 size-3 shrink-0" />
          <Thumb className="h-[26px] w-9" />
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{dragging.name}</span>
        </div>
      ) : null}

      {/* Cursor */}
      <svg
        aria-hidden
        width="22"
        height="22"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute drop-shadow-md"
        style={{
          left: cursor.x,
          top: cursor.y,
          transform: `scale(${pressed ? 0.88 : 1})`,
          transformOrigin: '2px 2px',
        }}
      >
        <path
          d="M3 2l7.6 18.6 2.6-7.4 7.4-2.6L3 2z"
          fill="white"
          stroke="#18181b"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export function DragDemo({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [t, setT] = useState(0)
  const [scale, setScale] = useState(1)
  const [paused, setPaused] = useState(false)
  const [inView, setInView] = useState(false)

  // Escala el cuadro fijo al ancho disponible.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / STAGE_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Solo corre mientras se ve en pantalla.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.3,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Quien prefiere menos movimiento ve el resultado final, sin animación.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPaused(true)
      setT(16)
    }
  }, [])

  const playing = inView && !paused
  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    let id = requestAnimationFrame(function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      setT((prev) => {
        const next = prev + dt
        return next >= DURATION ? next - DURATION : next
      })
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [playing])

  const stepIdx = stepIndexAt(t)
  const step = STEPS[stepIdx]

  return (
    <div ref={rootRef} className={className}>
      <div
        ref={boxRef}
        role="img"
        aria-label="Demostración animada: el profesor busca ejercicios en la biblioteca, los arrastra al día del plan, completa series, repeticiones y carga, y guarda el plan."
        className="border-border bg-card relative w-full overflow-hidden rounded-2xl border shadow-sm"
        style={{ height: STAGE_H * scale }}
      >
        <div
          aria-hidden
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <Stage t={t} />
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="bg-muted mt-3 h-1 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full"
          style={{ width: `${(t / DURATION) * 100}%` }}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="min-h-[4.5rem]" aria-live="off">
          <p className="text-primary font-mono text-xs">
            Paso {stepIdx + 1} de {STEPS.length}
          </p>
          <p className="mt-1 text-lg font-semibold text-balance">{step.title}</p>
          <p className="text-muted-foreground mt-1 max-w-prose text-sm text-pretty">{step.body}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="border-border hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {playing ? 'Pausar' : 'Reproducir'}
          </button>
          <button
            type="button"
            onClick={() => setT(0)}
            aria-label="Ver desde el principio"
            className="border-border hover:bg-muted inline-flex size-9 items-center justify-center rounded-lg border"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>

      <ol className="mt-4 flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => setT(s.start + 0.01)}
              aria-current={i === stepIdx ? 'step' : undefined}
              className={cn(
                'inline-flex h-7 items-center rounded-full border px-3 text-xs transition-colors',
                i === stepIdx
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {i + 1} · {s.title}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
