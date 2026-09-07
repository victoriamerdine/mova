'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getRenewalBadge } from '@/lib/plan-renewal'
import type { ProfessorPlan } from '@/lib/supabase/queries/plans'

const PLAN_TYPE_LABEL: Record<ProfessorPlan['planType'], string> = {
  MUSCLE: 'Músculo',
  PATTERN: 'Patrones',
  MIXED: 'Mixto',
  SPORT_SPECIFIC: 'Específico de deporte',
  CUSTOM: 'Personalizado',
}

const STATUS_LABEL: Record<ProfessorPlan['status'], string> = {
  draft: 'Borrador',
  active: 'Activo',
  completed: 'Completado',
  archived: 'Archivado',
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function PlansList({ plans }: { plans: ProfessorPlan[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = normalize(query.trim())
    if (!needle) return plans
    return plans.filter(
      (plan) =>
        normalize(plan.name).includes(needle) || normalize(plan.studentName).includes(needle),
    )
  }, [query, plans])

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <CardTitle className="text-sm">Todos los planes</CardTitle>
          <CardDescription className="text-xs">
            {query.trim() ? `${filtered.length} de ${plans.length}` : `${plans.length} plan${plans.length === 1 ? '' : 'es'}`}
          </CardDescription>
        </div>
        <div className="relative w-full max-w-64 sm:w-64">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por plan o alumno…"
            className="h-8 pl-8"
            aria-label="Buscar planes"
          />
        </div>
      </CardHeader>

      <CardContent className="px-0 py-0">
        {plans.length === 0 ? (
          <div className="text-muted-foreground px-5 py-12 text-center text-sm">
            Todavía no armaste ningún plan. Entrá a un alumno y creá el primero.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground px-5 py-12 text-center text-sm">
            Ningún plan coincide con “{query.trim()}”.
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {filtered.map((plan) => {
              const badge = getRenewalBadge(plan.startDate, plan.endDate)
              return (
                <li key={plan.id}>
                  <Link
                    href={`/planes/${plan.id}`}
                    className="hover:bg-muted/50 flex items-center gap-3 px-5 py-3.5 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{plan.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {plan.studentName} · {PLAN_TYPE_LABEL[plan.planType]} ·{' '}
                        {STATUS_LABEL[plan.status]}
                      </p>
                    </div>
                    {badge ? (
                      <Badge
                        className={
                          badge.tone === 'critical'
                            ? 'bg-destructive/10 text-destructive border-transparent'
                            : 'bg-warning/15 text-warning-foreground border-transparent'
                        }
                      >
                        {badge.label}
                      </Badge>
                    ) : null}
                    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
