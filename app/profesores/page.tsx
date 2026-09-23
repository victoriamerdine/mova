import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight,
  Library,
  LineChart,
  Bell,
  Sparkles,
  ShieldCheck,
  PlayCircle,
  Layers,
  MessageCircle,
  Copy,
  ClipboardList,
  CalendarDays,
} from 'lucide-react'

import { MovaLogo } from '@/components/brand/mova-logo'
import { DragDemo } from '@/components/guide/drag-demo'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'MOVA para profesores — Guía rápida',
  description:
    'Qué es MOVA y cómo armás un plan de entrenamiento en minutos: biblioteca de ejercicios, editor de planes, app del alumno, seguimiento y asistente de IA.',
}

const PIPELINE = ['Alumno', 'Plan', 'Semana', 'Sesión', 'Bloque', 'Ejercicio']

const FEATURES = [
  {
    icon: Library,
    title: 'Biblioteca de ejercicios',
    body: 'Más de 1.360 ejercicios con video, filtrados por músculo, patrón, capacidad, deporte y equipamiento. Y si te falta un patrón o músculo, lo agregás vos.',
    stat: '+1.360 ejercicios con video',
  },
  {
    icon: Layers,
    title: 'Editor de planes flexible',
    body: 'Músculo, Patrón, Mixto, Específico de deporte o Personalizado — en los tipos flexibles elegís patrón o músculo libremente, ejercicio por ejercicio.',
    stat: '5 tipos de plan',
  },
  {
    icon: Copy,
    title: 'Duplicar y reutilizar planes',
    body: 'Armá una plantilla una vez y reasignásela a otro alumno en un clic, sin tocar el avance del original.',
    stat: 'Un clic, otro alumno',
  },
  {
    icon: ClipboardList,
    title: 'Formularios de evaluación',
    body: 'Mandale una evaluación por link, sin que necesite cuenta. Aplicás sus respuestas al perfil del alumno cuando vos lo confirmás.',
    stat: '8 plantillas listas',
  },
  {
    icon: CalendarDays,
    title: 'Calendario y disponibilidad',
    body: 'Partidos, carreras, descansos y los días que el alumno prefiere entrenar, en un calendario compartido — incluso eventos que se repiten cada semana.',
    stat: 'Compartido con el alumno',
  },
  {
    icon: LineChart,
    title: 'Control de carga',
    body: 'Volumen por músculo y por patrón, comparado contra el objetivo de cada alumno, semana a semana.',
    stat: 'Volumen vs. objetivo',
  },
  {
    icon: PlayCircle,
    title: 'App del alumno',
    body: 'Mobile, sin vueltas: mira el video, registra series, carga y repeticiones, cuenta cómo le fue y sigue donde dejó el ciclo.',
    stat: 'Registro en 3 campos',
  },
  {
    icon: Bell,
    title: 'Seguimiento con avisos',
    body: 'Una campanita te avisa qué alumnos entrenaron o cambiaron su disponibilidad — sin tener que entrar a revisar uno por uno.',
    stat: 'Actividad · Vencimientos',
  },
  {
    icon: Sparkles,
    title: 'Asistente de IA',
    body: 'Buscá y recomendá ejercicios en lenguaje natural, analizá una semana o pedile un borrador de plan completo. Vos siempre aprobás antes de aplicar.',
    stat: 'Buscar · Recomendar · Analizar · Generar',
  },
]

const SPORTS = [
  'General',
  'Fútbol',
  'Running',
  'Pádel',
  'Karate',
  'Crossfit',
  'Ciclismo',
  'Natación',
  'Tenis',
  'Rugby',
  'Hockey',
  'Handball',
  'Yoga',
  'Pilates',
  'Gimnasia artística',
  'Gimnasia rítmica',
  'Taekwondo',
  'Básquet',
  'Vóley',
  'Triatlón',
]

const STEPS = [
  {
    n: '01',
    title: 'Cargá al alumno',
    body: 'Nombre, deporte, objetivo, nivel y disponibilidad. Un minuto.',
  },
  {
    n: '02',
    title: 'Armá la semana',
    body: 'Elegís ejercicios de la biblioteca y definís series, carga e intensidad por bloque.',
  },
  {
    n: '03',
    title: 'Enviáselo',
    body: 'Le mandás el acceso por WhatsApp. Entra desde el celular y ya puede entrenar.',
  },
]

export default function ProfesoresGuidePage() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <header className="border-border/70 sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 sm:px-8">
          <MovaLogo className="h-6 w-auto" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/login">Iniciar sesión</Link>}
            />
            <Button size="sm" nativeButton={false} render={<Link href="/signup">Crear cuenta</Link>} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 sm:px-8">
        {/* Hero */}
        <section className="border-border/70 border-b py-14 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <span className="text-primary text-xs font-semibold tracking-widest uppercase">
                Guía rápida para profesores
              </span>
              <h1 className="mt-3 text-4xl leading-[1.05] font-semibold text-balance sm:text-5xl">
                De la planilla al plan, <span className="text-primary">en minutos.</span>
              </h1>
              <p className="text-muted-foreground mt-5 max-w-prose text-lg text-pretty">
                MOVA es el software donde armás el entrenamiento de cada alumno con ejercicios
                reales —video incluido— y él lo entrena desde el celular. Vos seguís decidiendo
                todo; MOVA hace el trabajo pesado.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  nativeButton={false}
                  render={
                    <Link href="/signup">
                      Crear mi cuenta
                      <ArrowRight />
                    </Link>
                  }
                />
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/biblioteca">Ver la biblioteca</Link>}
                />
              </div>
            </div>
            <p className="border-primary text-muted-foreground border-l-2 py-1 pl-4 text-sm text-pretty lg:mb-1">
              Hoy en producción: biblioteca con más de 1.360 ejercicios, editor de planes
              multideporte, formularios de evaluación, calendario, seguimiento con avisos y un
              asistente de IA que también arma borradores de plan.
            </p>
          </div>
        </section>

        {/* Pipeline */}
        <section className="border-border/70 border-b py-12 sm:py-16">
          <div className="max-w-prose">
            <span className="text-primary text-xs font-semibold tracking-widest uppercase">
              El recorrido de un plan
            </span>
            <h2 className="mt-2 text-2xl font-semibold text-balance sm:text-3xl">
              Seis pasos, un mismo tablero
            </h2>
            <p className="text-muted-foreground mt-3 text-pretty">
              Cargás al alumno una vez. Todo lo demás —semanas, sesiones, bloques y ejercicios— se
              arma sobre esa misma estructura, sin importar el deporte.
            </p>
          </div>

          <div className="mt-8 -mx-1 overflow-x-auto px-1">
            <div className="flex w-max items-center gap-2">
              {PIPELINE.map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div className="border-border bg-card flex w-32 flex-col items-center gap-1 rounded-lg border px-3 py-3.5 text-center">
                    <span className="text-muted-foreground font-mono text-[0.7rem]">
                      0{i + 1}
                    </span>
                    <span className="text-sm font-semibold">{step}</span>
                  </div>
                  {i < PIPELINE.length - 1 ? (
                    <ArrowRight className="text-muted-foreground/60 size-4 shrink-0" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo: armar una sesión arrastrando desde la biblioteca */}
        <section className="border-border/70 border-b py-12 sm:py-16">
          <div className="max-w-prose">
            <span className="text-primary text-xs font-semibold tracking-widest uppercase">
              Mirá cómo se arma
            </span>
            <h2 className="mt-2 text-2xl font-semibold text-balance sm:text-3xl">
              Armá una sesión arrastrando ejercicios desde la biblioteca
            </h2>
            <p className="text-muted-foreground mt-3 text-pretty">
              Buscás, agarrás el ejercicio y lo soltás en el día. Después le ponés series, carga y
              pausa. Así de rápido.
            </p>
          </div>
          <DragDemo className="mt-8" />
        </section>

        {/* Features */}
        <section className="border-border/70 border-b py-12 sm:py-16">
          <div className="max-w-prose">
            <span className="text-primary text-xs font-semibold tracking-widest uppercase">
              Qué incluye hoy
            </span>
            <h2 className="mt-2 text-2xl font-semibold text-balance sm:text-3xl">
              Todo lo que necesitás para armar y seguir un plan
            </h2>
            <p className="text-muted-foreground mt-3 text-pretty">
              Nueve piezas que ya están funcionando en MOVA — no es una promesa de roadmap.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body, stat }) => (
              <Card key={title} className="ring-foreground/10 gap-3 px-5">
                <Icon className="text-primary size-5" />
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm text-pretty">{body}</p>
                </div>
                <p className="border-border text-muted-foreground mt-auto border-t pt-3 font-mono text-xs">
                  {stat}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Student app preview */}
        <section className="border-border/70 border-b py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="border-foreground/15 bg-card mx-auto w-full max-w-[280px] rounded-[28px] border-[6px] p-4 shadow-sm">
              <div className="bg-muted mx-auto mb-3 h-1.5 w-12 rounded-full" />
              <p className="text-muted-foreground text-xs">Hola, Juan</p>
              <p className="text-muted-foreground/70 text-[0.7rem]">Vuelta 3 del ciclo · Semana 2</p>

              <div className="bg-primary/10 border-border mt-3 rounded-xl border p-3.5">
                <p className="text-primary text-lg font-bold tracking-tight">FUERZA A</p>
                <p className="text-muted-foreground text-xs">45 min · 8 ejercicios</p>
                <div className="bg-primary text-primary-foreground mt-2 inline-block rounded-md px-3 py-1 text-xs font-medium">
                  Comenzar
                </div>
              </div>

              <div className="border-border mt-3 overflow-hidden rounded-xl border">
                <div className="bg-muted flex h-16 items-center justify-center">
                  <PlayCircle className="text-muted-foreground/60 size-7" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold">Sentadilla libre</p>
                  <p className="text-muted-foreground text-[0.7rem]">
                    Dominancia de rodillas · 3 × 10
                  </p>
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
                    {[
                      ['Series', '3'],
                      ['Carga', '60'],
                      ['Reps', '10'],
                    ].map(([label, val]) => (
                      <div key={label} className="bg-muted rounded-md py-1.5">
                        <p className="text-muted-foreground text-[0.55rem] uppercase">{label}</p>
                        <p className="font-mono text-sm font-semibold">{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-border text-foreground mt-2.5 rounded-md border py-1.5 text-center text-xs font-medium">
                    Registrar
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {['Fácil', 'Moderado', 'Difícil'].map((f) => (
                  <div
                    key={f}
                    className={
                      f === 'Moderado'
                        ? 'border-primary text-primary bg-primary/10 rounded-md border py-1.5 text-center text-[0.65rem] font-semibold'
                        : 'border-border text-muted-foreground rounded-md border py-1.5 text-center text-[0.65rem]'
                    }
                  >
                    {f}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-primary text-xs font-semibold tracking-widest uppercase">
                La otra mitad de la app
              </span>
              <h2 className="mt-2 text-2xl font-semibold text-balance sm:text-3xl">
                Lo que ve tu alumno
              </h2>
              <p className="text-muted-foreground mt-3 text-pretty">
                Nada de menús ni configuración: abre el celular y le aparece el entrenamiento de
                hoy.
              </p>
              <ul className="mt-5 flex flex-col gap-3">
                {[
                  ['Mira el video', 'de cada ejercicio antes de hacerlo.'],
                  [
                    'Registra',
                    'series, carga y repeticiones en una sola fila, sin planillas aparte.',
                  ],
                  [
                    'Cuenta cómo le fue',
                    '—fácil, moderado o difícil— y ese dato te llega a vos.',
                  ],
                  [
                    'Repite el ciclo',
                    'automáticamente: MOVA sabe qué sesión sigue y lleva la cuenta de las vueltas.',
                  ],
                  ['Consulta su historial', 'en un calendario, con lo entrenado día por día.'],
                ].map(([strong, rest]) => (
                  <li key={strong} className="flex gap-2.5 text-sm">
                    <span className="text-primary mt-0.5 shrink-0">—</span>
                    <p className="text-muted-foreground">
                      <strong className="text-foreground font-semibold">{strong}</strong> {rest}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Multi-sport */}
        <section className="border-border/70 border-b py-12 sm:py-16">
          <div className="max-w-prose">
            <span className="text-primary text-xs font-semibold tracking-widest uppercase">
              Un motor, no una app de gimnasio
            </span>
            <h2 className="mt-2 text-2xl font-semibold text-balance sm:text-3xl">
              Sirve para el deporte que enseñes
            </h2>
            <p className="text-muted-foreground mt-3 text-pretty">
              La misma estructura de plan arma una rutina de fuerza, una pretemporada de fútbol o
              un mesociclo de 10K — sin pantallas especiales por disciplina.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {SPORTS.map((s) => (
              <Badge key={s} variant={s === 'General' ? 'default' : 'outline'} className="h-6 px-3 text-[0.8rem] font-medium">
                {s}
              </Badge>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="border-border/70 border-b py-12 sm:py-16">
          <div className="max-w-prose">
            <span className="text-primary text-xs font-semibold tracking-widest uppercase">
              Primer plan
            </span>
            <h2 className="mt-2 text-2xl font-semibold text-balance sm:text-3xl">
              Tres pasos para tu primer alumno
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step) => (
              <Card key={step.n} className="ring-foreground/10 px-5">
                <span className="text-primary/30 font-mono text-3xl font-bold">{step.n}</span>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm text-pretty">{step.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* AI guardrail */}
        <section className="py-12 sm:py-16">
          <div className="bg-muted/60 border-border flex gap-4 rounded-xl border p-6 sm:p-7">
            <ShieldCheck className="text-primary mt-0.5 size-6 shrink-0" />
            <p className="text-muted-foreground text-sm text-pretty sm:text-base">
              <strong className="text-foreground font-semibold">
                La decisión siempre es tuya.
              </strong>{' '}
              La IA busca, recomienda y analiza sobre ejercicios reales de tu biblioteca — nunca
              inventa un ejercicio, un video o una métrica, y nunca modifica un plan sin que lo
              apruebes.
            </p>
          </div>
        </section>

        {/* Closing */}
        <section className="flex flex-col items-center gap-5 py-16 text-center sm:py-24">
          <h2 className="max-w-lg text-3xl font-semibold text-balance sm:text-4xl">
            Tu vida en movimiento —<span className="text-primary">y la de tus alumnos.</span>
          </h2>
          <p className="text-muted-foreground max-w-md text-pretty">
            MOVA arma el plan con vos, no en tu lugar.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href="/signup">
                  Crear mi cuenta
                  <ArrowRight />
                </Link>
              }
            />
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={
                <Link href="/login">
                  <MessageCircle />
                  Ya tengo cuenta
                </Link>
              }
            />
          </div>
        </section>
      </main>

      <footer className="border-border/70 border-t py-6 text-center">
        <p className="text-muted-foreground text-xs">
          Guía preparada para profesores y entrenadores · MOVA
        </p>
      </footer>
    </div>
  )
}
