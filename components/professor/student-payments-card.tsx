'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { registerPayment } from '@/app/alumnos/[studentId]/actions'
import type { StudentPayment } from '@/lib/supabase/queries/students'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatAmount(amount: number) {
  return amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatDate(iso: string) {
  // Fecha pura (sin hora) — igual que el resto de la app, se muestra en
  // UTC para que no corra un día según el huso horario del navegador.
  return new Date(iso).toLocaleDateString('es-AR', { timeZone: 'UTC' })
}

export function StudentPaymentsCard({
  studentId,
  payments,
}: {
  studentId: string
  payments: StudentPayment[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    const value = Number.parseFloat(amount.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) {
      setError('El monto tiene que ser mayor a cero.')
      return
    }
    startTransition(async () => {
      const res = await registerPayment(studentId, value, paidAt, notes)
      if (res.error) {
        setError(res.error)
        return
      }
      setAmount('')
      setNotes('')
      setPaidAt(todayISO())
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">{error}</p> : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Fecha</span>
          <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="w-40" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Monto</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-32"
          />
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Nota (opcional)</span>
          <Input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. cuota septiembre"
          />
        </label>
        <Button size="sm" className="h-8" disabled={pending || !amount} onClick={submit}>
          <Plus data-icon="inline-start" />
          {pending ? 'Guardando…' : 'Registrar pago'}
        </Button>
      </div>

      {payments.length === 0 ? (
        <p className="text-muted-foreground text-xs">Todavía no registraste ningún pago.</p>
      ) : (
        <ul className="divide-border divide-y">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="text-muted-foreground w-24 shrink-0 text-xs">{formatDate(p.paidAt)}</span>
              <span className="font-medium">${formatAmount(p.amount)}</span>
              {p.notes ? <span className="text-muted-foreground truncate text-xs">{p.notes}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
