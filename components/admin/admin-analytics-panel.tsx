import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AdminAnalytics } from '@/lib/supabase/queries/admin'

const PLAN_TYPE_LABEL: Record<string, string> = {
  MUSCLE: 'Músculo',
  PATTERN: 'Patrón',
  MIXED: 'Mixto',
  SPORT_SPECIFIC: 'Específico de deporte',
  CUSTOM: 'Personalizado',
}

function StatCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <Card className="gap-0 py-5">
      <CardHeader className="gap-0 px-5">
        <CardTitle className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <span className="font-mono text-4xl leading-none font-medium tnum">{value}</span>
        <CardDescription className="mt-2.5 text-xs">{detail}</CardDescription>
      </CardContent>
    </Card>
  )
}

function BreakdownRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground w-40 shrink-0 truncate">{label}</span>
      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right font-mono tabular-nums">{count}</span>
    </div>
  )
}

function fmtHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

export function AdminAnalyticsPanel({ data }: { data: AdminAnalytics }) {
  const { professors, students, plans, sports, exercises, forms, sessions } = data
  const maxHour = Math.max(1, ...sessions.byHourAR)

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Métricas generales" className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Profesores" value={professors.total} detail={`${professors.active} activos · ${professors.pending} pendientes`} />
        <StatCard label="Alumnos" value={students.total} detail={`${students.managed} con profesor · ${students.individual} independientes`} />
        <StatCard label="Planes" value={plans.total} detail={`${plans.active} activos · ${plans.completed} completados`} />
        <StatCard label="Ejercicios en biblioteca" value={exercises.total} detail="Activos, disponibles para usar en planes" />
        <StatCard label="Formularios" value={forms.total} detail={`${forms.completedSubmissions} respuestas completadas`} />
        <StatCard label="Sesiones completadas" value={sessions.total} detail={`${sessions.last7d} en los últimos 7 días`} />
      </section>

      <Card className="gap-0 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-sm">Crecimiento</CardTitle>
          <CardDescription className="text-xs">Cuentas y planes nuevos, para ver la tracción del producto.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 px-5 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Profesores nuevos</p>
            <p className="text-sm">
              <span className="font-mono font-medium">+{professors.newLast7d}</span> últimos 7 días ·{' '}
              <span className="font-mono font-medium">+{professors.newLast30d}</span> últimos 30 días
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Alumnos nuevos</p>
            <p className="text-sm">
              <span className="font-mono font-medium">+{students.newLast7d}</span> últimos 7 días ·{' '}
              <span className="font-mono font-medium">+{students.newLast30d}</span> últimos 30 días
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Planes nuevos</p>
            <p className="text-sm">
              <span className="font-mono font-medium">+{plans.newLast7d}</span> últimos 7 días ·{' '}
              <span className="font-mono font-medium">+{plans.newLast30d}</span> últimos 30 días
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">Planes por tipo</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            {plans.byType.length === 0 ? (
              <p className="text-muted-foreground text-sm">Todavía no hay planes.</p>
            ) : (
              plans.byType.map((t) => (
                <BreakdownRow
                  key={t.type}
                  label={PLAN_TYPE_LABEL[t.type] ?? t.type}
                  count={t.count}
                  total={plans.total}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-sm">Deportes más entrenados</CardTitle>
            <CardDescription className="text-xs">
              Por cantidad de planes · {sports.totalActive} deportes activos en el catálogo
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            {sports.topByPlans.length === 0 ? (
              <p className="text-muted-foreground text-sm">Ningún plan tiene un deporte asignado todavía.</p>
            ) : (
              sports.topByPlans.map((s) => (
                <BreakdownRow key={s.name} label={s.name} count={s.count} total={plans.total} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-sm">Horas de mayor tráfico</CardTitle>
          <CardDescription className="text-xs">
            Sesiones completadas por hora del día (huso de Argentina)
            {sessions.peakHourAR != null ? ` — pico a las ${fmtHour(sessions.peakHourAR)}` : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          {sessions.total === 0 ? (
            <p className="text-muted-foreground text-sm">Todavía no hay sesiones registradas.</p>
          ) : (
            <div className="flex h-32 items-end gap-1">
              {sessions.byHourAR.map((count, h) => (
                <div key={h} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-sm ${h === sessions.peakHourAR ? 'bg-primary' : 'bg-primary/25'}`}
                    style={{ height: `${Math.max(2, (count / maxHour) * 100)}%` }}
                    title={`${fmtHour(h)}: ${count} sesión${count === 1 ? '' : 'es'}`}
                  />
                  {h % 3 === 0 ? (
                    <span className="text-muted-foreground text-[9px]">{h}</span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
